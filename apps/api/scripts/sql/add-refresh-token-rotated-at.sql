-- RYRA-489: grace window for concurrent refresh-token reuse.
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS rotated_at timestamptz;
