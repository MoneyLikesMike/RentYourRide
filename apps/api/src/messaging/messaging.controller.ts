import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MessagingService } from './messaging.service';

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}

class FindOrCreateDto {
  @IsString()
  @IsOptional()
  bookingId?: string;
}

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('conversations')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  async list(@Req() req) {
    return this.messaging.listForUser(req.user.id);
  }

  @Get('unread-count')
  async unread(@Req() req) {
    const count = await this.messaging.unreadTotalForUser(req.user.id);
    return { count };
  }

  @Get('booking/:bookingId')
  async forBooking(
    @Req() req,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.messaging.findOrCreateForBooking(req.user.id, bookingId);
  }

  @Post('booking/:bookingId')
  async createForBooking(
    @Req() req,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.messaging.findOrCreateForBooking(req.user.id, bookingId);
  }

  @Get(':id')
  async getOne(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.messaging.getConversationById(req.user.id, id);
  }

  @Get(':id/messages')
  async messages(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query('before') before?: string,
  ) {
    const beforeMs = before ? Number(before) : undefined;
    return this.messaging.listMessages(req.user.id, id, {
      before: Number.isFinite(beforeMs) ? beforeMs : undefined,
      take,
    });
  }

  @Post(':id/messages')
  async send(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SendMessageDto,
  ) {
    return this.messaging.sendMessage(req.user.id, id, body.text);
  }

  @Post(':id/read')
  async read(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.messaging.markRead(req.user.id, id);
  }
}
