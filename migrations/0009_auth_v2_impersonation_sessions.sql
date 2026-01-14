-- Auth V2: Impersonation Sessions
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_impersonation_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_email" varchar(255) NOT NULL REFERENCES "hit_auth_v2_users"("email") ON DELETE CASCADE,
  "impersonated_email" varchar(255) NOT NULL REFERENCES "hit_auth_v2_users"("email") ON DELETE CASCADE,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "ended_at" timestamp,
  "ended_reason" text,
  "ip_address" varchar(45),
  "user_agent" text
);

CREATE INDEX IF NOT EXISTS "hit_auth_v2_impersonation_sessions_admin_idx" ON "hit_auth_v2_impersonation_sessions" ("admin_email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_impersonation_sessions_impersonated_idx" ON "hit_auth_v2_impersonation_sessions" ("impersonated_email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_impersonation_sessions_started_idx" ON "hit_auth_v2_impersonation_sessions" ("started_at");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_impersonation_sessions_ended_idx" ON "hit_auth_v2_impersonation_sessions" ("ended_at");

