import { useEffect } from 'react';

export const SITE_ORIGIN = 'https://www.rentyourride.ca';

const DEFAULT_IMAGE = `${SITE_ORIGIN}/apple-touch-icon.png`;
const DEFAULT_DESCRIPTION =
  'Rent Your Ride is Canada’s peer-to-peer car rental marketplace. Rent vehicles from local hosts, or list your ride and start earning.';

type Props = {
  title: string;
  description?: string;
  canonical?: string;
  /** Absolute URL for og:image / twitter:image. Falls back to the brand icon. */
  image?: string;
  /** Keep the page out of search results (account, checkout, auth surfaces). */
  noindex?: boolean;
  /** Optional JSON-LD object or @graph payload (injected as application/ld+json). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

const JSON_LD_ATTR = 'data-ryr-page-jsonld';

function upsertMeta(
  attr: 'name' | 'property',
  key: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Sets document title + description/OG/robots tags for the current route. */
export default function PageMeta({
  title,
  description,
  canonical,
  image,
  noindex,
  jsonLd,
}: Props) {
  useEffect(() => {
    document.title = title;
    upsertMeta('property', 'og:title', title);
    upsertMeta('name', 'twitter:title', title);

    const copy = description ?? DEFAULT_DESCRIPTION;
    upsertMeta('name', 'description', copy);
    upsertMeta('property', 'og:description', copy);
    upsertMeta('name', 'twitter:description', copy);

    const shareImage = image ?? DEFAULT_IMAGE;
    upsertMeta('property', 'og:image', shareImage);
    upsertMeta('name', 'twitter:image', shareImage);

    // Private surfaces must never rank; everything else re-asserts indexability
    // because these tags persist across client-side navigation.
    upsertMeta(
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    );

    if (canonical) {
      upsertLink('canonical', canonical);
      upsertMeta('property', 'og:url', canonical);
    } else {
      // Never leave the previous route's canonical pointing at this page.
      document.head.querySelector('link[rel="canonical"]')?.remove();
    }

    document.head
      .querySelectorAll(`script[${JSON_LD_ATTR}]`)
      .forEach((node) => node.remove());

    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(JSON_LD_ATTR, 'true');
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.head
        .querySelectorAll(`script[${JSON_LD_ATTR}]`)
        .forEach((node) => node.remove());
    };
  }, [title, description, canonical, image, noindex, jsonLd]);

  return null;
}

/** Breadcrumb JSON-LD so Google shows "Home › Page" instead of a raw URL. */
export function breadcrumbLd(
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map(
      (crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: `${SITE_ORIGIN}${crumb.path}`,
      }),
    ),
  };
}

export const HOME_SEO = {
  title: 'Rent Your Ride | Peer to Peer Car Rentals | Canada',
  description: DEFAULT_DESCRIPTION,
  canonical: `${SITE_ORIGIN}/`,
} as const;
