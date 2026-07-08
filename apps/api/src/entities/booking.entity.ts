import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ListingEntity } from './listing.entity';

export type BookingStatus =
  | 'pending_host'
  | 'confirmed'
  | 'checkin_pending'
  | 'active'
  | 'checkout_pending'
  | 'completed'
  | 'cancelled'
  | 'declined';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guest_user_id', type: 'uuid' })
  guestUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_user_id' })
  guest: UserEntity;

  @Column({ name: 'host_user_id', type: 'uuid' })
  hostUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_user_id' })
  host: UserEntity;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  @Column({ type: 'varchar', length: 32 })
  status: BookingStatus;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', length: 128, nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ name: 'instant_booking', type: 'boolean', default: false })
  instantBooking: boolean;

  @Column({ name: 'listing_snapshot', type: 'jsonb' })
  listingSnapshot: Record<string, unknown>;

  @Column({ name: 'booking_dates', type: 'jsonb' })
  bookingDates: Record<string, unknown>;

  @Column({ name: 'pickup_address', type: 'varchar', length: 512 })
  pickupAddress: string;

  @Column({ name: 'dropoff_address', type: 'varchar', length: 512, nullable: true })
  dropoffAddress: string | null;

  @Column({ name: 'delivery_enabled', type: 'boolean', default: false })
  deliveryEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  extras: unknown[] | null;

  @Column({ name: 'intro_message', type: 'text', nullable: true })
  introMessage: string | null;

  @Column({ type: 'jsonb' })
  pricing: Record<string, unknown>;

  @Column({ name: 'selected_payment_method', type: 'jsonb', nullable: true })
  selectedPaymentMethod: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  lifecycle: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  toMobileDto() {
    const snap = this.listingSnapshot as Record<string, unknown>;
    const guest = this.guest;
    const guestName = guest ? [guest.firstName, guest.lastName].filter(Boolean).join(' ').trim() : '';
    return {
      id: this.id,
      listingId: this.listingId,
      guestUserId: this.guestUserId,
      hostUserId: this.hostUserId,
      instantBooking: this.instantBooking,
      guestName: guestName || 'Guest',
      guestPhotoUri: guest?.avatarUrl ?? null,
      listingSnapshot: snap,
      bookingDates: this.bookingDates,
      pickupAddress: this.pickupAddress,
      dropoffAddress: this.dropoffAddress ?? this.pickupAddress,
      deliveryEnabled: this.deliveryEnabled,
      extras: this.extras ?? [],
      introMessage: this.introMessage ?? '',
      pricing: this.pricing,
      selectedPaymentMethod: this.selectedPaymentMethod ?? null,
      status: this.status,
      lifecycle: this.lifecycle ?? {},
      createdAt: this.createdAt.getTime(),
    };
  }
}
