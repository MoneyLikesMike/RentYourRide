import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Append-only record of one notify attempt on one channel. */
@Entity('notification_dispatch_log')
export class NotificationDispatchLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ type: 'varchar', length: 64 })
  event: string;

  @Column({ type: 'varchar', length: 16 })
  channel: string;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reason: string | null;

  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId: string | null;

  @Column({ name: 'host_member_id', type: 'uuid', nullable: true })
  hostMemberId: string | null;

  @Column({ name: 'guest_member_id', type: 'uuid', nullable: true })
  guestMemberId: string | null;

  @Column({ name: 'stripe_refund_id', type: 'varchar', length: 128, nullable: true })
  stripeRefundId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detail: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
