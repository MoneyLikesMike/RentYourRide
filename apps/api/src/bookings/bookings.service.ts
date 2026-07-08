import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity, BookingStatus } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { MessagingService } from '../messaging/messaging.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function statusLabel(status: BookingStatus): string | null {
  switch (status) {
    case 'checkin_pending':
      return 'Check-in started.';
    case 'active':
      return 'Trip is now in progress.';
    case 'checkout_pending':
      return 'Check-out started.';
    case 'completed':
      return 'Trip completed. Please leave a review.';
    default:
      return null;
  }
}

export function getTripBillingDays(startMs: number, endMs: number): number {
  const a = new Date(startMs);
  const b = new Date(endMs);
  const t1 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const t2 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const daySpan = Math.abs(t2 - t1) / MS_PER_DAY;
  return Math.max(1, Math.floor(daySpan) + 1);
}

function parsePercent(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const numeric = Number(value.replace('%', '').trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

export interface QuoteInput {
  listingId: string;
  bookingDates: { start?: number; end?: number; startTime?: string; endTime?: string };
  extraUnlimitedKm?: boolean;
  extraPrepaidFuel?: boolean;
  extraPrepaidClean?: boolean;
  deliveryEnabled?: boolean;
}

@Injectable()
export class BookingsService {
  private stripe: Stripe | null;

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingsRepo: Repository<BookingEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingsRepo: Repository<ListingEntity>,
    private readonly config: ConfigService,
    private readonly messaging: MessagingService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  quote(listing: ListingEntity, input: QuoteInput) {
    const start = input.bookingDates?.start;
    const end = input.bookingDates?.end;
    if (start == null || end == null) {
      throw new BadRequestException('bookingDates.start and end required');
    }
    const pricePerDay = Number(listing.pricePerDay) || 40;
    const deliveryFee = Number(listing.deliveryPrice ?? 0) || 0;
    const kmRaw = listing.dailyKm || '200 km/day';
    const kmPerDayNumber =
      Number(String(kmRaw).replace(/[^\d]/g, '')) || 200;

    const tripDays = getTripBillingDays(start, end);
    const weeklyDiscountPct = parsePercent(listing.weeklyDiscount);
    const monthlyDiscountPct = parsePercent(listing.monthlyDiscount);
    const baseTripSubtotal = pricePerDay * tripDays;
    const appliesMonthlyDiscount = tripDays >= 30 && monthlyDiscountPct > 0;
    const appliesWeeklyDiscount =
      tripDays >= 7 && weeklyDiscountPct > 0 && !appliesMonthlyDiscount;
    const discountMultiplier = appliesMonthlyDiscount
      ? 1 - monthlyDiscountPct / 100
      : appliesWeeklyDiscount
        ? 1 - weeklyDiscountPct / 100
        : 1;
    const discountedTripSubtotal = Math.max(0, baseTripSubtotal * discountMultiplier);
    const tripDiscountSavings = Math.max(0, baseTripSubtotal - discountedTripSubtotal);

    const unlimitedKmFee = input.extraUnlimitedKm ? 150 : 0;
    const prepaidFuelFee = input.extraPrepaidFuel ? 80 : 0;
    const prepaidCleanFee = input.extraPrepaidClean ? 50 : 0;
    const canDeliver = deliveryFee > 0;
    const selectedDeliveryFee =
      input.deliveryEnabled && canDeliver ? deliveryFee : 0;
    const extrasSubtotal =
      unlimitedKmFee + prepaidFuelFee + prepaidCleanFee + selectedDeliveryFee;
    const subtotal = discountedTripSubtotal + extrasSubtotal;
    const tripFee = discountedTripSubtotal * 0.1;
    const grandTotal = subtotal + tripFee;

    const selectedExtras = [
      input.extraPrepaidClean
        ? { key: 'clean', label: 'Pre paid clean', amount: prepaidCleanFee }
        : null,
      input.extraUnlimitedKm
        ? { key: 'kms', label: 'Unlimited kms', amount: unlimitedKmFee }
        : null,
      input.extraPrepaidFuel
        ? { key: 'fuel', label: 'Pre paid fuel', amount: prepaidFuelFee }
        : null,
      selectedDeliveryFee > 0
        ? {
            key: 'delivery',
            label: 'Delivery',
            amount: selectedDeliveryFee,
          }
        : null,
    ].filter(Boolean);

    return {
      tripDays,
      pricePerDay,
      baseTripSubtotal,
      discountedTripSubtotal,
      tripDiscountSavings,
      appliesWeeklyDiscount,
      appliesMonthlyDiscount,
      weeklyDiscountPct,
      monthlyDiscountPct,
      unlimitedKmFee,
      prepaidFuelFee,
      prepaidCleanFee,
      selectedDeliveryFee,
      subtotal,
      tripFee,
      grandTotal,
      kmIncludedLabel: input.extraUnlimitedKm
        ? 'Unlimited kms'
        : `${kmPerDayNumber * tripDays} km`,
      selectedExtras,
      canDeliver,
    };
  }

  async createBooking(guestId: string, body: Record<string, unknown>, idempotencyKey?: string) {
    const snap = body.listingSnapshot as Record<string, unknown> | undefined;
    const listingId =
      (body.listingId as string) ||
      (snap?.id != null ? String(snap.id) : '');
    if (!listingId) {
      throw new BadRequestException('listingId required');
    }
    const listing = await this.listingsRepo.findOne({
      where: { id: listingId },
      relations: ['host'],
    });
    if (!listing?.published || !listing.active) {
      throw new NotFoundException('Listing not available');
    }
    if (listing.hostUserId === guestId) {
      throw new BadRequestException('Cannot book your own listing');
    }

    if (idempotencyKey?.trim()) {
      const existing = await this.bookingsRepo.findOne({
        where: { idempotencyKey: idempotencyKey.trim() },
      });
      if (existing) return existing.toMobileDto();
    }

    const instantBooking = Boolean(
      body.instantBooking !== undefined
        ? body.instantBooking
        : listing.instantBooking,
    );
    let status: BookingStatus = instantBooking ? 'confirmed' : 'pending_host';

    const pricing = body.pricing as Record<string, unknown>;
    const bookingDates = body.bookingDates as Record<string, unknown>;

    const grandTotal = Number(pricing?.grandTotal ?? 0);

    let stripePaymentIntentId: string | null = null;
    const providedPiId =
      typeof body.stripePaymentIntentId === 'string'
        ? body.stripePaymentIntentId.trim()
        : '';
    if (providedPiId && this.stripe) {
      stripePaymentIntentId = await this.assertSucceededPaymentIntent(
        providedPiId,
        guestId,
        grandTotal,
      );
    }

    const row = this.bookingsRepo.create({
      guestUserId: guestId,
      hostUserId: listing.hostUserId,
      listingId: listing.id,
      status,
      idempotencyKey: idempotencyKey?.trim() || null,
      stripePaymentIntentId,
      instantBooking,
      listingSnapshot: body.listingSnapshot ?? listing.toDetailDto(listing.host),
      bookingDates,
      pickupAddress: (body.pickupAddress as string) || listing.pickupAddress,
      dropoffAddress: (body.dropoffAddress as string) || null,
      deliveryEnabled: Boolean(body.deliveryEnabled),
      extras: (body.extras as unknown[]) ?? [],
      introMessage: (body.introMessage as string) ?? '',
      pricing,
      selectedPaymentMethod: (body.selectedPaymentMethod as Record<string, unknown>) ?? null,
      lifecycle: {},
    });

    await this.bookingsRepo.save(row);
    // Seed a conversation for this booking (intro message + system message).
    // This is idempotent — the messaging service will find an existing conversation.
    try {
      await this.messaging.findOrCreateForBooking(guestId, row.id);
    } catch {
      // Never fail the booking on messaging setup issues.
    }
    return row.toMobileDto();
  }

  async listForUser(userId: string, role: 'guest' | 'host', status?: string) {
    const qb = this.bookingsRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.guest', 'guest')
      .leftJoinAndSelect('b.host', 'host')
      .leftJoinAndSelect('b.listing', 'listing');

    if (role === 'guest') {
      qb.where('b.guest_user_id = :userId', { userId });
    } else {
      qb.where('b.host_user_id = :userId', { userId });
    }

    if (status?.trim()) {
      qb.andWhere('b.status = :status', { status: status.trim() });
    }

    qb.orderBy('b.created_at', 'DESC');
    const rows = await qb.getMany();
    return rows.map((r) => r.toMobileDto());
  }

  async getOne(userId: string, id: string) {
    const b = await this.bookingsRepo.findOne({
      where: { id },
      relations: ['guest', 'host', 'listing'],
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.guestUserId !== userId && b.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    return b.toMobileDto();
  }

  async cancel(userId: string, id: string) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.guestUserId !== userId && b.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    if (['completed', 'cancelled', 'declined'].includes(b.status)) {
      throw new BadRequestException('Cannot cancel');
    }
    b.status = 'cancelled';
    await this.bookingsRepo.save(b);
    const cancelledBy = b.guestUserId === userId ? 'guest' : 'host';
    await this.messaging.postBookingSystemMessage(
      b.id,
      cancelledBy === 'guest'
        ? 'Trip was cancelled by the guest.'
        : 'Trip was cancelled by the host.',
      { event: 'cancelled', by: cancelledBy },
    );
    return b.toMobileDto();
  }

  async acceptHost(userId: string, id: string) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.hostUserId !== userId) throw new ForbiddenException();
    if (b.status !== 'pending_host') {
      throw new BadRequestException('Invalid status');
    }
    b.status = 'confirmed';
    b.lifecycle = { ...(b.lifecycle ?? {}), acceptedAt: Date.now() };
    await this.bookingsRepo.save(b);
    await this.messaging.postBookingSystemMessage(
      b.id,
      'Trip approved by the host. Coordinate pickup details below.',
      { event: 'accepted' },
    );
    return b.toMobileDto();
  }

  async declineHost(userId: string, id: string) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.hostUserId !== userId) throw new ForbiddenException();
    if (b.status !== 'pending_host') {
      throw new BadRequestException('Invalid status');
    }
    b.status = 'declined';
    await this.bookingsRepo.save(b);
    await this.messaging.postBookingSystemMessage(
      b.id,
      'The host declined this trip request.',
      { event: 'declined' },
    );
    return b.toMobileDto();
  }

  async patchLifecycle(userId: string, id: string, patch: Record<string, unknown>) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.guestUserId !== userId && b.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    b.lifecycle = { ...(b.lifecycle ?? {}), ...patch };
    await this.bookingsRepo.save(b);
    return b.toMobileDto();
  }

  async transitionStatus(
    userId: string,
    id: string,
    next: BookingStatus,
    allowedFrom: BookingStatus[],
  ) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.guestUserId !== userId && b.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    if (!allowedFrom.includes(b.status)) {
      throw new BadRequestException('Invalid transition');
    }
    b.status = next;
    await this.bookingsRepo.save(b);
    const label = statusLabel(next);
    if (label) {
      await this.messaging.postBookingSystemMessage(b.id, label, {
        event: 'status',
        status: next,
      });
    }
    return b.toMobileDto();
  }

  async signAgreement(userId: string, id: string, payload: { role: string; signature?: string }) {
    return this.patchLifecycle(userId, id, {
      agreementSignedAt: Date.now(),
      agreementSignerRole: payload.role,
      agreementSignature: payload.signature ?? '',
    });
  }

  async addConditionPhotos(userId: string, id: string, phase: string, uris: string[]) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.guestUserId !== userId && b.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    const key = phase === 'post' ? 'conditionPhotosPost' : 'conditionPhotosPre';
    const prev = (b.lifecycle?.[key] as string[]) ?? [];
    b.lifecycle = { ...(b.lifecycle ?? {}), [key]: [...prev, ...uris] };
    await this.bookingsRepo.save(b);
    return b.toMobileDto();
  }

  async submitReview(
    userId: string,
    id: string,
    body: { rating: number; text?: string; role: 'guest' | 'host' },
  ) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (body.role === 'guest' && b.guestUserId !== userId) {
      throw new ForbiddenException();
    }
    if (body.role === 'host' && b.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    const rk =
      body.role === 'guest' ? 'guestReviewSubmittedAt' : 'hostReviewSubmittedAt';
    b.lifecycle = {
      ...(b.lifecycle ?? {}),
      [rk]: Date.now(),
      [`${body.role}Review`]: { rating: body.rating, text: body.text ?? '' },
    };
    await this.bookingsRepo.save(b);
    return b.toMobileDto();
  }

  private async assertSucceededPaymentIntent(
    paymentIntentId: string,
    guestId: string,
    grandTotal: number,
  ): Promise<string> {
    if (!this.stripe) {
      throw new BadRequestException('Payments not configured');
    }
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded') {
      throw new BadRequestException('Payment not completed');
    }
    const expected = Math.round(grandTotal * 100);
    if (pi.amount !== expected) {
      throw new BadRequestException('Payment amount mismatch');
    }
    if (pi.metadata?.guestId && pi.metadata.guestId !== guestId) {
      throw new BadRequestException('Invalid payment');
    }
    return pi.id;
  }
}
