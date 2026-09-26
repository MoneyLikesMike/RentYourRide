import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { ReqUser } from '../common/req-user.decorator';
import { DiditService } from './didit.service';

class CreateDiditSessionDto {
  @IsOptional()
  @IsString()
  callback?: string;
}

@ApiTags('verification')
@Controller()
export class DiditController {
  constructor(private readonly didit: DiditService) {}

  @Post('verification/didit/session')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async createSession(
    @ReqUser() user: { id: string },
    @Body() body: CreateDiditSessionDto,
  ) {
    return this.didit.createLicenseSession(user.id, body?.callback);
  }

  /** Cancel an incomplete Didit session so the user can retry license upload. */
  @Post('verification/didit/abandon')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async abandonSession(@ReqUser() user: { id: string }) {
    return this.didit.abandonIncompleteLicenseSession(user.id);
  }

  @Post('webhooks/didit')
  async webhook(@Req() req: RawBodyRequest<Request>) {
    const raw = req.rawBody?.toString('utf8') ?? '';
    const signature = String(req.headers['x-signature-v2'] ?? '');
    const timestamp = String(req.headers['x-timestamp'] ?? '');
    return this.didit.handleWebhook(raw, signature, timestamp);
  }
}
