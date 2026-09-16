import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BookingEntity, BookingStatus } from '../entities/booking.entity';
import { BookingExtensionEntity } from '../entities/booking-extension.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { assertIdentityVerified } from '../common/user-verification';
import {
  formatRentalStripeDescription,
  formatRentalStripeDescriptionFromBooking,
} from './booking-stripe-description';
import {
  DATE_BLOCKING_BOOKING_STATUSES,
  bookingDatesToDayRange,
  dayRangesOverlap,
  manualAvailabilityToDayRanges,
  toDayRangeMs,
} from './booking-date-ranges';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
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
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingsRepo: Repository<BookingEntity>,
    @InjectRepository(BookingExtensionEntity)
    private readonly extensionsRepo: Repository<BookingExtensionEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingsRepo: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly messaging: MessagingService,
    private readonly notifications: NotificationsService,
    private readonly payments: PaymentsService,
  ) {}

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
    // Platform keeps tripFee; host earns trip + extras (legacy receiveTotal parity).
    const hostReceiveTotal = Math.max(0, Number(subtotal.toFixed(2)));

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
      hostReceiveTotal,
      kmIncludedLabel: input.extraUnlimitedKm
        ? 'Unlimited kms'
        : `${kmPerDayNumber * tripDays} km`,
      selectedExtras,
      canDeliver,
    };
  }

  private dollarsToCents(dollars: number): number {
    return Math.round(Number(dollars) * 100);
  }

  private paymentMethodIdFromBooking(b: BookingEntity): string | null {
    const pm = b.selectedPaymentMethod as { id?: string } | null;
    const id = pm?.id;
    if (typeof id === 'string' && id.startsWith('pm_')) return id;
    return null;
  }

  private hostReceiveCents(b: BookingEntity): number {
    const p = (b.pricing || {}) as Record<string, unknown>;
    const hostReceive = Number(p.hostReceiveTotal ?? p.subtotal ?? 0);
    return this.dollarsToCents(hostReceive);
  }

  private guestPayCents(b: BookingEntity): number {
    const p = (b.pricing || {}) as Record<string, unknown>;
    return this.dollarsToCents(Number(p.grandTotal ?? 0));
  }

  async createBooking(guestId: string, body: Record<string, unknown>, idempotencyKey?: string) {
    const guest = await this.usersRepo.findOne({ where: { id: guestId } });
    if (!guest) throw new NotFoundException('User not found');
    assertIdentityVerified(guest);

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

    const key = idempotencyKey?.trim() || null;
    const bookingDates = body.bookingDates as Record<string, unknown>;
    const startMs = Number(bookingDates?.start);
    const endMs = Number(bookingDates?.end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      throw new BadRequestException('bookingDates.start and end required');
    }

    // Serialize all create attempts for this listing so overlapping trips
    // cannot charge twice under a race.
    const tripLockKey = `book:listing:${listing.id}`;

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [
        tripLockKey,
      ]);

      if (key) {
        const existingByKey = await manager.findOne(BookingEntity, {
          where: { idempotencyKey: key },
        });
        if (existingByKey) return existingByKey.toMobileDto();
      }

      const requestedRange = toDayRangeMs(startMs, endMs);
      if (!requestedRange) {
        throw new BadRequestException('Invalid booking date range');
      }
      if (requestedRange.end < requestedRange.start) {
        throw new BadRequestException('End date must be on or after start date');
      }

      const openRows = await manager.find(BookingEntity, {
        where: {
          listingId: listing.id,
          status: In(DATE_BLOCKING_BOOKING_STATUSES),
        },
      });

      // Same guest + exact dates → return existing booking (idempotent retry).
      const exactDuplicate = openRows.find(
        (row) =>
          row.guestUserId === guestId &&
          Number(row.bookingDates?.start) === startMs &&
          Number(row.bookingDates?.end) === endMs,
      );
      if (exactDuplicate) return exactDuplicate.toMobileDto();

      const bookingConflict = openRows.find((row) => {
        const existing = bookingDatesToDayRange(
          row.bookingDates as Record<string, unknown>,
        );
        return existing ? dayRangesOverlap(existing, requestedRange) : false;
      });
      if (bookingConflict) {
        throw new ConflictException(
          'Those dates are no longer available for this vehicle',
        );
      }

      const hostBlocks = manualAvailabilityToDayRanges(listing.availability);
      if (hostBlocks.some((block) => dayRangesOverlap(block, requestedRange))) {
        throw new ConflictException(
          'Those dates are blocked by the host for this vehicle',
        );
      }

      const instantBooking = Boolean(
        body.instantBooking !== undefined
          ? body.instantBooking
          : listing.instantBooking,
      );
      const status: BookingStatus = instantBooking ? 'confirmed' : 'pending_host';

      const pricingIn = (body.pricing as Record<string, unknown>) || {};
      const extras = (body.extras as { key?: string }[] | undefined) || [];
      const serverQuote = this.quote(listing, {
        listingId: listing.id,
        bookingDates: bookingDates as QuoteInput['bookingDates'],
        extraUnlimitedKm:
          extras.some((e) => e?.key === 'kms') || Number(pricingIn.unlimitedKmFee) > 0,
        extraPrepaidFuel:
          extras.some((e) => e?.key === 'fuel') || Number(pricingIn.prepaidFuelFee) > 0,
        extraPrepaidClean:
          extras.some((e) => e?.key === 'clean') || Number(pricingIn.prepaidCleanFee) > 0,
        deliveryEnabled: Boolean(body.deliveryEnabled),
      });
      const pricing = {
        ...pricingIn,
        ...serverQuote,
        hostReceiveTotal: serverQuote.hostReceiveTotal,
        grandTotal: serverQuote.grandTotal,
        tripFee: serverQuote.tripFee,
        subtotal: serverQuote.subtotal,
      };
      const grandTotal = Number(pricing.grandTotal ?? 0);
      const fullAmountCents = this.dollarsToCents(grandTotal);
      const selectedPaymentMethod =
        (body.selectedPaymentMethod as Record<string, unknown>) ?? null;
      const paymentMethodId =
        typeof selectedPaymentMethod?.id === 'string'
          ? String(selectedPaymentMethod.id)
          : '';

      const rentalDescription = formatRentalStripeDescription({
        host: listing.host,
        listing,
        bookingDates: bookingDates as { start?: number; end?: number },
      });

      let stripePaymentIntentId: string | null = null;
      let lifecycle: Record<string, unknown> = {};
      const providedPiId =
        typeof body.stripePaymentIntentId === 'string'
          ? body.stripePaymentIntentId.trim()
          : '';

      if (providedPiId) {
        // Apple Pay / client-confirmed PI (full amount already captured).
        stripePaymentIntentId = await this.assertSucceededPaymentIntent(
          providedPiId,
          guestId,
          grandTotal,
        );
        await this.payments.updatePaymentIntentDescription(
          stripePaymentIntentId,
          rentalDescription,
        );
        const pi = await this.payments.retrievePaymentIntent(stripePaymentIntentId);
        const chargeId =
          typeof pi.latest_charge === 'string'
            ? pi.latest_charge
            : pi.latest_charge?.id ?? null;
        lifecycle = {
          stripeChargeId: chargeId,
          paymentCapturedAt: Date.now(),
          paymentFunding: 'client_pi',
        };
      } else if (this.payments.isConfigured()) {
        if (!paymentMethodId.startsWith('pm_')) {
          throw new BadRequestException('A valid card payment method is required');
        }
        const preauth = await this.payments.createBookingPreauth({
          guestUserId: guestId,
          paymentMethodId,
          fullAmountCents,
          description: rentalDescription,
          metadata: { listingId: listing.id },
        });
        stripePaymentIntentId = preauth.paymentIntentId;
        lifecycle = {
          stripeChargeId: preauth.chargeId,
          paymentFunding: preauth.funding,
          preauthAmountCents: preauth.amountCents,
        };

        if (instantBooking) {
          const captured = await this.payments.captureOrChargeBooking({
            paymentIntentId: preauth.paymentIntentId,
            fullAmountCents,
            description: rentalDescription,
            paymentMethodId,
          });
          stripePaymentIntentId = captured.paymentIntentId;
          lifecycle = {
            ...lifecycle,
            stripeChargeId: captured.chargeId,
            paymentCapturedAt: Date.now(),
          };
        }
      } else {
        throw new BadRequestException('Payments are not configured on this server');
      }

      const row = manager.create(BookingEntity, {
        guestUserId: guestId,
        hostUserId: listing.hostUserId,
        listingId: listing.id,
        status,
        idempotencyKey: key,
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
        selectedPaymentMethod,
        lifecycle,
      });

      await manager.save(row);

      // Seed a conversation for this booking (intro message + system message).
      // This is idempotent — the messaging service will find an existing conversation.
      try {
        await this.messaging.findOrCreateForBooking(guestId, row.id);
      } catch {
        // Never fail the booking on messaging setup issues.
      }
      if (status === 'confirmed') {
        this.notifications.bookingApproved(row.id);
      } else {
        this.notifications.bookingCreated(row.id);
      }
      return row.toMobileDto();
    });
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
    if (b.stripePaymentIntentId && !(b.lifecycle as { hostTransferId?: string })?.hostTransferId) {
      await this.payments.refundBookingPayment(
        b.stripePaymentIntentId,
        'RentYourRide trip cancelled',
      );
    }
    b.status = 'cancelled';
    b.lifecycle = { ...(b.lifecycle ?? {}), paymentRefundedAt: Date.now() };
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
    const b = await this.bookingsRepo.findOne({
      where: { id },
      relations: ['listing', 'host'],
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.hostUserId !== userId) throw new ForbiddenException();
    if (b.status !== 'pending_host') {
      throw new BadRequestException('Invalid status');
    }

    if (b.stripePaymentIntentId && this.payments.isConfigured()) {
      const captured = await this.payments.captureOrChargeBooking({
        paymentIntentId: b.stripePaymentIntentId,
        fullAmountCents: this.guestPayCents(b),
        description: formatRentalStripeDescriptionFromBooking(b, b.host),
        paymentMethodId: this.paymentMethodIdFromBooking(b),
      });
      b.stripePaymentIntentId = captured.paymentIntentId;
      b.lifecycle = {
        ...(b.lifecycle ?? {}),
        stripeChargeId: captured.chargeId,
        paymentCapturedAt: Date.now(),
        paymentFunding: captured.funding,
      };
    }

    b.status = 'confirmed';
    b.lifecycle = { ...(b.lifecycle ?? {}), acceptedAt: Date.now() };
    await this.bookingsRepo.save(b);
    await this.messaging.postBookingSystemMessage(
      b.id,
      'Trip approved by the host. Coordinate pickup details below.',
      { event: 'accepted' },
    );
    this.notifications.bookingApproved(b.id);
    return b.toMobileDto();
  }

  async declineHost(userId: string, id: string) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.hostUserId !== userId) throw new ForbiddenException();
    if (b.status !== 'pending_host') {
      throw new BadRequestException('Invalid status');
    }
    if (b.stripePaymentIntentId) {
      await this.payments.refundBookingPayment(
        b.stripePaymentIntentId,
        'RentYourRide trip declined by host',
      );
    }
    b.status = 'declined';
    b.lifecycle = { ...(b.lifecycle ?? {}), paymentRefundedAt: Date.now() };
    await this.bookingsRepo.save(b);
    await this.messaging.postBookingSystemMessage(
      b.id,
      'The host declined this trip request.',
      { event: 'declined' },
    );
    this.notifications.bookingDenied(b.id);
    return b.toMobileDto();
  }

  async patchLifecycle(userId: string, id: string, patch: Record<string, unknown>) {
    const b = await this.bookingsRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.guestUserId !== userId && b.hostUserId !== userId) {
      throw new ForbiddenException();
    }
    const before = (b.lifecycle ?? {}) as Record<string, unknown>;
    const justCheckedIn = before.guestCheckedInAt == null && patch.guestCheckedInAt != null;
    const justCheckedOut = before.guestCheckedOutAt == null && patch.guestCheckedOutAt != null;
    b.lifecycle = { ...before, ...patch };
    await this.bookingsRepo.save(b);
    // Check-in/out emails follow the guest finishing their own flow, not the
    // status change that waits on the host.
    if (justCheckedIn) this.notifications.bookingCheckedIn(b.id);
    if (justCheckedOut) this.notifications.bookingCheckedOut(b.id);
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
    const prev = b.status;
    b.status = next;
    await this.bookingsRepo.save(b);
    const label = statusLabel(next);
    if (label) {
      await this.messaging.postBookingSystemMessage(b.id, label, {
        event: 'status',
        status: next,
      });
    }
    if (next === 'active' && prev === 'checkin_pending') {
      await this.transferHostPayoutIfNeeded(b);
    }
    if (next === 'completed' && prev === 'checkout_pending') {
      this.notifications.reviewReminder(b.id);
    }
    return b.toMobileDto();
  }

  /** Legacy: Connect transfer when both parties finish check-in (status → active). */
  private async transferHostPayoutIfNeeded(b: BookingEntity): Promise<void> {
    const life = (b.lifecycle ?? {}) as {
      hostTransferId?: string;
      stripeChargeId?: string;
    };
    if (life.hostTransferId) return;
    if (!this.payments.isConfigured()) return;

    const host = await this.usersRepo.findOne({ where: { id: b.hostUserId } });
    const connectId = host?.stripeConnectAccountId?.trim();
    const chargeId = life.stripeChargeId?.trim();
    const amountCents = this.hostReceiveCents(b);
    if (!connectId || !chargeId || amountCents < 1) {
      return;
    }
    try {
      const transfer = await this.payments.transferToHost({
        amountCents,
        connectAccountId: connectId,
        sourceChargeId: chargeId,
        description: `RentYourRide host payout · booking ${b.id}`,
      });
      if (transfer) {
        b.lifecycle = {
          ...(b.lifecycle ?? {}),
          hostTransferId: transfer.id,
          hostTransferredAt: Date.now(),
          hostTransferAmountCents: amountCents,
        };
        await this.bookingsRepo.save(b);
      }
    } catch {
      // Match legacy fire-and-forget: don't block check-in if transfer fails.
    }
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
    if (body.role === 'guest') {
      this.notifications.reviewByGuest(b.id);
    } else {
      this.notifications.reviewByHost(b.id);
    }
    return b.toMobileDto();
  }

  private async assertSucceededPaymentIntent(
    paymentIntentId: string,
    guestId: string,
    grandTotal: number,
  ): Promise<string> {
    if (!this.payments.isConfigured()) {
      throw new BadRequestException('Payments not configured');
    }
    const pi = await this.payments.retrievePaymentIntent(paymentIntentId);
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

  private extensionEligibleStatuses: BookingStatus[] = [
    'active',
    'extended',
    'extension_declined',
  ];

  private bookingEndMs(booking: BookingEntity): number {
    const dates = booking.bookingDates as { end?: number };
    return Number(dates.end ?? 0);
  }

  private setBookingEnd(booking: BookingEntity, endMs: number) {
    booking.bookingDates = { ...(booking.bookingDates ?? {}), end: endMs };
  }

  async quoteExtension(guestId: string, bookingId: string, newEndMs: number) {
    const booking = await this.requireBookingForExtension(guestId, bookingId, newEndMs);
    const listing = await this.listingsRepo.findOne({ where: { id: booking.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    const currentEnd = this.bookingEndMs(booking);
    const quote = this.quote(listing, {
      listingId: listing.id,
      bookingDates: { start: currentEnd, end: newEndMs },
      deliveryEnabled: false,
    });
    return { ...quote, currentEndMs: currentEnd, newEndMs };
  }

  async requestExtension(
    guestId: string,
    bookingId: string,
    body: { newEndMs: number; stripePaymentIntentId?: string; guestMessage?: string },
  ) {
    const newEndMs = Number(body.newEndMs);
    const booking = await this.requireBookingForExtension(guestId, bookingId, newEndMs);
    const pending = await this.extensionsRepo.findOne({
      where: { bookingId, status: 'pending' },
    });
    if (pending) {
      throw new BadRequestException('An extension request is already pending');
    }

    const listing = await this.listingsRepo.findOne({ where: { id: booking.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    const currentEnd = this.bookingEndMs(booking);
    const quote = this.quote(listing, {
      listingId: listing.id,
      bookingDates: { start: currentEnd, end: newEndMs },
      deliveryEnabled: false,
    });

    let stripePaymentIntentId: string | null = null;
    const piId = body.stripePaymentIntentId?.trim();
    if (piId && this.payments.isConfigured()) {
      stripePaymentIntentId = await this.assertSucceededPaymentIntent(
        piId,
        guestId,
        Number(quote.grandTotal),
      );
    } else if (quote.grandTotal > 0) {
      throw new BadRequestException('Payment required for extension');
    }

    const ext = this.extensionsRepo.create({
      bookingId: booking.id,
      previousEndMs: String(currentEnd),
      newEndMs: String(newEndMs),
      status: 'pending',
      pricing: {
        ...quote,
        hostReceiveTotal: quote.subtotal,
      },
      stripePaymentIntentId,
      guestMessage: body.guestMessage?.trim() || null,
    });
    const savedExt = await this.extensionsRepo.save(ext);

    booking.status = 'extension_pending';
    this.setBookingEnd(booking, newEndMs);
    await this.bookingsRepo.save(booking);

    await this.messaging.postBookingSystemMessage(
      booking.id,
      'Guest requested a trip extension. Host approval is required.',
      { event: 'extension_requested', extensionId: savedExt.id },
    );
    this.notifications.extensionCreated(savedExt.id);
    return booking.toMobileDto();
  }

  async respondExtension(hostId: string, bookingId: string, approved: boolean) {
    const booking = await this.bookingsRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.hostUserId !== hostId) throw new ForbiddenException();
    if (booking.status !== 'extension_pending') {
      throw new BadRequestException('No pending extension');
    }

    const ext = await this.extensionsRepo.findOne({
      where: { bookingId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    if (!ext) throw new NotFoundException('Extension not found');

    if (approved) {
      ext.status = 'approved';
      booking.status = 'extended';
      const pricing = booking.pricing as Record<string, unknown>;
      const prevGrand = Number(pricing.grandTotal ?? 0);
      const extGrand = Number((ext.pricing as Record<string, unknown>).grandTotal ?? 0);
      booking.pricing = {
        ...pricing,
        grandTotal: prevGrand + extGrand,
        extensionTotal: extGrand,
      };
      await this.extensionsRepo.save(ext);
      await this.bookingsRepo.save(booking);
      await this.messaging.postBookingSystemMessage(
        booking.id,
        'Host approved the trip extension.',
        { event: 'extension_approved', extensionId: ext.id },
      );
      this.notifications.extensionApproved(ext.id);
    } else {
      ext.status = 'declined';
      this.setBookingEnd(booking, Number(ext.previousEndMs));
      booking.status = 'extension_declined';
      if (ext.stripePaymentIntentId && this.payments.isConfigured()) {
        try {
          await this.payments.refundBookingPayment(
            ext.stripePaymentIntentId,
            'RentYourRide extension declined',
          );
        } catch {
          // Refund failure should not block decline
        }
      }
      await this.extensionsRepo.save(ext);
      await this.bookingsRepo.save(booking);
      await this.messaging.postBookingSystemMessage(
        booking.id,
        'Host declined the trip extension.',
        { event: 'extension_declined', extensionId: ext.id },
      );
      this.notifications.extensionDenied(ext.id);
    }

    return booking.toMobileDto();
  }

  private async requireBookingForExtension(
    guestId: string,
    bookingId: string,
    newEndMs: number,
  ): Promise<BookingEntity> {
    const booking = await this.bookingsRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestUserId !== guestId) throw new ForbiddenException();
    if (!this.extensionEligibleStatuses.includes(booking.status)) {
      throw new BadRequestException('Trip cannot be extended in its current status');
    }
    const currentEnd = this.bookingEndMs(booking);
    if (!currentEnd || newEndMs <= currentEnd) {
      throw new BadRequestException('New end date must be after the current trip end');
    }
    if (currentEnd - Date.now() < MS_PER_HOUR) {
      throw new BadRequestException('Extensions must be requested at least 1 hour before trip end');
    }
    return booking;
  }
}
