export type NewsUpdate = {
  id: string;
  /** ISO date — used for ordering and the displayed date. */
  date: string;
  category: string;
  title: string;
  summary: string;
  /** Cover image shown on the card. Falls back to a branded panel when absent. */
  image?: string;
  author?: string;
  /** Optional link out (blog post, store listing, announcement). */
  href?: string;
};

export const NEWS_DEFAULT_AUTHOR = 'Rent Your Ride';

/** Newest first. Add an entry here to publish it on /learn. */
export const NEWS_UPDATES: NewsUpdate[] = [
  {
    id: 'live-chat',
    date: '2026-08-09',
    category: 'Support',
    title: 'Live chat is now on the website',
    summary:
      'Have a question mid-booking? Chat with our support team directly from any page — we’re here 24/7.',
    image: '/person-driving-car.jpg',
    href: '/contact',
  },
  {
    id: 'new-website',
    date: '2026-08-01',
    category: 'Product',
    title: 'A brand new Rent Your Ride website',
    summary:
      'Faster search, a cleaner booking flow and a refreshed look across every page, built to match the app.',
    image: '/home/how-it-works-cover.jpg',
  },
  {
    id: 'app-update',
    date: '2026-07-15',
    category: 'App',
    title: 'The app got an update',
    summary:
      'Rent Your Ride for iPhone and Android brings a smoother check in and check out experience for every trip.',
    image: '/home/exotics.png',
    href: 'https://apps.apple.com/us/app/rent-your-ride/id1495074000',
  },
];

export function formatNewsDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatNewsDateShort(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
