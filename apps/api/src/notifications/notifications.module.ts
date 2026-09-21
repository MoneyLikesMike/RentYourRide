import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingExtensionEntity } from '../entities/booking-extension.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { PushDeviceTokenEntity } from '../entities/push-device-token.entity';
import { InAppNotificationEntity } from '../entities/in-app-notification.entity';
import { NotificationDispatchClaimEntity } from '../entities/notification-dispatch-claim.entity';
import { NotificationDispatchLogEntity } from '../entities/notification-dispatch-log.entity';
import { SmsOutboxEntity } from '../entities/sms-outbox.entity';
import { NotificationsService } from './notifications.service';
import { PinpointService } from './pinpoint.service';
import { ExpoPushService } from './expo-push.service';
import { PushTokenService } from './push-token.service';
import { TripReminderScheduler } from './trip-reminder.scheduler';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingExtensionEntity,
      ListingEntity,
      UserEntity,
      PushDeviceTokenEntity,
      InAppNotificationEntity,
      NotificationDispatchLogEntity,
      NotificationDispatchClaimEntity,
      SmsOutboxEntity,
    ]),
  ],
  providers: [
    PinpointService,
    ExpoPushService,
    PushTokenService,
    NotificationsService,
    TripReminderScheduler,
  ],
  exports: [NotificationsService, PinpointService, PushTokenService, ExpoPushService],
})
export class NotificationsModule {}
