ALTER TABLE users ADD COLUMN IF NOT EXISTS address_province varchar(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_postal_code varchar(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender varchar(16);
