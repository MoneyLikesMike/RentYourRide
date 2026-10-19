import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ReqUser } from '../common/req-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { PayoutSetupDto } from './payout-setup.dto';
import { PayoutsService } from './payouts.service';

function userAgentFromRequest(req: Request): string | null {
  const ua = req.headers['user-agent'];
  if (typeof ua === 'string' && ua.trim()) return ua.trim().slice(0, 512);
  return null;
}

@ApiTags('payouts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  /** @deprecated Prefer POST connect/setup (Custom Get Paid). */
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
  async setup(
    @Req() req: Request,
    @ReqUser() user: UserEntity,
    @Body() body: PayoutSetupDto,
  ) {
    // TOS attestation must use the real client IP / UA — never body fields.
    return this.payouts.submitPayoutDetails(user.id, body, {
      ip: req.ip ? String(req.ip).slice(0, 64) : null,
      userAgent: userAgentFromRequest(req),
      acceptedAt: new Date(),
    });
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
