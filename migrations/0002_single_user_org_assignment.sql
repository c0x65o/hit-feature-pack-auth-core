-- Org User Assignments: simplify to one row per user
-- - Drop is_primary + role columns
-- - Replace unique index (user_key, division_id, department_id, location_id) with unique(user_key)

-- If any users have multiple assignment rows, keep the most recently created one.
WITH ranked AS (
  SELECT
    id,
    user_key,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_key ORDER BY created_at DESC, id DESC) AS rn
  FROM org_user_assignments
)
DELETE FROM org_user_assignments
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

DROP INDEX IF EXISTS "org_user_assignments_primary_idx";
DROP INDEX IF EXISTS "org_user_assignments_unique";

ALTER TABLE "org_user_assignments" DROP COLUMN IF EXISTS "is_primary";
ALTER TABLE "org_user_assignments" DROP COLUMN IF EXISTS "role";

CREATE UNIQUE INDEX IF NOT EXISTS "org_user_assignments_unique_user" ON "org_user_assignments" ("user_key");

