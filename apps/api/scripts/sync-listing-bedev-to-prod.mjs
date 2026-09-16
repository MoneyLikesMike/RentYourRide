#!/usr/bin/env node
/**
 * Copy a published listing from bedev HTTP API into prod rentyourride_v2.
 * Remaps host_user_id by host email.
 *
 *   BEDEV_BASE=https://bedev.rentyourride.ca \
 *   LISTING_ID=a8fa1aba-f3a7-4692-9138-3494896518b0 \
 *   node scripts/sync-listing-bedev-to-prod.mjs
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const BEDEV_BASE = (process.env.BEDEV_BASE || 'https://bedev.rentyourride.ca').replace(/\/$/, '');
const LISTING_ID = process.env.LISTING_ID || process.argv[2];
const PROD_ENV = process.env.PROD_ENV_PATH || '/home/ec2-user/ryrbs/production.env';
const PROD_DB = process.env.NEST_DATABASE || 'rentyourride_v2';
const DRY_RUN = process.argv.includes('--dry-run');

if (!LISTING_ID) {
  console.error('Usage: LISTING_ID=<uuid> node sync-listing-bedev-to-prod.mjs');
  process.exit(1);
}

function parseEnvFile(path) {
  const text = readFileSync(path, 'utf8');
  const get = (key) => {
    const m = text.match(new RegExp(`${key}\\s*=\\s*([^\\n]+)`));
    return m ? m[1].trim() : '';
  };
  return {
    host: get('TYPEORM_HOST'),
    port: Number(get('TYPEORM_PORT') || 5432),
    user: get('TYPEORM_USERNAME'),
    password: get('TYPEORM_PASSWORD'),
  };
}

const res = await fetch(`${BEDEV_BASE}/v1/listings/${encodeURIComponent(LISTING_ID)}`, {
  headers: { Accept: 'application/json' },
});
if (!res.ok) {
  console.error('Failed to fetch listing from bedev:', res.status, await res.text());
  process.exit(1);
}
const listing = await res.json();
const hostEmail = String(listing.hostEmail || '').trim().toLowerCase();
if (!hostEmail) {
  console.error('Listing has no hostEmail — cannot remap host on prod');
  process.exit(1);
}

const db = parseEnvFile(PROD_ENV);
const client = new Client({
  ...db,
  database: PROD_DB,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows: users } = await client.query(
  'SELECT id FROM users WHERE lower(email) = $1 LIMIT 1',
  [hostEmail],
);
const prodHostId = users[0]?.id;
if (!prodHostId) {
  console.error(`No prod user for ${hostEmail}`);
  await client.end();
  process.exit(1);
}

const params = [
  listing.id,
  prodHostId,
  listing.city,
  listing.title,
  listing.description || null,
  listing.vehicleType || 'SEDAN',
  JSON.stringify(listing.photos || []),
  String(listing.pricePerDay ?? 0),
  listing.weeklyDiscount || null,
  listing.monthlyDiscount || null,
  listing.deliveryPrice != null ? String(listing.deliveryPrice) : null,
  listing.dailyKm || null,
  !!listing.instantBooking,
  listing.latitude ?? null,
  listing.longitude ?? null,
  listing.pickupAddress,
  listing.active !== false,
  listing.published !== false,
  listing.vin || null,
  JSON.stringify(listing.carFeatures || []),
  JSON.stringify(listing.extras || {}),
  JSON.stringify(listing.availability || []),
  listing.hostTrips ?? 0,
  String(listing.hostRating ?? 5),
  JSON.stringify(listing.guestReviews || []),
  listing.licensePlate || null,
  listing.licenseProvince || null,
  JSON.stringify(listing.vehicleData || null),
];

console.log(
  JSON.stringify({
    listingId: listing.id,
    title: listing.title,
    city: listing.city,
    hostEmail,
    prodHostId,
    dryRun: DRY_RUN,
  }),
);

if (DRY_RUN) {
  await client.end();
  process.exit(0);
}

await client.query(
  `INSERT INTO listings (
    id, host_user_id, city, title, description, vehicle_type, photos,
    price_per_day, weekly_discount, monthly_discount, delivery_price, daily_km,
    instant_booking, latitude, longitude, pickup_address, active, published, vin,
    car_features, extras, availability, host_trips, host_rating, guest_reviews,
    license_plate, license_province, "vehicleData", created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7::jsonb,
    $8, $9, $10, $11, $12,
    $13, $14, $15, $16, $17, $18, $19,
    $20::jsonb, $21::jsonb, $22::jsonb, $23, $24, $25::jsonb,
    $26, $27, $28::jsonb, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    host_user_id = EXCLUDED.host_user_id,
    city = EXCLUDED.city,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    vehicle_type = EXCLUDED.vehicle_type,
    photos = EXCLUDED.photos,
    price_per_day = EXCLUDED.price_per_day,
    weekly_discount = EXCLUDED.weekly_discount,
    monthly_discount = EXCLUDED.monthly_discount,
    delivery_price = EXCLUDED.delivery_price,
    daily_km = EXCLUDED.daily_km,
    instant_booking = EXCLUDED.instant_booking,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    pickup_address = EXCLUDED.pickup_address,
    active = EXCLUDED.active,
    published = EXCLUDED.published,
    vin = EXCLUDED.vin,
    car_features = EXCLUDED.car_features,
    extras = EXCLUDED.extras,
    availability = EXCLUDED.availability,
    host_trips = EXCLUDED.host_trips,
    host_rating = EXCLUDED.host_rating,
    guest_reviews = EXCLUDED.guest_reviews,
    license_plate = EXCLUDED.license_plate,
    license_province = EXCLUDED.license_province,
    "vehicleData" = EXCLUDED."vehicleData",
    updated_at = NOW()`,
  params,
);

const { rows: check } = await client.query(
  'SELECT id, city, title, published, active FROM listings WHERE id = $1',
  [listing.id],
);
console.log('PROD_LISTING', JSON.stringify(check[0]));
await client.end();
