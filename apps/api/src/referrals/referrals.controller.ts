import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../common/req-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { UsersService } from '../users/users.service';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async summary(@ReqUser() user: UserEntity) {
    return this.users.getReferralSummary(user.id);
  }

  @Post('apply-code')
  async apply(@ReqUser() user: UserEntity, @Body() body: { code: string }) {
    return this.users.applyReferralCode(user.id, body.code ?? '');
  }
}
