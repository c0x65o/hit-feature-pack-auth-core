-- Auth V2: Groups + Memberships
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_groups_name_idx" ON "hit_auth_v2_groups" ("name");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_groups_created_at_idx" ON "hit_auth_v2_groups" ("created_at");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_user_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_email" varchar(255) NOT NULL REFERENCES "hit_auth_v2_users"("email") ON DELETE CASCADE,
  "group_id" uuid NOT NULL REFERENCES "hit_auth_v2_groups"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" varchar(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_user_groups_unique_idx" ON "hit_auth_v2_user_groups" ("user_email", "group_id");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_user_groups_user_idx" ON "hit_auth_v2_user_groups" ("user_email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_user_groups_group_idx" ON "hit_auth_v2_user_groups" ("group_id");

