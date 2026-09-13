import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';

@ApiTags('articles')
@Controller('articles')
export class ArticlesPublicController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.articles.listPublished(Number.isFinite(parsed) ? parsed : 12);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.articles.getPublishedBySlug(slug);
  }
}
