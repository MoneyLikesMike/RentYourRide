import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { ReqUser } from '../common/req-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { HostPayoutAccountsService } from './host-payout-accounts.service';
import { PayoutSetupDto } from './payout-setup.dto';
import { PayoutRequirementsService } from './payout-requirements.service';
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
  constructor(
    private readonly payouts: PayoutsService,
    private readonly hostAccounts: HostPayoutAccountsService,
    private readonly requirements: PayoutRequirementsService,
  ) {}

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
    return this.payouts.submitPayoutDetails(user.id, body, {
      ip: req.ip ? String(req.ip).slice(0, 64) : null,
      userAgent: userAgentFromRequest(req),
      acceptedAt: new Date(),
    });
  }

  @Get('account-status')
  async status(@ReqUser() user: UserEntity) {
    return this.hostAccounts.accountStatusForUser(user.id);
  }

  @Get('summary')
  async summary(@ReqUser() user: UserEntity) {
    return this.payouts.summary(user.id);
  }

  @Get('requirements')
  async listRequirements(@ReqUser() user: UserEntity) {
    return this.hostAccounts.listRequirements(user.id);
  }

  @Post('requirements/personal')
  async personal(
    @ReqUser() user: UserEntity,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      region?: string;
      postalCode?: string;
    },
  ) {
    return this.requirements.submitPersonal(user.id, body);
  }

  @Post('requirements/sin')
  async sin(
    @ReqUser() user: UserEntity,
    @Body() body: { sin: string },
  ) {
    return this.requirements.submitSin(user.id, body.sin ?? '');
  }

  @Post('requirements/bank')
  async bank(
    @ReqUser() user: UserEntity,
    @Body()
    body: {
      accountNumber: string;
      transitNumber: string;
      institutionNumber: string;
      accountHolderName: string;
    },
  ) {
    return this.requirements.submitBank(user.id, body);
  }

  @Post('requirements/tos')
  async tos(@Req() req: Request, @ReqUser() user: UserEntity) {
    return this.requirements.submitTos(user.id, {
      ip: req.ip ? String(req.ip).slice(0, 64) : null,
      userAgent: userAgentFromRequest(req),
      acceptedAt: new Date(),
    });
  }

  @Post('requirements/document')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      },
    ),
  )
  async document(
    @ReqUser() user: UserEntity,
    @UploadedFiles()
    files: { front?: Express.Multer.File[]; back?: Express.Multer.File[] },
    @Body() body: { purpose?: string },
  ) {
    const front = files?.front?.[0];
    const back = files?.back?.[0];
    const purpose =
      body?.purpose === 'additional_verification'
        ? 'additional_verification'
        : 'identity_document';
    if (!front) {
      return this.requirements.submitDocument(user.id, {
        front: { buffer: Buffer.alloc(0), mimetype: '', originalname: '' },
        purpose,
      });
    }
    return this.requirements.submitDocument(user.id, {
      front: {
        buffer: front.buffer,
        mimetype: front.mimetype,
        originalname: front.originalname,
      },
      back: back
        ? {
            buffer: back.buffer,
            mimetype: back.mimetype,
            originalname: back.originalname,
          }
        : null,
      purpose,
    });
  }
}
