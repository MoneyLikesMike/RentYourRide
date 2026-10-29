import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssistedLeadEntity } from './assisted-lead.entity';
import { ListingEntity } from './listing.entity';
import { BookingEntity } from './booking.entity';

@Entity('assisted_booking_drafts')
export class AssistedBookingDraftEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne(() => AssistedLeadEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: AssistedLeadEntity;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity;

  @Column({ name: 'booking_dates', type: 'jsonb' })
  bookingDates: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  extras: unknown[] | null;

  @Column({ name: 'delivery_enabled', type: 'boolean', default: false })
  deliveryEnabled: boolean;

  @Column({ name: 'intro_message', type: 'text', nullable: true })
  introMessage: string | null;

  @Column({ name: 'quoted_pricing', type: 'jsonb' })
  quotedPricing: Record<string, unknown>;

  @Column({ name: 'quoted_grand_total_cents', type: 'int' })
  quotedGrandTotalCents: number;

  @Column({ name: 'quoted_at', type: 'timestamptz' })
  quotedAt: Date;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId: string | null;

  @ManyToOne(() => BookingEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
