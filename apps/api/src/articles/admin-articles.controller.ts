import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { AdminGuard } from '../common/admin.guard';
import { uploadsSubdir } from '../common/uploads-path';
import { ArticlesService } from './articles.service';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

@ApiTags('admin/articles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list() {
    return this.articles.listAll();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.articles.getById(id);
  }

  @Post()
  create(@Body() body: CreateArticleDto) {
    return this.articles.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateArticleDto) {
    return this.articles.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.articles.remove(id);
  }

  @Post('cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = uploadsSubdir('articles');
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
  uploadCover(@UploadedFile() file: Express.Multer.File) {
    const base =
      this.config.get<string>('PUBLIC_BASE_URL') ||
      `http://127.0.0.1:${Number(process.env.PORT) || 8080}`;
    return { url: `${base.replace(/\/$/, '')}/v1/uploads/articles/${file.filename}` };
  }
}
