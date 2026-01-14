-- Auth V2: Email tokens (verification/reset/magic link)
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_email_verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "code_hash" varchar(64),
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_email_verification_tokens_token_idx"
  ON "hit_auth_v2_email_verification_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_email_verification_tokens_email_idx"
  ON "hit_auth_v2_email_verification_tokens" ("email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_email_verification_tokens_expires_idx"
  ON "hit_auth_v2_email_verification_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_email_verification_tokens_created_idx"
  ON "hit_auth_v2_email_verification_tokens" ("created_at");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_password_reset_tokens_token_idx"
  ON "hit_auth_v2_password_reset_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_password_reset_tokens_email_idx"
  ON "hit_auth_v2_password_reset_tokens" ("email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_password_reset_tokens_expires_idx"
  ON "hit_auth_v2_password_reset_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_password_reset_tokens_created_idx"
  ON "hit_auth_v2_password_reset_tokens" ("created_at");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_magic_link_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_magic_link_tokens_token_idx"
  ON "hit_auth_v2_magic_link_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_magic_link_tokens_email_idx"
  ON "hit_auth_v2_magic_link_tokens" ("email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_magic_link_tokens_expires_idx"
  ON "hit_auth_v2_magic_link_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_magic_link_tokens_created_idx"
  ON "hit_auth_v2_magic_link_tokens" ("created_at");
