-- Assisted "Finish your booking" leads (Facebook Marketplace).
-- Production uses TYPEORM_SYNCHRONIZE=0; apply this script when deploying.

CREATE TABLE IF NOT EXISTS assisted_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_staff_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  email varchar(320) NULL,
  phone varchar(40) NULL,
  notes text NULL,
  source varchar(64) NOT NULL DEFAULT 'facebook_marketplace',
  status varchar(24) NOT NULL DEFAULT 'open',
  linked_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assisted_booking_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES assisted_leads(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  booking_dates jsonb NOT NULL,
  extras jsonb NULL,
  delivery_enabled boolean NOT NULL DEFAULT false,
  intro_message text NULL,
  quoted_pricing jsonb NOT NULL,
  quoted_grand_total_cents int NOT NULL,
  quoted_at timestamptz NOT NULL,
  booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assisted_drafts_lead
  ON assisted_booking_drafts (lead_id);

CREATE TABLE IF NOT EXISTS assisted_invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES assisted_leads(id) ON DELETE CASCADE,
  token_hash varchar(128) NOT NULL UNIQUE,
  channel varchar(16) NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  bound_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_by_staff_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  delivered_via varchar(16) NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id uuid NULL,
  document varchar(64) NOT NULL,
  version varchar(32) NOT NULL,
  accepted_at timestamptz NOT NULL,
  ip varchar(64) NULL,
  user_agent varchar(512) NULL,
  context jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_doc
  ON legal_acceptances (user_id, document, version);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL,
  action varchar(64) NOT NULL,
  entity_type varchar(64) NOT NULL,
  entity_id uuid NOT NULL,
  metadata jsonb NULL,
  ip varchar(64) NULL,
  user_agent varchar(512) NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_entity
  ON admin_audit_log (entity_type, entity_id, created_at DESC);
