import { useEffect, useState } from 'react';
import { listArticles, type Article } from '../api/articles';
import { NEWS_UPDATES, type NewsUpdate } from './newsUpdates';

export function articleToNewsUpdate(article: Article): NewsUpdate {
  const iso = article.publishedAt ?? article.createdAt;
  return {
    id: article.id,
    date: iso.slice(0, 10),
    category: article.category,
    title: article.title,
    summary: article.summary,
    image: article.coverImageUrl ?? undefined,
    author: article.author,
    href: `/news/${article.slug}`,
  };
}

/**
 * Published articles from the API, falling back to the bundled list so the
 * section is never empty (first load, API down, nothing published yet).
 */
export function useNewsFeed(limit = 6): NewsUpdate[] {
  const [items, setItems] = useState<NewsUpdate[]>(NEWS_UPDATES);

  useEffect(() => {
    let active = true;
    listArticles(limit)
      .then((articles) => {
        if (!active || articles.length === 0) return;
        setItems(articles.map(articleToNewsUpdate));
      })
      .catch(() => {
        /* keep the bundled fallback */
      });
    return () => {
      active = false;
    };
  }, [limit]);

  return items;
}
