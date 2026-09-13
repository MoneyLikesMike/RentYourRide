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

  @Column({ name: 'guest_message', type: 'text', nullable: true })
  guestMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
