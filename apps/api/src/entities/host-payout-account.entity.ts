import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export type HostPayoutAccountKind = 'express' | 'custom';

@Entity('host_payout_accounts')
export class HostPayoutAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Index({ unique: true })
  @Column({ name: 'stripe_account_id', type: 'varchar', length: 128 })
  stripeAccountId: string;

  @Column({ name: 'account_kind', type: 'varchar', length: 16 })
  accountKind: HostPayoutAccountKind;

  @Column({ name: 'charges_enabled', type: 'boolean', default: false })
  chargesEnabled: boolean;

  @Column({ name: 'payouts_enabled', type: 'boolean', default: false })
  payoutsEnabled: boolean;

  /** Stripe capability status: active | inactive | pending | unrequested | … */
  @Column({ name: 'transfers_capability', type: 'varchar', length: 32, nullable: true })
  transfersCapability: string | null;

  @Column({ name: 'currently_due', type: 'jsonb', default: [] })
  currentlyDue: string[];

  @Column({ name: 'past_due', type: 'jsonb', default: [] })
  pastDue: string[];

  @Column({ name: 'eventually_due', type: 'jsonb', default: [] })
  eventuallyDue: string[];

  @Column({ name: 'pending_verification', type: 'jsonb', default: [] })
  pendingVerification: string[];

  @Column({ type: 'jsonb', default: [] })
  errors: Array<{ requirement?: string; code?: string; reason?: string }>;

  @Column({ name: 'disabled_reason', type: 'varchar', length: 128, nullable: true })
  disabledReason: string | null;

  @Column({ name: 'current_deadline', type: 'timestamptz', nullable: true })
  currentDeadline: Date | null;

  @Column({ name: 'future_requirements', type: 'jsonb', nullable: true })
  futureRequirements: Record<string, unknown> | null;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
