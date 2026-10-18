-- RYRA-488: ensure booking idempotency_key uniqueness (partial — multiple NULLs allowed).
-- Safe if a unique constraint already exists from TypeORM synchronize.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_key_uidx
  ON bookings (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
