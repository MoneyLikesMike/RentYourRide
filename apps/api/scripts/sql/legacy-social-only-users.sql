-- Legacy RentYourRide users who signed up via Facebook or Apple (no password set).
-- Run against the **legacy** Postgres database (table name: "user").
--
-- These accounts cannot use Facebook Login in the new app. Before or after
-- migrating their profile data, send them through Forgot Password so they
-- can set an email + password credential.
--
-- Usage (via tunnel or direct):
--   psql "$LEGACY_DATABASE_URL" -f apps/api/scripts/sql/legacy-social-only-users.sql

SELECT
  u.id AS legacy_user_id,
  u.email,
  u."firstName" AS first_name,
  u."lastName" AS last_name,
  u."isEmailVerified" AS email_verified,
  u."isPhoneVerified" AS phone_verified,
  u."loginsCount" AS login_count,
  u."createdAt" AS created_at,
  'needs_password_setup' AS migration_flag,
  'Send Forgot Password email before cutover' AS recommended_action
FROM "user" u
WHERE u."isActive" = true
  AND u.email IS NOT NULL
  AND TRIM(u.email) <> ''
  AND (u.password IS NULL OR TRIM(u.password) = '')
ORDER BY u."createdAt" DESC;

-- Summary count
SELECT COUNT(*) AS social_only_active_users
FROM "user" u
WHERE u."isActive" = true
  AND u.email IS NOT NULL
  AND TRIM(u.email) <> ''
  AND (u.password IS NULL OR TRIM(u.password) = '');
