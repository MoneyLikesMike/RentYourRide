import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ArticleEntity } from '../entities/article.entity';

export type ArticleDto = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  coverImageUrl: string | null;
  author: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

function toDto(article: ArticleEntity): ArticleDto {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    summary: article.summary,
    body: article.body ?? '',
    coverImageUrl: article.coverImageUrl,
    author: article.author,
    published: article.published,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

export type SaveArticleInput = {
  title?: string;
  slug?: string;
  category?: string;
  summary?: string;
  body?: string;
  coverImageUrl?: string | null;
  author?: string;
  published?: boolean;
};

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly articles: Repository<ArticleEntity>,
  ) {}

  /** Public feed: published only, newest first. */
  async listPublished(limit = 12): Promise<ArticleDto[]> {
    const rows = await this.articles.find({
      where: { published: true },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
    });
    return rows.map(toDto);
  }

  async getPublishedBySlug(slug: string): Promise<ArticleDto> {
    const article = await this.articles.findOne({ where: { slug, published: true } });
    if (!article) throw new NotFoundException('Article not found');
    return toDto(article);
  }

  /** Admin feed: drafts included, newest first. */
  async listAll(): Promise<ArticleDto[]> {
    const rows = await this.articles.find({ order: { createdAt: 'DESC' } });
    return rows.map(toDto);
  }

  async getById(id: string): Promise<ArticleDto> {
    const article = await this.articles.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    return toDto(article);
  }

  async create(input: SaveArticleInput): Promise<ArticleDto> {
    const title = (input.title ?? '').trim();
    const slug = await this.uniqueSlug(input.slug?.trim() || slugify(title));
    const published = input.published ?? false;

    const article = this.articles.create({
      slug,
      title,
      category: input.category?.trim() || 'News',
      summary: input.summary?.trim() ?? '',
      body: input.body ?? '',
      coverImageUrl: input.coverImageUrl ?? null,
      author: input.author?.trim() || 'Rent Your Ride',
      published,
      publishedAt: published ? new Date() : null,
    });

    return toDto(await this.articles.save(article));
  }

  async update(id: string, input: SaveArticleInput): Promise<ArticleDto> {
    const article = await this.articles.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    if (input.title !== undefined) article.title = input.title.trim();
    if (input.category !== undefined) article.category = input.category.trim() || 'News';
    if (input.summary !== undefined) article.summary = input.summary.trim();
    if (input.body !== undefined) article.body = input.body;
    if (input.coverImageUrl !== undefined) article.coverImageUrl = input.coverImageUrl;
    if (input.author !== undefined) article.author = input.author.trim() || 'Rent Your Ride';

    if (input.slug !== undefined) {
      const next = input.slug.trim() || slugify(article.title);
      if (next !== article.slug) article.slug = await this.uniqueSlug(next, id);
    }

    if (input.published !== undefined && input.published !== article.published) {
      article.published = input.published;
      // Keep the original publish date if it's re-published later.
      if (input.published && !article.publishedAt) article.publishedAt = new Date();
    }

    return toDto(await this.articles.save(article));
  }

  async remove(id: string): Promise<void> {
    const result = await this.articles.delete({ id });
    if (!result.affected) throw new NotFoundException('Article not found');
  }

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    const root = base || `article-${Date.now()}`;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
      const clash = await this.articles.findOne({
        where: ignoreId ? { slug: candidate, id: Not(ignoreId) } : { slug: candidate },
      });
      if (!clash) return candidate;
    }
    throw new ConflictException('Could not generate a unique slug');
  }
}
