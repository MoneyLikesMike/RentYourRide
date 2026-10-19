-- RYRA-485: host_payout_accounts + stripe_webhook_events (prod synchronize=0).
-- Backfill rows via API HostPayoutAccountsService.backfillFromUsers or admin resync.

CREATE TABLE IF NOT EXISTS host_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id varchar(128) NOT NULL UNIQUE,
  account_kind varchar(16) NOT NULL,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  transfers_capability varchar(32) NULL,
  currently_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  past_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  eventually_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_verification jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  disabled_reason varchar(128) NULL,
  current_deadline timestamptz NULL,
  future_requirements jsonb NULL,
  last_synced_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_payout_accounts_last_synced
  ON host_payout_accounts (last_synced_at);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar(128) NOT NULL UNIQUE,
  event_type varchar(128) NOT NULL,
  stripe_account varchar(128) NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
