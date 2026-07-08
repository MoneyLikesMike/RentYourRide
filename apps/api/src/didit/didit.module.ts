import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiditWebhookEventEntity } from '../entities/didit-webhook-event.entity';
import { UsersModule } from '../users/users.module';
import { DiditController } from './didit.controller';
import { DiditService } from './didit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DiditWebhookEventEntity]),
    UsersModule,
  ],
  controllers: [DiditController],
  providers: [DiditService],
})
export class DiditModule {}
