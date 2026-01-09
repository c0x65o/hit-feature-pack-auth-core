-- Org Dimensions Migration
-- Creates tables for locations, divisions, departments, and user org assignments

-- ─────────────────────────────────────────────────────────────────────────────
-- LOCATION TYPES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "org_location_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "code" varchar(50) NOT NULL,
  "icon" varchar(100) DEFAULT 'MapPin' NOT NULL,
  "color" varchar(7) DEFAULT '#3b82f6' NOT NULL,
  "description" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "org_location_types_code_idx" ON "org_location_types" ("code");

-- Seed default location types
INSERT INTO "org_location_types" ("name", "code", "icon", "color", "description", "is_system") VALUES
  ('Headquarters', 'hq', 'Building2', '#fbbf24', 'Main headquarters or corporate office', true),
  ('Office', 'office', 'Building', '#6366f1', 'General office location', true),
  ('Warehouse', 'warehouse', 'Package', '#3b82f6', 'Storage and distribution facility', true),
  ('Store', 'store', 'ShoppingBag', '#10b981', 'Retail store location', true),
  ('Remote', 'remote', 'Home', '#8b5cf6', 'Remote/work-from-home', true);

-- ─────────────────────────────────────────────────────────────────────────────
-- LOCATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "org_locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50),
  "description" text,
  "address" text,
  "city" varchar(100),
  "state" varchar(100),
  "postal_code" varchar(20),
  "country" varchar(100),
  "latitude" decimal(10, 7),
  "longitude" decimal(10, 7),
  "parent_id" uuid REFERENCES "org_locations"("id") ON DELETE SET NULL,
  "location_type_id" uuid REFERENCES "org_location_types"("id") ON DELETE SET NULL,
  "manager_user_key" varchar(255),
  "is_primary" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "org_locations_name_idx" ON "org_locations" ("name");
CREATE UNIQUE INDEX "org_locations_code_idx" ON "org_locations" ("code");
CREATE INDEX "org_locations_parent_idx" ON "org_locations" ("parent_id");
CREATE INDEX "org_locations_type_idx" ON "org_locations" ("location_type_id");
CREATE INDEX "org_locations_manager_idx" ON "org_locations" ("manager_user_key");
CREATE INDEX "org_locations_primary_idx" ON "org_locations" ("is_primary");
CREATE INDEX "org_locations_active_idx" ON "org_locations" ("is_active");

-- ─────────────────────────────────────────────────────────────────────────────
-- DIVISIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "org_divisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50),
  "description" text,
  "parent_id" uuid REFERENCES "org_divisions"("id") ON DELETE SET NULL,
  "manager_user_key" varchar(255),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "org_divisions_name_idx" ON "org_divisions" ("name");
CREATE UNIQUE INDEX "org_divisions_code_idx" ON "org_divisions" ("code");
CREATE INDEX "org_divisions_parent_idx" ON "org_divisions" ("parent_id");
CREATE INDEX "org_divisions_manager_idx" ON "org_divisions" ("manager_user_key");
CREATE INDEX "org_divisions_active_idx" ON "org_divisions" ("is_active");

-- ─────────────────────────────────────────────────────────────────────────────
-- DEPARTMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "org_departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "code" varchar(50),
  "description" text,
  "division_id" uuid REFERENCES "org_divisions"("id") ON DELETE SET NULL,
  "parent_id" uuid REFERENCES "org_departments"("id") ON DELETE SET NULL,
  "manager_user_key" varchar(255),
  "cost_center_code" varchar(50),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "org_departments_name_idx" ON "org_departments" ("name");
CREATE UNIQUE INDEX "org_departments_code_idx" ON "org_departments" ("code");
CREATE INDEX "org_departments_division_idx" ON "org_departments" ("division_id");
CREATE INDEX "org_departments_parent_idx" ON "org_departments" ("parent_id");
CREATE INDEX "org_departments_manager_idx" ON "org_departments" ("manager_user_key");
CREATE INDEX "org_departments_active_idx" ON "org_departments" ("is_active");

-- ─────────────────────────────────────────────────────────────────────────────
-- USER ORG ASSIGNMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "org_user_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_key" varchar(255) NOT NULL,
  "division_id" uuid REFERENCES "org_divisions"("id") ON DELETE CASCADE,
  "department_id" uuid REFERENCES "org_departments"("id") ON DELETE CASCADE,
  "location_id" uuid REFERENCES "org_locations"("id") ON DELETE CASCADE,
  "is_primary" boolean DEFAULT false NOT NULL,
  "role" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by_user_key" varchar(255)
);

CREATE INDEX "org_user_assignments_user_key_idx" ON "org_user_assignments" ("user_key");
CREATE INDEX "org_user_assignments_division_idx" ON "org_user_assignments" ("division_id");
CREATE INDEX "org_user_assignments_department_idx" ON "org_user_assignments" ("department_id");
CREATE INDEX "org_user_assignments_location_idx" ON "org_user_assignments" ("location_id");
CREATE INDEX "org_user_assignments_primary_idx" ON "org_user_assignments" ("is_primary");
CREATE UNIQUE INDEX "org_user_assignments_unique" ON "org_user_assignments" ("user_key", "division_id", "department_id", "location_id");
