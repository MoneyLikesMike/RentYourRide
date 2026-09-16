import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../common/req-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { PayoutSetupDto } from './payout-setup.dto';
import { PayoutsService } from './payouts.service';

@ApiTags('payouts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post('connect/onboarding-link')
  async onboarding(
    @ReqUser() user: UserEntity,
    @Body() body: { refreshUrl?: string; returnUrl?: string },
  ) {
    return this.payouts.createOnboardingLink(
      user.id,
      body.refreshUrl ?? '',
      body.returnUrl ?? '',
    );
  }

  @Post('connect/setup')
  async setup(@ReqUser() user: UserEntity, @Body() body: PayoutSetupDto) {
    return this.payouts.submitPayoutDetails(user.id, body);
  }

  @Get('account-status')
  async status(@ReqUser() user: UserEntity) {
    return this.payouts.accountStatus(user.id);
  }

  @Get('summary')
  async summary(@ReqUser() user: UserEntity) {
    return this.payouts.summary(user.id);
  }
}
