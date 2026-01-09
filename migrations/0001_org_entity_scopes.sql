-- Org Entity Scopes Migration
-- Adds a generic multi-LDD scope attachment table for entities across feature packs

-- ─────────────────────────────────────────────────────────────────────────────
-- ENTITY SCOPES (MULTI-LDD)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "org_entity_scopes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" varchar(100) NOT NULL,
  "entity_id" uuid NOT NULL,
  "scope_kind" varchar(20) DEFAULT 'extra' NOT NULL,
  "division_id" uuid REFERENCES "org_divisions"("id") ON DELETE SET NULL,
  "department_id" uuid REFERENCES "org_departments"("id") ON DELETE SET NULL,
  "location_id" uuid REFERENCES "org_locations"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by_user_key" varchar(255)
);

CREATE INDEX "org_entity_scopes_entity_idx" ON "org_entity_scopes" ("entity_type", "entity_id");
CREATE INDEX "org_entity_scopes_division_idx" ON "org_entity_scopes" ("division_id");
CREATE INDEX "org_entity_scopes_department_idx" ON "org_entity_scopes" ("department_id");
CREATE INDEX "org_entity_scopes_location_idx" ON "org_entity_scopes" ("location_id");

-- Prevent duplicate scopes for the same entity
CREATE UNIQUE INDEX "org_entity_scopes_unique" ON "org_entity_scopes" ("entity_type", "entity_id", "scope_kind", "division_id", "department_id", "location_id");

