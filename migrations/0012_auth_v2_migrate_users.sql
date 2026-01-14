-- Auth V2: Migrate users from V1 (password reset required)
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

DO $$
BEGIN
  IF to_regclass('public.hit_auth_users') IS NOT NULL THEN
    INSERT INTO "hit_auth_v2_users" (
      "email",
      "password_hash",
      "email_verified",
      "two_factor_enabled",
      "locked",
      "role",
      "metadata",
      "profile_fields",
      "profile_picture_url",
      "created_at",
      "updated_at",
      "last_login"
    )
    SELECT
      LOWER(u.email),
      NULL,
      COALESCE(u.email_verified, false),
      COALESCE(u.two_factor_enabled, false),
      COALESCE(u.locked, false),
      CASE WHEN LOWER(COALESCE(u.role, 'user')) = 'admin' THEN 'admin' ELSE 'user' END,
      COALESCE(u.metadata, '{}'::jsonb),
      COALESCE(u.profile_fields, '{}'::jsonb),
      u.profile_picture_url,
      COALESCE(u.created_at, now()),
      COALESCE(u.updated_at, now()),
      u.last_login
    FROM "hit_auth_users" u
    ON CONFLICT ("email") DO NOTHING;
  END IF;
END $$;
