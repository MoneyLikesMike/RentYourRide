import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export type AssistedLeadStatus = 'open' | 'linked' | 'booked' | 'cancelled';

@Entity('assisted_leads')
export class AssistedLeadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'created_by_staff_id', type: 'uuid' })
  createdByStaffId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_staff_id' })
  createdByStaff: UserEntity;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 64, default: 'facebook_marketplace' })
  source: string;

  @Column({ type: 'varchar', length: 24, default: 'open' })
  status: AssistedLeadStatus;

  @Column({ name: 'linked_user_id', type: 'uuid', nullable: true })
  linkedUserId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'linked_user_id' })
  linkedUser: UserEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
