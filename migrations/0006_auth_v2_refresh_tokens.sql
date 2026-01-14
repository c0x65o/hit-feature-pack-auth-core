-- Auth V2: Refresh Token Sessions
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_email" varchar(255) NOT NULL REFERENCES "hit_auth_v2_users"("email") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "revoked_at" timestamp,
  "user_agent" text,
  "ip_address" varchar(45)
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_refresh_tokens_token_hash_idx" ON "hit_auth_v2_refresh_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_refresh_tokens_user_idx" ON "hit_auth_v2_refresh_tokens" ("user_email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_refresh_tokens_expires_idx" ON "hit_auth_v2_refresh_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_refresh_tokens_revoked_idx" ON "hit_auth_v2_refresh_tokens" ("revoked_at");

