-- Auth V2: Login Attempts (rate limiting)
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_login_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "ip_address" varchar(45),
  "success" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "hit_auth_v2_login_attempts_email_idx"
  ON "hit_auth_v2_login_attempts" ("email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_login_attempts_created_at_idx"
  ON "hit_auth_v2_login_attempts" ("created_at");
