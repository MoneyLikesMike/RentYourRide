import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/optional-jwt.guard';
import { AuthGuard } from '@nestjs/passport';
import { clientIpFromRequest } from '../auth/phone-otp-policy';
import { AssistedService } from './assisted.service';
import type { LegalDocument } from './assisted.constants';

@ApiTags('assisted')
@Controller('assisted')
export class AssistedGuestController {
  constructor(private readonly assisted: AssistedService) {}

  @Get('finish/:token')
  @UseGuards(OptionalJwtAuthGuard)
  session(@Req() req, @Param('token') token: string) {
    return this.assisted.getFinishSession(token, req.user?.id ?? null);
  }

  @Post('finish/:token/legal')
  @UseGuards(OptionalJwtAuthGuard)
  legal(
    @Req() req,
    @Param('token') token: string,
    @Body() body: { documents: LegalDocument[] },
  ) {
    return this.assisted.acceptLegal(
      token,
      body.documents ?? [],
      req.user?.id ?? null,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Post('finish/:token/register')
  register(@Req() req, @Param('token') token: string, @Body() body: Record<string, string>) {
    return this.assisted.authWithToken(
      token,
      'register',
      body,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Post('finish/:token/login')
  login(@Req() req, @Param('token') token: string, @Body() body: Record<string, string>) {
    return this.assisted.authWithToken(
      token,
      'login',
      body,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Post('finish/:token/google')
  google(@Req() req, @Param('token') token: string, @Body() body: Record<string, string>) {
    return this.assisted.authWithToken(
      token,
      'google',
      body,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Post('finish/:token/apple')
  apple(@Req() req, @Param('token') token: string, @Body() body: Record<string, string>) {
    return this.assisted.authWithToken(
      token,
      'apple',
      body,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Post('finish/:token/accept')
  @UseGuards(AuthGuard('jwt'))
  accept(@Req() req, @Param('token') token: string) {
    return this.assisted.acceptBooking(
      token,
      req.user.id,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }
}
