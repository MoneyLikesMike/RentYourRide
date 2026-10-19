import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

/** Audit trail when a host accepts Stripe Connect TOS via our Get Paid form. */
@Entity('connect_tos_acceptances')
export class ConnectTosAcceptanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'account_id', type: 'varchar', length: 64 })
  accountId: string;

  @Column({ name: 'accepted_at', type: 'timestamptz' })
  acceptedAt: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ name: 'agreement_version', type: 'varchar', length: 64 })
  agreementVersion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
