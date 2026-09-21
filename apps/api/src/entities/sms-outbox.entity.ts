import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Queued SMS after a provider or spend-cap failure. The cap itself is not raised. */
@Entity('sms_outbox')
export class SmsOutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'dedupe_key', type: 'varchar', length: 192 })
  dedupeKey: string;

  @Column({ type: 'varchar', length: 40 })
  phone: string;

  @Column({ type: 'text' })
  body: string;

  @Index()
  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ type: 'varchar', length: 64 })
  event: string;

  @Column({ name: 'failure_kind', type: 'varchar', length: 32 })
  failureKind: string;

  @Column({ type: 'varchar', length: 16, default: 'queued' })
  status: string;

  @Column({ type: 'int', default: 1 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'next_retry_at', type: 'timestamptz' })
  nextRetryAt: Date;

  @Column({ name: 'admin_alerted_at', type: 'timestamptz', nullable: true })
  adminAlertedAt: Date | null;

  @Column({ name: 'exhausted_alerted_at', type: 'timestamptz', nullable: true })
  exhaustedAlertedAt: Date | null;

  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId: string | null;

  @Column({ name: 'host_member_id', type: 'uuid', nullable: true })
  hostMemberId: string | null;

  @Column({ name: 'guest_member_id', type: 'uuid', nullable: true })
  guestMemberId: string | null;

  @Column({ name: 'stripe_refund_id', type: 'varchar', length: 128, nullable: true })
  stripeRefundId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
