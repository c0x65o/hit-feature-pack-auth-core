-- Auth V2: Seed default/system security groups
-- Replacement schema (side-by-side): uses hit_auth_v2_* tables.

WITH upsert_default AS (
  INSERT INTO "hit_auth_v2_permission_sets" ("name", "description", "template_role", "created_at", "updated_at")
  VALUES ('Default', 'Default security group', 'user', now(), now())
  ON CONFLICT ("name") DO UPDATE
    SET "template_role" = EXCLUDED."template_role",
        "updated_at" = now()
  RETURNING "id"
),
default_set AS (
  SELECT "id" FROM upsert_default
  UNION ALL
  SELECT "id" FROM "hit_auth_v2_permission_sets" WHERE "name" = 'Default' LIMIT 1
),
upsert_system AS (
  INSERT INTO "hit_auth_v2_permission_sets" ("name", "description", "template_role", "created_at", "updated_at")
  VALUES ('System', 'System security group (admin)', 'admin', now(), now())
  ON CONFLICT ("name") DO UPDATE
    SET "template_role" = EXCLUDED."template_role",
        "updated_at" = now()
  RETURNING "id"
),
system_set AS (
  SELECT "id" FROM upsert_system
  UNION ALL
  SELECT "id" FROM "hit_auth_v2_permission_sets" WHERE "name" = 'System' LIMIT 1
)
INSERT INTO "hit_auth_v2_permission_set_assignments" (
  "permission_set_id",
  "principal_type",
  "principal_id",
  "created_at"
)
SELECT "id", 'role', 'user', now() FROM default_set
ON CONFLICT ("permission_set_id", "principal_type", "principal_id") DO NOTHING;

INSERT INTO "hit_auth_v2_permission_set_assignments" (
  "permission_set_id",
  "principal_type",
  "principal_id",
  "created_at"
)
SELECT "id", 'role', 'admin', now() FROM system_set
ON CONFLICT ("permission_set_id", "principal_type", "principal_id") DO NOTHING;
