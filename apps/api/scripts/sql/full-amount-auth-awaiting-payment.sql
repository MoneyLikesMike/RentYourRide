-- Full-amount booking holds, awaiting_payment recovery, 8h pending expiry.
-- Production uses TYPEORM_SYNCHRONIZE=0; apply this script when deploying the feature.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_deadline_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar(128) NOT NULL UNIQUE,
  event_type varchar(128) NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_status_created
  ON bookings (status, created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline
  ON bookings (payment_deadline_at)
  WHERE payment_deadline_at IS NOT NULL;
