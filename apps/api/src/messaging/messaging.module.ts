import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';
import { BookingEntity } from '../entities/booking.entity';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationEntity, MessageEntity, BookingEntity])],
  providers: [MessagingService],
  controllers: [MessagingController],
  exports: [MessagingService],
})
export class MessagingModule {}
