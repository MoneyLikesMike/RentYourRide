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
// Cover photos are resized to dist/og/listing-<id>.jpg (1200x630) because
// WhatsApp and other messengers drop multi-MB originals.
//
//   node scripts/prerender-listing-meta.mjs <dist-dir> [apiOrigin] [siteOrigin]
//
// Best-effort: if the API is unreachable nothing is written and the deploy continues.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = process.argv[2] || 'apps/web/dist';
const apiOrigin = (process.argv[3] || 'https://backend.rentyourride.ca').replace(/\/$/, '');
const siteOrigin = (process.argv[4] || 'https://www.rentyourride.ca').replace(/\/$/, '');

const VIDEO_RE = /\.(mp4|mov|m4v|webm)(\?|$)/i;
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

function loadSharp() {
  const webPkg = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/web/package.json');
  try {
    return createRequire(webPkg)('sharp');
  } catch {
    return null;
  }
}

async function writeOgImage(sharp, sourceUrl, outFile) {
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  await sharp(input)
    .rotate()
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(outFile);
}

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

/** `image` is either a resized og card ({ url, width, height }) or the raw cover URL. */
function renderListingHtml(shell, listing, image) {
  const name = vehicleName(listing);
  const city = String(listing.city || '').trim();
  const url = `${siteOrigin}/find-your-car/${listing.id}`;
  const title = `Rent a ${name}${city ? ` in ${city}` : ''} | Rent Your Ride`;
  const description = `${name}${city ? ` in ${city}` : ''} from ${money(listing.pricePerDay)}/day on Rent Your Ride. Book directly with a local host.`;

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
    const imageUrl = typeof image === 'string' ? image : image.url;
    html = setMeta(html, 'property', 'og:image', imageUrl);
    html = setMeta(html, 'property', 'og:image:alt', name);
    html = setMeta(html, 'name', 'twitter:image', imageUrl);
    if (typeof image === 'string') {
      html = html.replace(/\s*<meta\s+property="og:image:(width|height)"\s+content="[^"]*"\s*\/?>/gi, '');
    } else {
      html = setMeta(html, 'property', 'og:image:width', String(image.width));
      html = setMeta(html, 'property', 'og:image:height', String(image.height));
    }
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

  const sharp = loadSharp();
  if (!sharp) console.warn('listing meta: sharp unavailable, using original cover photos');
  const ogDir = join(distDir, 'og');
  await mkdir(ogDir, { recursive: true });

  let written = 0;
  let resized = 0;
  for (const listing of Array.isArray(listings) ? listings : []) {
    if (!listing?.id || !ID_RE.test(String(listing.id))) continue;
    const id = String(listing.id);
    const cover = coverImage(listing);
    let image = cover;
    if (cover && sharp) {
      const file = `listing-${id}.jpg`;
      try {
        await writeOgImage(sharp, cover, join(ogDir, file));
        image = { url: `${siteOrigin}/og/${file}`, width: OG_WIDTH, height: OG_HEIGHT };
        resized += 1;
      } catch (err) {
        console.warn(`listing meta: og image for ${id} failed (${err.message})`);
      }
    }
    const dir = join(distDir, 'find-your-car', id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), renderListingHtml(shell, listing, image));
    written += 1;
  }
  console.log(`listing meta: ${written} listing pages, ${resized} resized og images`);
}

main().catch((err) => {
  console.warn(`listing meta: failed (${err.message})`);
});
