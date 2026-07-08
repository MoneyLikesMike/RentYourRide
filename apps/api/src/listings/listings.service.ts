import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly repo: Repository<ListingEntity>,
  ) {}

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
      parts.push('LOWER(l.city) = LOWER(:city)');
      params.city = city.trim();
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

    qb.orderBy('l.created_at', 'DESC');
    const rows = await qb.getMany();
    return rows;
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
      return await this.repo.save(listing);
    } catch (err) {
      this.mapPersistenceError(err);
    }
  }

  async update(hostUserId: string, id: string, patch: Partial<ListingEntity>) {
    const listing = await this.findForHost(hostUserId, id);
    Object.assign(listing, patch);
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
