-- RYRA-422: tables for confirmed-trip cancel host notify.
-- Prod runs with TYPEORM_SYNCHRONIZE=0. Apply before the API that writes these tables.
-- Does not change the SMS spend cap (RYRA-408).

CREATE TABLE IF NOT EXISTS notification_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  event varchar(64) NOT NULL,
  channel varchar(16) NOT NULL,
  status varchar(16) NOT NULL,
  reason varchar(64),
  listing_id uuid,
  host_member_id uuid,
  guest_member_id uuid,
  stripe_refund_id varchar(128),
  detail jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_dispatch_log_booking
  ON notification_dispatch_log (booking_id);

CREATE TABLE IF NOT EXISTS notification_dispatch_claim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  event varchar(64) NOT NULL,
  channel varchar(16) NOT NULL,
  status varchar(16) NOT NULL,
  reason varchar(64),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_dispatch_claim UNIQUE (booking_id, event, channel)
);

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type varchar(64) NOT NULL,
  title varchar(160) NOT NULL,
  body text NOT NULL,
  booking_id uuid,
  listing_id uuid,
  dedupe_key varchar(192) NOT NULL,
  read_at timestamptz,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_in_app_notifications_dedupe UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user
  ON in_app_notifications (user_id);

CREATE TABLE IF NOT EXISTS sms_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key varchar(192) NOT NULL,
  phone varchar(40) NOT NULL,
  body text NOT NULL,
  booking_id uuid NOT NULL,
  event varchar(64) NOT NULL,
  failure_kind varchar(32) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  next_retry_at timestamptz NOT NULL,
  admin_alerted_at timestamptz,
  exhausted_alerted_at timestamptz,
  listing_id uuid,
  host_member_id uuid,
  guest_member_id uuid,
  stripe_refund_id varchar(128),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_sms_outbox_dedupe UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_sms_outbox_booking ON sms_outbox (booking_id);
