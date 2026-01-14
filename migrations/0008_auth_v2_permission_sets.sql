-- Auth V2: Permission Sets (Security Groups)
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

CREATE TABLE IF NOT EXISTS "hit_auth_v2_permission_sets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "template_role" varchar(20),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_permission_sets_name_idx" ON "hit_auth_v2_permission_sets" ("name");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_sets_template_role_idx" ON "hit_auth_v2_permission_sets" ("template_role");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_permission_set_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "permission_set_id" uuid NOT NULL REFERENCES "hit_auth_v2_permission_sets"("id") ON DELETE CASCADE,
  "principal_type" varchar(20) NOT NULL,
  "principal_id" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_assignments_unique_idx" ON "hit_auth_v2_permission_set_assignments" ("permission_set_id", "principal_type", "principal_id");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_assignments_ps_idx" ON "hit_auth_v2_permission_set_assignments" ("permission_set_id");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_assignments_principal_idx" ON "hit_auth_v2_permission_set_assignments" ("principal_type", "principal_id");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_permission_set_action_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "permission_set_id" uuid NOT NULL REFERENCES "hit_auth_v2_permission_sets"("id") ON DELETE CASCADE,
  "action_key" varchar(200) NOT NULL REFERENCES "hit_auth_v2_permission_actions"("key") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_action_grants_unique_idx" ON "hit_auth_v2_permission_set_action_grants" ("permission_set_id", "action_key");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_action_grants_ps_idx" ON "hit_auth_v2_permission_set_action_grants" ("permission_set_id");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_permission_set_page_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "permission_set_id" uuid NOT NULL REFERENCES "hit_auth_v2_permission_sets"("id") ON DELETE CASCADE,
  "page_path" varchar(500) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_page_grants_unique_idx" ON "hit_auth_v2_permission_set_page_grants" ("permission_set_id", "page_path");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_page_grants_ps_idx" ON "hit_auth_v2_permission_set_page_grants" ("permission_set_id");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_permission_set_metric_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "permission_set_id" uuid NOT NULL REFERENCES "hit_auth_v2_permission_sets"("id") ON DELETE CASCADE,
  "metric_key" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_metric_grants_unique_idx" ON "hit_auth_v2_permission_set_metric_grants" ("permission_set_id", "metric_key");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_set_metric_grants_ps_idx" ON "hit_auth_v2_permission_set_metric_grants" ("permission_set_id");

CREATE TABLE IF NOT EXISTS "hit_auth_v2_permission_seed_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "permission_set_id" uuid NOT NULL REFERENCES "hit_auth_v2_permission_sets"("id") ON DELETE CASCADE,
  "kind" varchar(20) NOT NULL,
  "key" varchar(500) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_seed_keys_ps_idx" ON "hit_auth_v2_permission_seed_keys" ("permission_set_id");
CREATE INDEX IF NOT EXISTS "hit_auth_v2_permission_seed_keys_kind_key_idx" ON "hit_auth_v2_permission_seed_keys" ("kind", "key");

