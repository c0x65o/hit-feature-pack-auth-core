-- Auth V2: Permission Actions + Overrides
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_permission_actions" (
  "key" varchar(200) PRIMARY KEY NOT NULL,
  "pack_name" varchar(100),
  "label" varchar(255) DEFAULT '' NOT NULL,
  "description" text,
  "default_enabled" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_actions_pack_idx" ON "hit_auth_v2_permission_actions" ("pack_name");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_role_action_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "role" varchar(50) NOT NULL,
  "action_key" varchar(200) NOT NULL REFERENCES "hit_auth_v2_permission_actions"("key") ON DELETE CASCADE,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_role_action_permissions_unique_idx" ON "hit_auth_v2_role_action_permissions" ("role", "action_key");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_role_action_permissions_role_idx" ON "hit_auth_v2_role_action_permissions" ("role");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_group_action_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "hit_auth_v2_groups"("id") ON DELETE CASCADE,
  "action_key" varchar(200) NOT NULL REFERENCES "hit_auth_v2_permission_actions"("key") ON DELETE CASCADE,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_group_action_permissions_unique_idx" ON "hit_auth_v2_group_action_permissions" ("group_id", "action_key");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_group_action_permissions_group_idx" ON "hit_auth_v2_group_action_permissions" ("group_id");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_user_action_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_email" varchar(255) NOT NULL REFERENCES "hit_auth_v2_users"("email") ON DELETE CASCADE,
  "action_key" varchar(200) NOT NULL REFERENCES "hit_auth_v2_permission_actions"("key") ON DELETE CASCADE,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_user_action_overrides_unique_idx" ON "hit_auth_v2_user_action_overrides" ("user_email", "action_key");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_user_action_overrides_user_idx" ON "hit_auth_v2_user_action_overrides" ("user_email");

