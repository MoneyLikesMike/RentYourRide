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
import { BookingEntity } from './booking.entity';

@Entity('conversations')
@Index(['bookingId'], { unique: true, where: '"booking_id" IS NOT NULL' })
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId: string | null;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity | null;

  @Column({ name: 'guest_user_id', type: 'uuid' })
  guestUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_user_id' })
  guest: UserEntity;

  @Column({ name: 'host_user_id', type: 'uuid' })
  hostUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_user_id' })
  host: UserEntity;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: 'last_message_preview', type: 'varchar', length: 240, nullable: true })
  lastMessagePreview: string | null;

  @Column({ name: 'guest_last_read_at', type: 'timestamptz', nullable: true })
  guestLastReadAt: Date | null;

  @Column({ name: 'host_last_read_at', type: 'timestamptz', nullable: true })
  hostLastReadAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
