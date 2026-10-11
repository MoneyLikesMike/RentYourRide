import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';

export type ExtensionStatus = 'pending' | 'approved' | 'declined';

@Entity('booking_extensions')
export class BookingExtensionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  @Column({ name: 'previous_end_ms', type: 'bigint' })
  previousEndMs: string;

  @Column({ name: 'new_end_ms', type: 'bigint' })
  newEndMs: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: ExtensionStatus;

  @Column({ type: 'jsonb' })
  pricing: Record<string, unknown>;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', length: 128, nullable: true })
  stripePaymentIntentId: string | null;

  /** Guest charge for this extension; source_transaction for the host payout. */
  @Column({ name: 'stripe_charge_id', type: 'varchar', length: 128, nullable: true })
  stripeChargeId: string | null;

  /** 'scheduled' once approved and paid; the RYRA-457 scheduler moves it to 'paid'. */
  @Column({ name: 'host_payout_status', type: 'varchar', length: 16, nullable: true })
  hostPayoutStatus: string | null;

  @Column({ name: 'host_payout_cents', type: 'integer', nullable: true })
  hostPayoutCents: number | null;

  @Column({ name: 'host_payout_scheduled_at', type: 'timestamp', nullable: true })
  hostPayoutScheduledAt: Date | null;

  @Column({ name: 'host_transfer_id', type: 'varchar', length: 128, nullable: true })
  hostTransferId: string | null;

  @Column({ name: 'guest_message', type: 'text', nullable: true })
  guestMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
