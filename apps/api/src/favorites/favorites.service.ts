import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteEntity } from '../entities/favorite.entity';
import { ListingEntity } from '../entities/listing.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteEntity)
    private readonly favRepo: Repository<FavoriteEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingRepo: Repository<ListingEntity>,
  ) {}

  async list(userId: string) {
    const rows = await this.favRepo.find({
      where: { userId },
      relations: ['listing', 'listing.host'],
      order: { createdAt: 'DESC' },
    });
    return rows
      .filter((r) => r.listing?.published && r.listing?.active)
      .map((r) => r.listing.toDetailDto());
  }

  async add(userId: string, listingId: string) {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ['host'],
    });
    if (!listing?.published || !listing.active) {
      throw new NotFoundException('Listing not found');
    }
    await this.favRepo
      .createQueryBuilder()
      .insert()
      .into(FavoriteEntity)
      .values({ userId, listingId })
      .orIgnore()
      .execute();
    return { ok: true };
  }

  async remove(userId: string, listingId: string) {
    await this.favRepo.delete({ userId, listingId });
    return { ok: true };
  }
}
