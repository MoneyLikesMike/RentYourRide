import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminGuard } from '../common/admin.guard';
import { ArticleEntity } from '../entities/article.entity';
import { AdminArticlesController } from './admin-articles.controller';
import { ArticlesPublicController } from './articles-public.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleEntity])],
  controllers: [ArticlesPublicController, AdminArticlesController],
  providers: [ArticlesService, AdminGuard],
})
export class ArticlesModule {}
