import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stripe_webhook_events')
export class StripeWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stripe event id (evt_…). */
  @Index({ unique: true })
  @Column({ name: 'event_id', type: 'varchar', length: 128 })
  eventId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 128 })
  eventType: string;

  @Column({ name: 'stripe_account', type: 'varchar', length: 128, nullable: true })
  stripeAccount: string | null;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}
