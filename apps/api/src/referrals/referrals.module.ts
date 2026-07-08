import { Module } from '@nestjs/common';
import { ReferralsController } from './referrals.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ReferralsController],
})
export class ReferralsModule {}
