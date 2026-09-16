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
import { ConversationEntity } from './conversation.entity';

export type MessageType = 'text' | 'system';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => ConversationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ConversationEntity;

  @Column({ name: 'sender_user_id', type: 'uuid', nullable: true })
  senderUserId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sender_user_id' })
  sender: UserEntity | null;

  @Column({ type: 'varchar', length: 16, default: 'text' })
  type: MessageType;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
