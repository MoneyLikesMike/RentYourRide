import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { FavoriteEntity } from '../entities/favorite.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AccountDeletionScheduler } from './account-deletion.scheduler';
import { GoogleAuthService } from '../auth/google-auth.service';
import { AppleAuthService } from '../auth/apple-auth.service';
import { DiditModule } from '../didit/didit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      BookingEntity,
      ListingEntity,
      FavoriteEntity,
      RefreshTokenEntity,
      PasswordResetTokenEntity,
      EmailVerificationTokenEntity,
    ]),
    forwardRef(() => DiditModule),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    AccountDeletionScheduler,
    GoogleAuthService,
    AppleAuthService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
