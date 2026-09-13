import { apiFetch } from './http';

export interface Article {
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
}

export async function listArticles(limit = 12): Promise<Article[]> {
  return apiFetch<Article[]>(`v1/articles?limit=${limit}`, {
    method: 'GET',
    auth: false,
  });
}

export async function getArticle(slug: string): Promise<Article> {
  return apiFetch<Article>(`v1/articles/${encodeURIComponent(slug)}`, {
    method: 'GET',
    auth: false,
  });
}
