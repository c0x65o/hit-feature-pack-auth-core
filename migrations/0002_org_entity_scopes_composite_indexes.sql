-- Add composite indexes for org_entity_scopes lookups by entity + dimension

CREATE INDEX IF NOT EXISTS "org_entity_scopes_entity_division_idx"
  ON "org_entity_scopes" ("entity_type", "division_id");

CREATE INDEX IF NOT EXISTS "org_entity_scopes_entity_department_idx"
  ON "org_entity_scopes" ("entity_type", "department_id");

CREATE INDEX IF NOT EXISTS "org_entity_scopes_entity_location_idx"
  ON "org_entity_scopes" ("entity_type", "location_id");
