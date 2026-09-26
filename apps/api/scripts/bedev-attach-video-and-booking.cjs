#!/usr/bin/env node
/**
 * Bedev test helper: attach listing video + create pending_host booking.
 * Env: FILENAME (uploaded under uploads/listings), LISTING_ID optional.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), '.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const listingId =
  process.env.LISTING_ID || 'eb21dde3-8be6-49ee-90bb-a17139a93fff';
const filename = process.env.FILENAME;
if (!filename) {
  console.error('FILENAME required');
  process.exit(1);
}

(async () => {
  const connectionString = env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, '').replace(
    /\?$/,
    '',
  );
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const base = (env.PUBLIC_BASE_URL || 'https://bedev.rentyourride.ca').replace(
    /\/$/,
    '',
  );
  const videoUri = `${base}/v1/uploads/listings/${filename}`;

  const listingRes = await client.query(
    `SELECT id, host_user_id, photos, title, city, pickup_address, price_per_day
     FROM listings WHERE id = $1`,
    [listingId],
  );
  if (!listingRes.rows.length) throw new Error('listing not found');
  const row = listingRes.rows[0];

  let photos = Array.isArray(row.photos) ? row.photos : [];
  photos = photos.filter((p) => !(p && p.type === 'video'));
  photos = [{ uri: videoUri, type: 'video' }, ...photos];
  await client.query(`UPDATE listings SET photos = $1::jsonb WHERE id = $2`, [
    JSON.stringify(photos),
    listingId,
  ]);
  console.log('VIDEO_ATTACHED', videoUri);

  const guestRes = await client.query(
    `SELECT id, email FROM users WHERE lower(email) = lower($1)`,
    ['mike_moe120@hotmail.com'],
  );
  if (!guestRes.rows.length) throw new Error('guest not found');
  const guestId = guestRes.rows[0].id;
  const hostId = row.host_user_id;
  if (guestId === hostId) throw new Error('guest cannot book own listing');

  const start = Date.now() + 3 * 86400000;
  const end = start + 2 * 86400000;
  const bookingId = crypto.randomUUID();
  const cover =
    (photos.find((p) => p.type !== 'video') || photos[0] || {}).uri || null;
  const snapshot = {
    id: listingId,
    title: row.title,
    city: row.city,
    pickupAddress: row.pickup_address,
    pricePerDay: row.price_per_day,
    coverUri: cover,
    photos,
  };
  const dayRate = Number(row.price_per_day) || 65;
  const pricing = {
    pricePerDay: dayRate,
    days: 2,
    subtotal: dayRate * 2,
    tripFee: 20,
    grandTotal: dayRate * 2 + 20,
    hostReceiveTotal: dayRate * 2,
  };
  const intro =
    'Test request — please approve so we can verify chat photos + listing video.';

  await client.query(
    `INSERT INTO bookings (
      id, guest_user_id, host_user_id, listing_id, status, instant_booking,
      listing_snapshot, booking_dates, pickup_address, dropoff_address,
      delivery_enabled, extras, intro_message, pricing, lifecycle,
      idempotency_key, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,'pending_host', false,
      $5::jsonb, $6::jsonb, $7, $7,
      false, '[]'::jsonb, $8, $9::jsonb, '{}'::jsonb,
      $10, NOW(), NOW()
    )`,
    [
      bookingId,
      guestId,
      hostId,
      listingId,
      JSON.stringify(snapshot),
      JSON.stringify({ start, end }),
      row.pickup_address || row.city || 'Winnipeg',
      intro,
      JSON.stringify(pricing),
      `test-video-chat-${bookingId}`,
    ],
  );

  const convId = crypto.randomUUID();
  await client.query(
    `INSERT INTO conversations (
      id, booking_id, guest_user_id, host_user_id,
      last_message_at, last_message_preview, guest_last_read_at,
      created_at, updated_at
    ) VALUES ($1,$2,$3,$4, NOW(), $5, NOW(), NOW(), NOW())`,
    [
      convId,
      bookingId,
      guestId,
      hostId,
      'Trip request sent. The host will respond shortly.',
    ],
  );
  await client.query(
    `INSERT INTO messages (id, conversation_id, sender_user_id, type, text, metadata, created_at)
     VALUES (gen_random_uuid(), $1, null, 'system', $2, $3::jsonb, NOW())`,
    [
      convId,
      'Trip request sent. The host will respond shortly.',
      JSON.stringify({ bookingStatus: 'pending_host' }),
    ],
  );
  await client.query(
    `INSERT INTO messages (id, conversation_id, sender_user_id, type, text, metadata, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'text', $3, null, NOW())`,
    [convId, guestId, intro],
  );

  console.log(
    JSON.stringify(
      {
        listingId,
        videoUri,
        bookingId,
        conversationId: convId,
        guest: guestRes.rows[0].email,
        status: 'pending_host',
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      },
      null,
      2,
    ),
  );
  await client.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
