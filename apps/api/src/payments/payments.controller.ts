import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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

  @Post('methods/added')
  async methodAdded(
    @ReqUser() user: UserEntity,
    @Body() body: { paymentMethodId: string },
  ) {
    return this.payments.notifyPaymentMethodAdded(user.id, body.paymentMethodId);
  }

  @Post('methods/default')
  async setDefault(
    @ReqUser() user: UserEntity,
    @Body() body: { paymentMethodId: string },
  ) {
    return this.payments.setDefaultPaymentMethod(user.id, body.paymentMethodId);
  }

  @Patch('methods/:paymentMethodId')
  async updateMethod(
    @ReqUser() user: UserEntity,
    @Param('paymentMethodId') paymentMethodId: string,
    @Body()
    body: {
      cardholderName?: string;
      country?: string;
      postalCode?: string;
    },
  ) {
    return this.payments.updateMethodBilling(user.id, paymentMethodId, body);
  }

  @Delete('methods/:paymentMethodId')
  async deleteMethod(
    @ReqUser() user: UserEntity,
    @Param('paymentMethodId') paymentMethodId: string,
  ) {
    return this.payments.deletePaymentMethod(user.id, paymentMethodId);
  }
}
