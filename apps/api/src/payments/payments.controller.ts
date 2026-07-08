import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../common/req-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('setup-intent')
  async setupIntent(@ReqUser() user: UserEntity) {
    return this.payments.createSetupIntent(user.id);
  }

  @Post('payment-intent')
  async paymentIntent(
    @ReqUser() user: UserEntity,
    @Body()
    body: {
      amountCents: number;
      currency?: string;
      metadata?: Record<string, string>;
    },
  ) {
    return this.payments.createPaymentIntent(user.id, body);
  }

  @Get('methods')
  async methods(@ReqUser() user: UserEntity) {
    return this.payments.listMethods(user.id);
  }

  @Post('methods/default')
  async setDefault(
    @ReqUser() user: UserEntity,
    @Body() body: { paymentMethodId: string },
  ) {
    return this.payments.setDefaultPaymentMethod(user.id, body.paymentMethodId);
  }
}
