-- Auth V2: Users
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_users" (
  "email" varchar(255) PRIMARY KEY NOT NULL,
  "password_hash" text,
  "email_verified" boolean DEFAULT false NOT NULL,
  "two_factor_enabled" boolean DEFAULT false NOT NULL,
  "locked" boolean DEFAULT false NOT NULL,
  "role" varchar(50) DEFAULT 'user' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "profile_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "profile_picture_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_login" timestamp
);

CREATE INDEX IF NOT EXISTS "hit_auth_v2_users_created_at_idx" ON "hit_auth_v2_users" ("created_at");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_users_role_idx" ON "hit_auth_v2_users" ("role");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_users_locked_idx" ON "hit_auth_v2_users" ("locked");

