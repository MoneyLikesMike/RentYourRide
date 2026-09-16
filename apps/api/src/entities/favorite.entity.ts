import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ListingEntity } from './listing.entity';

@Entity('favorites')
export class FavoriteEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'listing_id', type: 'uuid' })
  listingId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
