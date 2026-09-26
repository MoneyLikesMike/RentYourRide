ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;
