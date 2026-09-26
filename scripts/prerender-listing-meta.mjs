#!/usr/bin/env node
// Writes dist/find-your-car/<id>/index.html for every published listing: the
// SPA shell with listing-specific <title>, description, canonical, Open Graph
// and Twitter tags, so shared links (app share sheet, texts, social) preview
// the car instead of the generic homepage card. The SPA still boots normally.
//
// Requires nginx `try_files $uri $uri/index.html /index.html;` on the web box.
// Listings published after a deploy fall back to the generic shell until the
// next web deploy.
//
//   node scripts/prerender-listing-meta.mjs <dist-dir> [apiOrigin] [siteOrigin]
//
// Best-effort: if the API is unreachable nothing is written and the deploy continues.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const distDir = process.argv[2] || 'apps/web/dist';
const apiOrigin = (process.argv[3] || 'https://backend.rentyourride.ca').replace(/\/$/, '');
const siteOrigin = (process.argv[4] || 'https://www.rentyourride.ca').replace(/\/$/, '');

const VIDEO_RE = /\.(mp4|mov|m4v|webm)(\?|$)/i;
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function money(n) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function vehicleName(listing) {
  const vd = listing.vehicleData || {};
  const parts = [vd.year, vd.make, vd.model].map((p) => String(p ?? '').trim()).filter(Boolean);
  return parts.length >= 2 ? parts.join(' ') : String(listing.title || 'Car').trim();
}

function coverImage(listing) {
  for (const p of listing.photos || []) {
    const url = (p && (p.uri || p.url)) || (typeof p === 'string' ? p : '');
    if (!url || p?.type === 'video' || VIDEO_RE.test(url)) continue;
    return url;
  }
  return null;
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function renderListingHtml(shell, listing) {
  const name = vehicleName(listing);
  const city = String(listing.city || '').trim();
  const url = `${siteOrigin}/find-your-car/${listing.id}`;
  const title = `Rent a ${name}${city ? ` in ${city}` : ''} | Rent Your Ride`;
  const description = `${name}${city ? ` in ${city}` : ''} from ${money(listing.pricePerDay)}/day on Rent Your Ride. Book directly with a local host.`;
  const image = coverImage(listing);

  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(title)}</title>`)
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeAttr(url)}" />`,
    );
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'property', 'og:type', 'product');
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  if (image) {
    html = setMeta(html, 'property', 'og:image', image);
    html = setMeta(html, 'property', 'og:image:alt', name);
    html = setMeta(html, 'name', 'twitter:image', image);
  }
  return html;
}

async function main() {
  const shell = await readFile(join(distDir, 'index.html'), 'utf8');
  let listings;
  try {
    const res = await fetch(`${apiOrigin}/v1/listings/search`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    listings = await res.json();
  } catch (err) {
    console.warn(`listing meta: skipped (${err.message})`);
    return;
  }

  let written = 0;
  for (const listing of Array.isArray(listings) ? listings : []) {
    if (!listing?.id || !ID_RE.test(String(listing.id))) continue;
    const dir = join(distDir, 'find-your-car', String(listing.id));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), renderListingHtml(shell, listing));
    written += 1;
  }
  console.log(`listing meta: ${written} listing pages`);
}

main().catch((err) => {
  console.warn(`listing meta: failed (${err.message})`);
});
