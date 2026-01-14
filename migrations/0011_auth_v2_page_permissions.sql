-- Auth V2: Page Permissions (role/group/user)
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_role_page_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "role" varchar(50) NOT NULL,
  "page_path" varchar(500) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_role_page_permissions_unique_idx"
  ON "hit_auth_v2_role_page_permissions" ("role", "page_path");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_role_page_permissions_role_idx"
  ON "hit_auth_v2_role_page_permissions" ("role");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_role_page_permissions_page_idx"
  ON "hit_auth_v2_role_page_permissions" ("page_path");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_role_page_permissions_created_idx"
  ON "hit_auth_v2_role_page_permissions" ("created_at");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_group_page_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL REFERENCES "hit_auth_v2_groups"("id") ON DELETE CASCADE,
  "page_path" varchar(500) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_group_page_permissions_unique_idx"
  ON "hit_auth_v2_group_page_permissions" ("group_id", "page_path");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_group_page_permissions_group_idx"
  ON "hit_auth_v2_group_page_permissions" ("group_id");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_group_page_permissions_page_idx"
  ON "hit_auth_v2_group_page_permissions" ("page_path");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_group_page_permissions_created_idx"
  ON "hit_auth_v2_group_page_permissions" ("created_at");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_user_page_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_email" varchar(255) NOT NULL REFERENCES "hit_auth_v2_users"("email") ON DELETE CASCADE,
  "page_path" varchar(500) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_user_page_overrides_unique_idx"
  ON "hit_auth_v2_user_page_overrides" ("user_email", "page_path");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_user_page_overrides_user_idx"
  ON "hit_auth_v2_user_page_overrides" ("user_email");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_user_page_overrides_page_idx"
  ON "hit_auth_v2_user_page_overrides" ("page_path");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_user_page_overrides_created_idx"
  ON "hit_auth_v2_user_page_overrides" ("created_at");
