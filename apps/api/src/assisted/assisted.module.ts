import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistedLeadEntity } from '../entities/assisted-lead.entity';
import { AssistedBookingDraftEntity } from '../entities/assisted-booking-draft.entity';
import { AssistedInviteTokenEntity } from '../entities/assisted-invite-token.entity';
import { LegalAcceptanceEntity } from '../entities/legal-acceptance.entity';
import { AdminAuditLogEntity } from '../entities/admin-audit-log.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { AssistedService } from './assisted.service';
import { AssistedAdminController } from './assisted-admin.controller';
import { AssistedGuestController } from './assisted-guest.controller';
import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminGuard } from '../common/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssistedLeadEntity,
      AssistedBookingDraftEntity,
      AssistedInviteTokenEntity,
      LegalAcceptanceEntity,
      AdminAuditLogEntity,
      ListingEntity,
      UserEntity,
    ]),
    AuthModule,
    BookingsModule,
    PaymentsModule,
  ],
  controllers: [AssistedAdminController, AssistedGuestController],
  providers: [AssistedService, AdminGuard],
})
export class AssistedModule {}
