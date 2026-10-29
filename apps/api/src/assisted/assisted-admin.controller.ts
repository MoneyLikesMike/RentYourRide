import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard';
import { clientIpFromRequest } from '../auth/phone-otp-policy';
import { AssistedService } from './assisted.service';
import { QuoteInput } from '../bookings/bookings.service';

@ApiTags('admin/leads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/leads')
export class AssistedAdminController {
  constructor(private readonly assisted: AssistedService) {}

  @Post()
  create(@Req() req, @Body() body: { name: string; email?: string; phone?: string; notes?: string }) {
    return this.assisted.createLead(
      req.user.id,
      body,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Get()
  list() {
    return this.assisted.listLeads();
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assisted.getLead(id);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; email?: string; phone?: string; notes?: string },
  ) {
    return this.assisted.updateLead(
      req.user.id,
      id,
      body,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Post(':id/draft')
  saveDraft(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      listingId: string;
      bookingDates: QuoteInput['bookingDates'];
      extraUnlimitedKm?: boolean;
      extraPrepaidFuel?: boolean;
      extraPrepaidClean?: boolean;
      deliveryEnabled?: boolean;
      introMessage?: string;
    },
  ) {
    return this.assisted.saveDraft(
      req.user.id,
      id,
      body,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Post(':id/invite')
  invite(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { channel: 'sms' | 'email' },
  ) {
    const channel = body.channel === 'email' ? 'email' : 'sms';
    return this.assisted.sendInvite(
      req.user.id,
      id,
      channel,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Post(':id/invite/revoke')
  revoke(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.assisted.revokeInvites(
      req.user.id,
      id,
      clientIpFromRequest(req),
      String(req.headers['user-agent'] ?? ''),
    );
  }

  @Get(':id/audit')
  audit(@Param('id', ParseUUIDPipe) id: string) {
    return this.assisted.listAudit(id);
  }
}
