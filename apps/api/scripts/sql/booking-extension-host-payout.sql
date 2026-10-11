-- Host fee 25% + extension payouts: store the extension charge and its scheduled host payout.
-- Prod runs with TYPEORM_SYNCHRONIZE=0. Apply before the API that writes these columns.

ALTER TABLE booking_extensions
  ADD COLUMN IF NOT EXISTS stripe_charge_id varchar(128),
  ADD COLUMN IF NOT EXISTS host_payout_status varchar(16),
  ADD COLUMN IF NOT EXISTS host_payout_cents integer,
  ADD COLUMN IF NOT EXISTS host_payout_scheduled_at timestamp,
  ADD COLUMN IF NOT EXISTS host_transfer_id varchar(128);

CREATE INDEX IF NOT EXISTS idx_booking_extensions_host_payout_status
  ON booking_extensions (host_payout_status)
  WHERE host_payout_status IS NOT NULL;
