import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './entities';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ListingsModule } from './listings/listings.module';
import { FavoritesModule } from './favorites/favorites.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { PayoutsModule } from './payouts/payouts.module';
import { ReferralsModule } from './referrals/referrals.module';
import { HealthModule } from './health/health.module';
import { GeocodeModule } from './geocode/geocode.module';
import { DiditModule } from './didit/didit.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url =
          config.get<string>('DATABASE_URL') ||
          'postgresql://ryr:ryr@localhost:5433/rentyourride';
        const forceSynchronize = config.get<string>('TYPEORM_SYNCHRONIZE') === '1';
        const useSsl =
          config.get<string>('DATABASE_SSL') === '1' ||
          url.includes('amazonaws.com') ||
          url.includes('sslmode=require');
        const urlWithoutSslMode = url.replace(/[?&]sslmode=[^&]+/g, '').replace(/\?$/, '');
        return {
          type: 'postgres',
          url: urlWithoutSslMode,
          entities,
          synchronize: forceSynchronize || config.get<string>('NODE_ENV') !== 'production',
          logging: config.get<string>('TYPEORM_LOGGING') === '1',
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        };
      },
    }),
    AuthModule,
    UsersModule,
    ListingsModule,
    FavoritesModule,
    BookingsModule,
    PaymentsModule,
    PayoutsModule,
    ReferralsModule,
    HealthModule,
    GeocodeModule,
    DiditModule,
    MessagingModule,
  ],
})
export class AppModule {}
