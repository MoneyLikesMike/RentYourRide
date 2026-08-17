/**
 * Seeds sample articles into the `articles` table. Safe to re-run: rows are
 * matched on slug and updated in place. Intended for dev/staging only.
 *
 * Usage on the API host:  node seed-articles.js
 */
const { randomUUID } = require('crypto');
const { Client } = require('pg');

const ARTICLES = [
  {
    slug: 'back-with-an-enhanced-experience',
    title: 'Back with an enhanced experience and a promising road ahead',
    category: 'Product',
    author: 'Rent Your Ride',
    publishedAt: '2026-08-12',
    coverImageUrl: '/news/back-better-cover.jpg',
    summary:
      'We’ve been working overtime behind the scenes to enhance our offerings and prioritize an exceptional experience — here’s what’s changed and what’s coming next.',
    body: `We’re back and better than ever! While Rent Your Ride may look the same on the surface, we’ve been working overtime behind the scenes to enhance our offerings and prioritize an exceptional experience. With a renewed focus on delivering the best possible service, we’re eager to reintroduce ourselves to our loyal customers and newcomers alike, all while looking ahead to an exciting future filled with innovative plans.

## Unchanged, Yet Improved

At Rent Your Ride, we prioritize the power of consistency. We recognize that our users love our service for its simplicity, reliability, and affordability, and we have diligently upheld these core principles that made us successful in the first place. Our user-friendly platform remains unchanged, allowing you to effortlessly rent a car from trusted individuals in your local area. Whether you're planning a weekend escape, a memorable family vacation, or a productive business trip, Rent Your Ride is your go-to destination for a seamless experience.

## Putting the Best Experience First

While our foundation remains relatively unchanged, we have taken the opportunity during our time away to focus on enhancing the overall experience for our valued customers. Here are some of the ways we are prioritizing your satisfaction:

1. Streamlined Booking Process: Our revamped booking system ensures an intuitive and efficient experience. With enhanced search filters, detailed vehicle descriptions, and a simplified reservation process, finding your ideal car has never been easier.
2. Enhanced Safety Measures: Your safety is our top priority. We have implemented stringent safety guidelines for all vehicle owners, ensuring that every car listed on Rent Your Ride undergoes a comprehensive inspection. Regular maintenance checks, cleanliness standards, and insurance coverage will provide peace of mind for both hosts and guests.
3. Responsive Customer Service: Our dedicated support team is always ready to assist you. Whether you have a question about a specific vehicle, need assistance with a reservation, or require any other support, we are just a click or a call away. We value your feedback and are committed to providing timely and personalized assistance whenever you need it.

## Exciting New Features on the Horizon

As we continue our journey, we are not only dedicated to the present but also eager about what’s coming. Here's a sneak peek into the exciting developments on the horizon:

- Loyalty Rewards Program — we are working on a loyalty rewards program to express our gratitude to our customers. Earn points with each rental and unlock exclusive perks, such as discounted rates, priority bookings, and additional benefits. Stay tuned for more details on this exciting program.
- Expanded Vehicle Selection — our aim is to provide you with an even more diverse range of vehicle options. In the coming months, we will be expanding our inventory to include a wider selection of cars, including luxury vehicles, electric cars, and specialty vehicles, to cater to all your transportation needs.
- Advanced Booking Features — our commitment to convenience remains unwavering. That's why we're introducing advanced booking features that will simplify the reservation process and make it even more efficient. Stay tuned for updates on how we're making renting a car easier than ever before.

As we reflect on our journey thus far, we want to express our heartfelt gratitude to both our loyal customers and newcomers who have taken a seat along the ride. Your support and trust in Rent Your Ride have been instrumental in shaping our growth and success. We are honored to have you as part of our Rent Your Ride community, and we eagerly anticipate the adventures that lie ahead. Thank you for being a part of our story and allowing us to be a part of yours. Together, let's create unforgettable moments and embrace a future filled with endless possibilities.`,
  },
  {
    slug: 'app-updates-to-improve-your-hosting-experience',
    title: 'App updates to improve your hosting experience',
    category: 'App',
    author: 'Rent Your Ride',
    publishedAt: '2026-07-28',
    coverImageUrl: '/home/exotics.png',
    summary:
      'Faster listing setup, clearer trip requests and payouts you can actually track from your phone.',
    body: `Hosting should not feel like admin work. This release focuses on the moments where hosts told us they were losing the most time.

## Listing a ride in five steps
Setting up a listing is now a short guided flow. Add your vehicle, set your price and availability, upload photos, and you are live.

## Trip requests at a glance
Every incoming request now shows the guest, the dates, the total payout and their verification status on one screen, so you can accept or decline without digging.

- See guest verification before you accept
- Accept or decline in a single tap
- Turn on instant booking to skip approvals entirely

## Payouts you can follow
Your payouts now live in their own section with a clear record of what has been sent and what is still on the way.

If there is something slowing you down as a host, tell us. These changes came almost entirely from host feedback.`,
  },
  {
    slug: 'convenience-by-the-truckload',
    title: 'Convenience by the truckload',
    category: 'Guides',
    author: 'Rent Your Ride',
    publishedAt: '2026-07-09',
    coverImageUrl: '/home/off-road.png',
    summary:
      'Moving a couch, hauling a trailer or heading up north? Here is how to pick the right truck for the job.',
    body: `Renting a truck for a weekend is usually cheaper and far less hassle than borrowing one from a friend who would rather you did not. The trick is matching the vehicle to the job.

## Match the bed to the load
A short bed handles most apartment moves and hardware store runs. If you are carrying full sheets of plywood or long lumber, look for a full size bed or plan on leaving the tailgate down.

## Check the towing details before you book
If you are towing, message the host before you book and confirm:

- The towing capacity and whether a hitch is already fitted
- Whether the wiring harness matches your trailer
- Any mileage limits that apply to the trip

## Think about where you will park it
A full size truck is wonderful on the highway and miserable in a downtown parkade. If your trip involves city parking, factor that in before you fall in love with the biggest option on the list.

## Give yourself a buffer
Loading always takes longer than you think. Book an extra half day rather than rushing the return and paying a late fee.`,
  },
  {
    slug: 'what-insurance-covers-on-a-trip',
    title: 'What insurance actually covers on a Rent Your Ride trip',
    category: 'Insurance',
    author: 'Rent Your Ride',
    publishedAt: '2026-06-21',
    coverImageUrl: '/home/car-protection.png',
    summary:
      'Coverage explained in plain language, so both hosts and guests know exactly where they stand before the keys change hands.',
    body: `Insurance is the part of car sharing people worry about most, usually because it is explained badly. Here is the short version.

## Coverage runs for the length of the trip
Protection applies from the moment the trip starts at check in to the moment it ends at check out. Anything outside that window is not covered, which is why completing check out in the app matters.

## What hosts are protected against
Hosts are covered for physical damage to their vehicle during a trip, subject to the deductible on the plan they selected.

- Collision damage during the trip
- Third party liability while the guest is driving
- A documented photo record from check in and check out

## What guests need to know
Guests are responsible for the deductible if there is damage, and for anything that falls outside the policy, such as driving outside the permitted area or letting an unapproved driver take the wheel.

## Coverage varies by province
Manitoba and Saskatchewan have different public insurance arrangements, so the details differ depending on where the vehicle is registered. Check the insurance page for the specifics that apply to your province.

If anything here is unclear for your situation, message us before your trip rather than after.`,
  },
  {
    slug: 'five-tips-to-get-your-ride-booked-faster',
    title: 'Five tips to get your ride booked faster',
    category: 'Hosting',
    author: 'Rent Your Ride',
    publishedAt: '2026-06-02',
    coverImageUrl: '/home/everyday-rides.png',
    summary:
      'Small changes to your listing that make a real difference to how often it gets picked.',
    body: `Two nearly identical vehicles on the same street can get very different booking rates. The difference is almost always the listing.

## Lead with a clean, bright photo
Your first photo decides whether anyone taps through. Wash the car, shoot it outside in daylight from a front three quarter angle, and keep the background uncluttered.

## Price against your street, not the country
Look at what comparable vehicles nearby are charging. Starting slightly below the local average for your first few trips builds reviews quickly, and reviews are what let you raise your price later.

## Write a description that answers questions
The best descriptions pre-empt the things guests message about:

- Where pickup happens and how parking works
- Fuel type and whether there are mileage limits
- Anything unusual about the vehicle, good or bad

## Keep your calendar honest
Nothing kills a listing faster than declining requests because the dates were not actually free. An accurate calendar means every request you get is one you want.

## Turn on instant booking
Guests overwhelmingly choose rides they can book immediately. If you are comfortable with it, instant booking is the single biggest lever you have.`,
  },
];

async function main() {
  // RDS presents a chain pg won't verify by default; drop any sslmode from the
  // URL so the explicit ssl option below wins.
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete('sslmode');

  const client = new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  for (const article of ARTICLES) {
    const publishedAt = new Date(`${article.publishedAt}T12:00:00Z`).toISOString();
    const result = await client.query(
      `INSERT INTO articles
         (id, slug, title, category, summary, body, cover_image_url, author, published, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9::timestamptz, $9::timestamp, now())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         summary = EXCLUDED.summary,
         body = EXCLUDED.body,
         cover_image_url = EXCLUDED.cover_image_url,
         author = EXCLUDED.author,
         published = true,
         published_at = EXCLUDED.published_at,
         updated_at = now()
       RETURNING slug`,
      [
        randomUUID(),
        article.slug,
        article.title,
        article.category,
        article.summary,
        article.body,
        article.coverImageUrl,
        article.author,
        publishedAt,
      ],
    );
    console.log(`seeded: ${result.rows[0].slug}`);
  }

  const { rows } = await client.query(
    'SELECT count(*)::int AS total FROM articles WHERE published = true',
  );
  console.log(`published articles: ${rows[0].total}`);
  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
