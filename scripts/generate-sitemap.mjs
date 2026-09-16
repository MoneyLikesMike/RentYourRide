#!/usr/bin/env node
// Builds dist/sitemap.xml from the static marketing routes plus whatever
// listings and articles the API is currently publishing.
//
//   node scripts/generate-sitemap.mjs <dist-dir> [apiOrigin] [siteOrigin]
//
// Dynamic URLs are best-effort: if the API is unreachable the static routes
// are still written so a deploy is never blocked by sitemap generation.

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const distDir = process.argv[2] || 'apps/web/dist';
const apiOrigin = (
  process.argv[3] ||
  process.env.VITE_API_ORIGIN ||
  'https://backend.rentyourride.ca'
).replace(/\/$/, '');
const siteOrigin = (
  process.argv[4] ||
  process.env.SITE_ORIGIN ||
  'https://www.rentyourride.ca'
).replace(/\/$/, '');

const today = new Date().toISOString().slice(0, 10);

const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/find-your-car', changefreq: 'daily', priority: '0.9' },
  { path: '/how-it-works', changefreq: 'monthly', priority: '0.8' },
  { path: '/download', changefreq: 'monthly', priority: '0.8' },
  { path: '/learn', changefreq: 'monthly', priority: '0.8' },
  { path: '/news', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/insurance', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/terms-conditions', changefreq: 'yearly', priority: '0.4' },
];

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}

async function fetchJson(path) {
  const res = await fetch(`${apiOrigin}/${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

async function dynamicUrls() {
  const urls = [];

  try {
    const listings = await fetchJson('v1/listings/search');
    for (const listing of Array.isArray(listings) ? listings : []) {
      if (!listing?.id) continue;
      urls.push({
        path: `/find-your-car/${listing.id}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: today,
      });
    }
    console.log(`sitemap: ${urls.length} listing URLs`);
  } catch (err) {
    console.warn(`sitemap: skipping listings (${err.message})`);
  }

  try {
    const articles = await fetchJson('v1/articles?limit=200');
    let count = 0;
    for (const article of Array.isArray(articles) ? articles : []) {
      if (!article?.slug || article.published === false) continue;
      urls.push({
        path: `/news/${article.slug}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: (article.updatedAt || article.publishedAt || today).slice(0, 10),
      });
      count += 1;
    }
    console.log(`sitemap: ${count} article URLs`);
  } catch (err) {
    console.warn(`sitemap: skipping articles (${err.message})`);
  }

  return urls;
}

const entries = [
  ...STATIC_ROUTES.map((route) => ({ ...route, lastmod: today })),
  ...(await dynamicUrls()),
];

const body = entries
  .map(
    ({ path, lastmod, changefreq, priority }) =>
      [
        '  <url>',
        `    <loc>${escapeXml(siteOrigin + path)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n'),
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const outFile = join(distDir, 'sitemap.xml');
await writeFile(outFile, xml, 'utf8');
console.log(`sitemap: wrote ${entries.length} URLs → ${outFile}`);
