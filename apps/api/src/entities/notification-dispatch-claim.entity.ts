import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * One row per booking + event + channel. Holds the idempotency lock so a second
 * cancel/refund pass does not send again.
 */
@Entity('notification_dispatch_claim')
@Index(['bookingId', 'event', 'channel'], { unique: true })
export class NotificationDispatchClaimEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
