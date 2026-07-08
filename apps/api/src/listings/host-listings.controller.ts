import {
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
import { join } from 'path';
import { mkdirSync } from 'fs';
import { ReqUser } from '../common/req-user.decorator';
import { ListingsService } from './listings.service';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';

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
          const dir = join(process.cwd(), 'uploads', 'listings');
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
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  async photo(
    @ReqUser() user: UserEntity,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const base =
      this.config.get<string>('PUBLIC_BASE_URL') || `http://127.0.0.1:${Number(process.env.PORT) || 8080}`;
    const uri = `${base.replace(/\/$/, '')}/v1/uploads/listings/${file.filename}`;
    const listing = await this.listings.appendPhoto(user.id, id, uri);
    return { uri, listing: listing.toDetailDto() };
  }
}
