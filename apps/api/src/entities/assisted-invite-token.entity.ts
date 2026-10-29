import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssistedLeadEntity } from './assisted-lead.entity';
import { UserEntity } from './user.entity';

@Entity('assisted_invite_tokens')
export class AssistedInviteTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne(() => AssistedLeadEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: AssistedLeadEntity;

  @Index({ unique: true })
  @Column({ name: 'token_hash', type: 'varchar', length: 128 })
  tokenHash: string;

  @Column({ type: 'varchar', length: 16 })
  channel: 'sms' | 'email';

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'bound_user_id', type: 'uuid', nullable: true })
  boundUserId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'bound_user_id' })
  boundUser: UserEntity | null;

  @Column({ name: 'created_by_staff_id', type: 'uuid' })
  createdByStaffId: string;

  @Column({ name: 'delivered_via', type: 'varchar', length: 16, nullable: true })
  deliveredVia: 'sms' | 'email' | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
