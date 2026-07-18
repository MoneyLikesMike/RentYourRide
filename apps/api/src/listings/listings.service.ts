import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { BookingEntity } from '../entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { assertIdentityVerified } from '../common/user-verification';
import {
  DATE_BLOCKING_BOOKING_STATUSES,
} from '../bookings/booking-date-ranges';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly repo: Repository<ListingEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    private readonly notifications: NotificationsService,
  ) {}

  private async requireVerifiedHost(hostUserId: string): Promise<UserEntity> {
    const user = await this.users.findOne({ where: { id: hostUserId } });
    if (!user) throw new NotFoundException('User not found');
    assertIdentityVerified(user);
    return user;
  }

  private mapPersistenceError(err: unknown): never {
    if (err instanceof QueryFailedError) {
      const code = (err as { code?: string }).code;
      if (code === '23505') {
        throw new ConflictException('This vehicle VIN is already listed');
      }
    }
    throw err;
  }

  async search(q?: string, city?: string): Promise<ListingEntity[]> {
    const qb = this.repo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.host', 'host')
      .where('l.active = true AND l.published = true');

    const parts: string[] = [];
    const params: Record<string, string> = {};

    if (city?.trim()) {
      const segments = city
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const primary = segments[0] ?? city.trim();
      const secondary = segments.length > 1 ? segments[1] : '';
      parts.push(
        '(LOWER(l.city) = LOWER(:cityPrimary) OR LOWER(l.city) LIKE :cityLike OR LOWER(l.pickup_address) LIKE :cityLike' +
          (secondary
            ? ' OR LOWER(l.city) = LOWER(:citySecondary) OR LOWER(l.pickup_address) LIKE :citySecondaryLike'
            : '') +
          ')',
      );
      params.cityPrimary = primary;
      params.cityLike = `%${primary.toLowerCase()}%`;
      if (secondary) {
        params.citySecondary = secondary;
        params.citySecondaryLike = `%${secondary.toLowerCase()}%`;
      }
    }
    if (q?.trim()) {
      parts.push(
        '(LOWER(l.title) LIKE :q OR LOWER(l.city) LIKE :q OR LOWER(l.pickup_address) LIKE :q)',
      );
      params.q = `%${q.trim().toLowerCase()}%`;
    }

    if (parts.length) {
      qb.andWhere(parts.join(' AND '), params);
    }

    qb.orderBy('l.createdAt', 'DESC');
    const rows = await qb.getMany();
    return rows;
  }

  async citySuggestions(input: string): Promise<string[]> {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    const rows = await this.repo
      .createQueryBuilder('l')
      .select('DISTINCT l.city', 'city')
      .where('l.active = true AND l.published = true')
      .andWhere('LOWER(l.city) LIKE :q', { q: `%${q}%` })
      .orderBy('l.city', 'ASC')
      .limit(8)
      .getRawMany<{ city: string }>();
    return rows.map((r) => r.city).filter(Boolean);
  }

  async findPublic(id: string): Promise<ListingEntity> {
    const listing = await this.repo.findOne({
      where: { id },
      relations: ['host'],
    });
    if (!listing || !listing.active || !listing.published) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  /**
   * Public blocked date ranges for a listing = host manual blocks + open bookings.
   * Safe to expose (no guest/payment details).
   * Timestamps are the stored booking/manual bounds so mobile local calendars align.
   */
  async getBlockedRanges(
    listingId: string,
    listing?: ListingEntity,
  ): Promise<Array<{ start: string; end: string }>> {
    const row = listing ?? (await this.findPublic(listingId));
    const out: Array<{ start: string; end: string }> = [];

    for (const r of row.availability ?? []) {
      if (!r?.start || !r?.end) continue;
      const startMs = Date.parse(r.start);
      const endMs = Date.parse(r.end);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
      out.push({
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
      });
    }

    const openBookings = await this.bookings.find({
      where: {
        listingId: row.id,
        status: In(DATE_BLOCKING_BOOKING_STATUSES),
      },
      select: ['id', 'bookingDates', 'status'],
    });
    for (const booking of openBookings) {
      const dates = booking.bookingDates as { start?: number; end?: number };
      const startMs = Number(dates?.start);
      const endMs = Number(dates?.end);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
      out.push({
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
      });
    }

    return out;
  }

  async toPublicDetailDto(listing: ListingEntity) {
    const dto = listing.toDetailDto(listing.host);
    const blockedRanges = await this.getBlockedRanges(listing.id, listing);
    return {
      ...dto,
      blockedRanges,
      // Mobile booking calendar historically expected calendarData.blockedRanges.
      calendarData: {
        blockedRanges: blockedRanges.map((r) => ({
          start: Date.parse(r.start),
          end: Date.parse(r.end),
        })),
      },
    };
  }

  async findForHost(hostUserId: string, id: string): Promise<ListingEntity> {
    const listing = await this.repo.findOne({
      where: { id, hostUserId },
      relations: ['host'],
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async hostList(hostUserId: string): Promise<ListingEntity[]> {
    return this.repo.find({
      where: { hostUserId },
      relations: ['host'],
      order: { createdAt: 'DESC' },
    });
  }

  async vinTaken(vin: string): Promise<boolean> {
    const normalized = vin.trim().toUpperCase();
    if (!normalized) return false;
    const found = await this.repo.findOne({ where: { vin: normalized } });
    return !!found;
  }

  async create(hostUserId: string, body: Partial<ListingEntity>): Promise<ListingEntity> {
    await this.requireVerifiedHost(hostUserId);
    const listing = this.repo.create({
      hostUserId,
      city: body.city || 'Winnipeg',
      title: body.title || 'My vehicle',
      description: body.description ?? '',
      vehicleType: body.vehicleType || 'SEDAN',
      photos: body.photos ?? [],
      pricePerDay: String(body.pricePerDay ?? '40'),
      weeklyDiscount: body.weeklyDiscount ?? null,
      monthlyDiscount: body.monthlyDiscount ?? null,
      deliveryPrice: body.deliveryPrice != null ? String(body.deliveryPrice) : null,
      dailyKm: body.dailyKm ?? null,
      instantBooking: body.instantBooking ?? false,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      pickupAddress: body.pickupAddress || '',
      active: body.active !== false,
      published: body.published ?? false,
      vin: body.vin?.trim() ? body.vin.trim().toUpperCase() : null,
      carFeatures: body.carFeatures ?? [],
      extras: body.extras ?? {},
      availability: body.availability ?? [],
      licensePlate: body.licensePlate ?? null,
      licenseProvince: body.licenseProvince ?? null,
      vehicleData: body.vehicleData ?? null,
    });
    try {
      const saved = await this.repo.save(listing);
      this.notifications.newListingCreated(saved.id);
      return saved;
    } catch (err) {
      this.mapPersistenceError(err);
    }
  }

  async update(hostUserId: string, id: string, patch: Partial<ListingEntity>) {
    const listing = await this.findForHost(hostUserId, id);
    // Host PATCH must not change verification — use publish()/unpublish()/softDelete().
    // Matches legacy UpdateRideDTO (no isVerified field).
    const { published: _published, ...safePatch } = patch as Partial<ListingEntity> & {
      published?: boolean;
    };
    Object.assign(listing, safePatch);
    if (patch.vin !== undefined) {
      listing.vin = patch.vin?.trim() ? patch.vin.trim().toUpperCase() : null;
    }
    if (typeof listing.pricePerDay === 'number') {
      listing.pricePerDay = String(listing.pricePerDay);
    }
    if (
      listing.deliveryPrice != null &&
      typeof listing.deliveryPrice === 'number'
    ) {
      listing.deliveryPrice = String(listing.deliveryPrice);
    }
    try {
      return await this.repo.save(listing);
    } catch (err) {
      this.mapPersistenceError(err);
    }
  }

  async softDelete(hostUserId: string, id: string) {
    const listing = await this.findForHost(hostUserId, id);
    listing.active = false;
    listing.published = false;
    await this.repo.save(listing);
    return { ok: true };
  }

  async publish(hostUserId: string, id: string, published: boolean) {
    if (published) {
      await this.requireVerifiedHost(hostUserId);
    }
    const listing = await this.findForHost(hostUserId, id);
    listing.published = published;
    if (published) listing.active = true;
    await this.repo.save(listing);
    return listing;
  }

  async ensureHost(user: UserEntity) {
    if (user.role !== 'host') {
      user.role = 'host';
      await this.repo.manager.getRepository(UserEntity).save(user);
    }
  }

  async appendPhoto(hostUserId: string, listingId: string, uri: string) {
    const listing = await this.findForHost(hostUserId, listingId);
    const photos = [...(listing.photos || [])];
    photos.push({ uri });
    listing.photos = photos;
    await this.repo.save(listing);
    return listing;
  }
}
