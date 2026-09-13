import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync, unlinkSync } from 'fs';
import { uploadsSubdir } from '../common/uploads-path';
import { ReqUser } from '../common/req-user.decorator';
import { ListingsService } from './listings.service';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';

/** Keep in sync with mobile `constants/listingMedia.js`. */
const MAX_LISTING_VIDEOS = 1;
const MAX_LISTING_VIDEO_BYTES = 60 * 1024 * 1024;
const VIDEO_MIME_ALLOW = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
]);
const IMAGE_MIME_ALLOW = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function unlinkQuiet(path: string | undefined) {
  if (!path) return;
  try {
    unlinkSync(path);
  } catch {
    /* ignore */
  }
}

@ApiTags('host-listings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('host/listings')
export class HostListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async mine(@ReqUser() user: UserEntity) {
    await this.listings.ensureHost(user);
    const rows = await this.listings.hostList(user.id);
    return rows.map((l) => ({
      ...l.toDetailDto(),
      owned: true,
      active: l.active,
    }));
  }

  @Post()
  async create(@ReqUser() user: UserEntity, @Body() body: Record<string, unknown>) {
    await this.listings.ensureHost(user);
    const listing = await this.listings.create(user.id, body as never);
    const full = await this.listings.findForHost(user.id, listing.id);
    return full.toDetailDto();
  }

  @Patch(':id')
  async patch(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const listing = await this.listings.update(user.id, id, body as never);
    return listing.toDetailDto();
  }

  @Delete(':id')
  async del(@ReqUser() user: UserEntity, @Param('id') id: string) {
    return this.listings.softDelete(user.id, id);
  }

  @Post(':id/publish')
  async publish(@ReqUser() user: UserEntity, @Param('id') id: string) {
    const l = await this.listings.publish(user.id, id, true);
    return l.toDetailDto();
  }

  @Post(':id/unpublish')
  async unpublish(@ReqUser() user: UserEntity, @Param('id') id: string) {
    const l = await this.listings.publish(user.id, id, false);
    return l.toDetailDto();
  }

  @Patch(':id/availability')
  async avail(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @Body() body: { availability: Array<{ start: string; end: string }> },
  ) {
    const listing = await this.listings.update(user.id, id, {
      availability: body.availability ?? [],
    } as never);
    return listing.availability;
  }

  @Get(':id/availability')
  async getAvail(@ReqUser() user: UserEntity, @Param('id') id: string) {
    const listing = await this.listings.findForHost(user.id, id);
    return listing.availability ?? [];
  }

  @Post(':id/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = uploadsSubdir('listings');
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
      // Multer ceiling; videos are re-checked at 60 MB below.
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const mime = String(file.mimetype || '').toLowerCase();
        if (
          IMAGE_MIME_ALLOW.has(mime) ||
          VIDEO_MIME_ALLOW.has(mime) ||
          mime.startsWith('image/') ||
          mime.startsWith('video/')
        ) {
          cb(null, true);
          return;
        }
        cb(
          new BadRequestException(
            'Only JPEG/PNG/WebP photos or MP4/MOV videos are allowed.',
          ) as Error,
          false,
        );
      },
    }),
  )
  async photo(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body?: { mediaType?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Choose a photo or video to upload.');
    }
    const mime = String(file.mimetype || '').toLowerCase();
    const declared = String(body?.mediaType || '').toLowerCase();
    const type: 'image' | 'video' =
      declared === 'video' || mime.startsWith('video/') ? 'video' : 'image';

    if (type === 'video') {
      if (mime && !VIDEO_MIME_ALLOW.has(mime) && !mime.startsWith('video/')) {
        unlinkQuiet(file.path);
        throw new BadRequestException('Use an MP4 or MOV video (up to 1 minute).');
      }
      if (file.size > MAX_LISTING_VIDEO_BYTES) {
        unlinkQuiet(file.path);
        throw new BadRequestException(
          'That video is too large. Use a clip under 60 MB (about 1 minute).',
        );
      }
      const existing = await this.listings.findForHost(user.id, id);
      const videoCount = (existing.photos || []).filter((p: { type?: string; uri?: string }) => {
        if (p?.type === 'video') return true;
        const u = String(p?.uri || '');
        return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(u);
      }).length;
      if (videoCount >= MAX_LISTING_VIDEOS) {
        unlinkQuiet(file.path);
        throw new BadRequestException(
          MAX_LISTING_VIDEOS === 1
            ? 'You can add only 1 video per listing.'
            : `You can add up to ${MAX_LISTING_VIDEOS} videos per listing.`,
        );
      }
    }

    const base =
      this.config.get<string>('PUBLIC_BASE_URL') || `http://127.0.0.1:${Number(process.env.PORT) || 8080}`;
    const uri = `${base.replace(/\/$/, '')}/v1/uploads/listings/${file.filename}`;
    const listing = await this.listings.appendPhoto(user.id, id, uri, { type });
    return { uri, listing: listing.toDetailDto() };
  }
}
