-- Add LDD principals (location/division/department) to shared enum.
-- Keep idempotent for drifted environments.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'principal_type') THEN
    ALTER TYPE "principal_type" ADD VALUE IF NOT EXISTS 'location';
    ALTER TYPE "principal_type" ADD VALUE IF NOT EXISTS 'division';
    ALTER TYPE "principal_type" ADD VALUE IF NOT EXISTS 'department';
  END IF;
END $$;--> statement-breakpoint
