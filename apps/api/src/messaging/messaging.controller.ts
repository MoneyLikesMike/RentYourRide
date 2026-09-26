import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { diskStorage } from 'multer';
import { mkdirSync, unlinkSync } from 'fs';
import { uploadsSubdir } from '../common/uploads-path';
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

const CHAT_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024;

function unlinkQuiet(path: string | undefined) {
  if (!path) return;
  try {
    unlinkSync(path);
  } catch {
    /* ignore */
  }
}

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('conversations')
export class MessagingController {
  constructor(
    private readonly messaging: MessagingService,
    private readonly config: ConfigService,
  ) {}

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

  /** Post-accept photo. Locked while booking is pending_host / declined / cancelled. */
  @Post(':id/messages/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = uploadsSubdir('chat');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = file.originalname.includes('.')
            ? file.originalname.split('.').pop()
            : 'jpg';
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
        },
      }),
      limits: { fileSize: MAX_CHAT_IMAGE_BYTES },
      fileFilter: (_req, file, cb) => {
        const mime = String(file.mimetype || '').toLowerCase();
        if (CHAT_IMAGE_MIME.has(mime) || mime.startsWith('image/')) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException('Only JPEG, PNG, or WebP photos are allowed.') as Error, false);
      },
    }),
  )
  async sendPhoto(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Choose a photo to send.');
    }
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      unlinkQuiet(file.path);
      throw new BadRequestException('Photo must be under 10 MB.');
    }
    const base =
      this.config.get<string>('PUBLIC_BASE_URL') ||
      `http://127.0.0.1:${Number(process.env.PORT) || 8080}`;
    const uri = `${base.replace(/\/$/, '')}/v1/uploads/chat/${file.filename}`;
    try {
      return await this.messaging.sendImageMessage(req.user.id, id, uri);
    } catch (err) {
      unlinkQuiet(file.path);
      throw err;
    }
  }

  @Post(':id/read')
  async read(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.messaging.markRead(req.user.id, id);
  }
}
