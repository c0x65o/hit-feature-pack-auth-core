-- Drop unused org_departments.cost_center_code
--
-- Why: this column is legacy and no longer used. We keep this as a forward-only
-- migration (do not edit old migrations) so environments remain deterministic.
--
-- Safety:
-- - Works on fresh DBs (table exists from 0000_*).
-- - Works on drifted DBs (column might already be gone).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'org_departments'
  ) THEN
    ALTER TABLE "org_departments" DROP COLUMN IF EXISTS "cost_center_code";
  END IF;
END $$;

