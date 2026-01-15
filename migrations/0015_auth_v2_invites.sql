-- Auth V2: Invites
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "inviter_email" varchar(255) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "role" varchar(50),
  "message" text,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "rejected_at" timestamp,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_invites_token_hash_idx"
  ON "hit_auth_v2_invites" ("token_hash");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_invites_email_idx"
  ON "hit_auth_v2_invites" ("email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_invites_inviter_email_idx"
  ON "hit_auth_v2_invites" ("inviter_email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_invites_status_idx"
  ON "hit_auth_v2_invites" ("status");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_invites_expires_idx"
  ON "hit_auth_v2_invites" ("expires_at");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_invites_created_idx"
  ON "hit_auth_v2_invites" ("created_at");
