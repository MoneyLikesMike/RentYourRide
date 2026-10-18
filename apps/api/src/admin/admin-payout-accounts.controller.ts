import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { HostPayoutAccountsService } from '../payouts/host-payout-accounts.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/payout-accounts')
export class AdminPayoutAccountsController {
  constructor(private readonly hostAccounts: HostPayoutAccountsService) {}

  @Get()
  async list(
    @Query('filter') filter?: 'past_due' | 'restricted' | 'pending_payouts',
  ) {
    // Response is sanitized in the service (no SIN / document file ids).
    return this.hostAccounts.adminList(filter);
  }

  @Post(':userId/resync')
  async resync(@Param('userId') userId: string) {
    return this.hostAccounts.resyncForUser(userId);
  }
}
