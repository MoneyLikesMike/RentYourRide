import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ListingEntity } from '../entities/listing.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AdminListingsPageOptionsDto,
  PaginatedDto,
  PageMetaDto,
} from '../common/pagination.dto';
import { toAdminListingRow, toAdminRideDetail } from './admin.mapper';

@Injectable()
export class AdminListingsService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    private readonly notifications: NotificationsService,
  ) {}

  async list(opts: AdminListingsPageOptionsDto) {
    const qb = this.listings
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.host', 'host');

    if (opts.query?.trim()) {
      const q = `%${opts.query.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(listing.title) LIKE :q', { q })
            .orWhere('LOWER(listing.city) LIKE :q', { q })
            .orWhere('LOWER(host.first_name) LIKE :q', { q })
            .orWhere('LOWER(host.last_name) LIKE :q', { q });
        }),
      );
    }

    qb.orderBy('listing.created_at', opts.order).skip(opts.skip).take(opts.take);
    const [rows, itemCount] = await qb.getManyAndCount();
    return new PaginatedDto(
      rows.map(toAdminListingRow),
      new PageMetaDto(opts, itemCount),
    );
  }

  async getOne(id: string) {
    const listing = await this.listings.findOne({
      where: { id },
      relations: ['host'],
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return toAdminRideDetail(listing);
  }

  async verify(id: string) {
    const listing = await this.requireListing(id);
    listing.published = true;
    await this.listings.save(listing);
    this.notifications.listingApproved(listing.hostUserId);
    return toAdminRideDetail(listing);
  }

  async unverify(id: string) {
    const listing = await this.requireListing(id);
    listing.published = false;
    await this.listings.save(listing);
    this.notifications.listingDenied(listing.hostUserId);
    return toAdminRideDetail(listing);
  }

  async activate(id: string) {
    const listing = await this.requireListing(id);
    listing.active = true;
    await this.listings.save(listing);
    return toAdminRideDetail(listing);
  }

  async deactivate(id: string) {
    const listing = await this.requireListing(id);
    listing.active = false;
    listing.published = false;
    await this.listings.save(listing);
    return toAdminRideDetail(listing);
  }

  private async requireListing(id: string) {
    const listing = await this.listings.findOne({
      where: { id },
      relations: ['host'],
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }
}
