/**
 * Org Dimensions Schema
 *
 * Drizzle table definitions for organizational structure:
 * - Locations (physical/virtual locations)
 * - Divisions (top-level org units)
 * - Departments (within divisions)
 * - User Org Assignments (links users to all three dimensions)
 *
 * All three dimensions follow the same pattern:
 * - Hierarchical (parentId)
 * - Optional manager assignment
 * - Code for external integrations
 * - Active/inactive status
 */

import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  decimal,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Location Types table - categorizes locations
 *
 * Examples: "Headquarters", "Warehouse", "Store", "Office", "Remote"
 */
export const locationTypes = pgTable(
  "org_location_types",
  {
    /** Unique identifier */
    id: uuid("id").primaryKey().defaultRandom(),

    /** Type name (e.g., "Headquarters", "Warehouse", "Store") */
    name: varchar("name", { length: 100 }).notNull(),

    /** Type code/identifier */
    code: varchar("code", { length: 50 }).notNull(),

    /** Icon name from lucide-react */
    icon: varchar("icon", { length: 100 }).notNull().default("MapPin"),

    /** Icon color (hex code) */
    color: varchar("color", { length: 7 }).notNull().default("#3b82f6"),

    /** Description of the location type */
    description: text("description"),

    /** Whether this is a system type (cannot be deleted) */
    isSystem: boolean("is_system").notNull().default(false),

    /** When created */
    createdAt: timestamp("created_at").defaultNow().notNull(),

    /** When last updated */
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("org_location_types_code_idx").on(table.code),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// LOCATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Locations table - physical or virtual locations
 *
 * Examples: "NYC Office", "Chicago Warehouse", "Remote - US"
 *
 * Features:
 * - Hierarchical structure via parentId
 * - Optional address and geocoding
 * - Location type categorization
 * - Primary/HQ flag
 */
export const locations = pgTable(
  "org_locations",
  {
    /** Unique identifier */
    id: uuid("id").primaryKey().defaultRandom(),

    /** Location name */
    name: varchar("name", { length: 255 }).notNull(),

    /** Optional unique code for external integrations */
    code: varchar("code", { length: 50 }),

    /** Description */
    description: text("description"),

    /** Street address */
    address: text("address"),

    /** City */
    city: varchar("city", { length: 100 }),

    /** State/Province */
    state: varchar("state", { length: 100 }),

    /** Postal/ZIP code */
    postalCode: varchar("postal_code", { length: 20 }),

    /** Country */
    country: varchar("country", { length: 100 }),

    /** Latitude - for map display */
    latitude: decimal("latitude", { precision: 10, scale: 7 }),

    /** Longitude - for map display */
    longitude: decimal("longitude", { precision: 10, scale: 7 }),

    /**
     * Parent location ID for hierarchical structure
     * Null for top-level locations
     */
    parentId: uuid("parent_id").references((): AnyPgColumn => locations.id, {
      onDelete: "set null",
    }),

    /** Location type ID */
    locationTypeId: uuid("location_type_id").references(() => locationTypes.id, {
      onDelete: "set null",
    }),

    /**
     * Location manager (user email/key)
     * Used for approval routing and reporting
     */
    managerUserKey: varchar("manager_user_key", { length: 255 }),

    /** Whether this is the primary/HQ location */
    isPrimary: boolean("is_primary").notNull().default(false),

    /** Whether the location is active */
    isActive: boolean("is_active").notNull().default(true),

    /** When created */
    createdAt: timestamp("created_at").defaultNow().notNull(),

    /** When last updated */
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("org_locations_name_idx").on(table.name),
    codeIdx: uniqueIndex("org_locations_code_idx").on(table.code),
    parentIdx: index("org_locations_parent_idx").on(table.parentId),
    typeIdx: index("org_locations_type_idx").on(table.locationTypeId),
    managerIdx: index("org_locations_manager_idx").on(table.managerUserKey),
    primaryIdx: index("org_locations_primary_idx").on(table.isPrimary),
    activeIdx: index("org_locations_active_idx").on(table.isActive),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DIVISIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Divisions table - top-level organizational units
 *
 * Examples: "North America", "EMEA", "Engineering", "Sales"
 *
 * Features:
 * - Hierarchical structure via parentId
 * - Optional manager assignment
 * - Code for external system integration
 */
export const divisions = pgTable(
  "org_divisions",
  {
    /** Unique identifier */
    id: uuid("id").primaryKey().defaultRandom(),

    /** Division name */
    name: varchar("name", { length: 255 }).notNull(),

    /** Optional unique code for external integrations (e.g., "NA", "EMEA", "ENG") */
    code: varchar("code", { length: 50 }),

    /** Description */
    description: text("description"),

    /**
     * Parent division ID for hierarchical structure
     * Null for top-level divisions
     */
    parentId: uuid("parent_id").references((): AnyPgColumn => divisions.id, {
      onDelete: "set null",
    }),

    /**
     * Division manager (user email/key)
     * Used for approval routing and reporting
     */
    managerUserKey: varchar("manager_user_key", { length: 255 }),

    /** Whether the division is active */
    isActive: boolean("is_active").notNull().default(true),

    /** When created */
    createdAt: timestamp("created_at").defaultNow().notNull(),

    /** When last updated */
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("org_divisions_name_idx").on(table.name),
    codeIdx: uniqueIndex("org_divisions_code_idx").on(table.code),
    parentIdx: index("org_divisions_parent_idx").on(table.parentId),
    managerIdx: index("org_divisions_manager_idx").on(table.managerUserKey),
    activeIdx: index("org_divisions_active_idx").on(table.isActive),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Departments table - organizational units within divisions
 *
 * Examples: "Frontend Team", "Backend Team", "Sales - Enterprise", "Marketing - Digital"
 *
 * Features:
 * - Belongs to a division (optional - some orgs have flat departments)
 * - Hierarchical structure via parentId
 * - Optional manager assignment
 */
export const departments = pgTable(
  "org_departments",
  {
    /** Unique identifier */
    id: uuid("id").primaryKey().defaultRandom(),

    /** Department name */
    name: varchar("name", { length: 255 }).notNull(),

    /** Optional unique code for external integrations */
    code: varchar("code", { length: 50 }),

    /** Description */
    description: text("description"),

    /**
     * Parent department ID for hierarchical structure
     * Null for top-level departments
     */
    parentId: uuid("parent_id").references((): AnyPgColumn => departments.id, {
      onDelete: "set null",
    }),

    /**
     * Department manager (user email/key)
     * Used for approval routing and reporting
     */
    managerUserKey: varchar("manager_user_key", { length: 255 }),

    /** Whether the department is active */
    isActive: boolean("is_active").notNull().default(true),

    /** When created */
    createdAt: timestamp("created_at").defaultNow().notNull(),

    /** When last updated */
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("org_departments_name_idx").on(table.name),
    codeIdx: uniqueIndex("org_departments_code_idx").on(table.code),
    parentIdx: index("org_departments_parent_idx").on(table.parentId),
    managerIdx: index("org_departments_manager_idx").on(table.managerUserKey),
    activeIdx: index("org_departments_active_idx").on(table.isActive),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// USER ORG ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User Org Assignments table - links users to org dimensions
 *
 * This is a unified table for all org dimension assignments:
 * - Division assignment (divisionId)
 * - Department assignment (departmentId)
 * - Location assignment (locationId - references locations pack)
 *
 * Design notes:
 * - Uses userKey (email) instead of FK to auth DB for interoperability
 * - Each user can have at most one assignment row
 * - At least one of divisionId, departmentId, or locationId should be set
 *
 * Examples:
 * - User belongs to "Engineering" division + "Frontend" department + "NYC Office"
 * - User belongs to "Sales" division + "Chicago Office" (no department)
 */
export const userOrgAssignments = pgTable(
  "org_user_assignments",
  {
    /** Unique identifier */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * User identifier (typically email from JWT sub claim)
     * No FK to auth DB - stored as string for interoperability
     */
    userKey: varchar("user_key", { length: 255 }).notNull(),

    /** Division assignment (optional) */
    divisionId: uuid("division_id").references(() => divisions.id, {
      onDelete: "cascade",
    }),

    /** Department assignment (optional) */
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "cascade",
    }),

    /** Location assignment (optional) */
    locationId: uuid("location_id").references(() => locations.id, {
      onDelete: "cascade",
    }),

    /** When the assignment was created */
    createdAt: timestamp("created_at").defaultNow().notNull(),

    /** Who created this assignment (for audit) */
    createdByUserKey: varchar("created_by_user_key", { length: 255 }),
  },
  (table) => ({
    // Indexes for common queries
    userKeyIdx: index("org_user_assignments_user_key_idx").on(table.userKey),
    divisionIdx: index("org_user_assignments_division_idx").on(table.divisionId),
    departmentIdx: index("org_user_assignments_department_idx").on(table.departmentId),
    locationIdx: index("org_user_assignments_location_idx").on(table.locationId),

    // Unique constraint: user can only have one assignment row total.
    uniqueUser: uniqueIndex("org_user_assignments_unique_user").on(table.userKey),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY SCOPES (MULTI-LDD)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entity Scopes table - attaches one or more org scopes (L/D/D) to any entity.
 *
 * This is the system-wide building block for "an entity can belong to multiple
 * org scopes", without forcing every feature pack to invent a different schema.
 *
 * Design notes:
 * - Polymorphic link via (entityType, entityId). We intentionally do not FK to
 *   feature-pack tables, because cross-pack FK constraints aren't feasible.
 * - scopeKind is kept for future use (e.g. "primary" vs "extra") but most packs
 *   will keep primary scope on the entity row itself for fast filtering.
 * - At least one of divisionId / departmentId / locationId should be set.
 */
export const orgEntityScopes = pgTable(
  "org_entity_scopes",
  {
    /** Unique identifier */
    id: uuid("id").primaryKey().defaultRandom(),

    /** Entity type key (e.g. "crm.contact", "projects.project") */
    entityType: varchar("entity_type", { length: 100 }).notNull(),

    /** Entity ID (uuid from the owning table) */
    entityId: uuid("entity_id").notNull(),

    /** Scope kind (e.g. "primary" | "extra") */
    scopeKind: varchar("scope_kind", { length: 20 }).notNull().default("extra"),

    /** Division scope */
    divisionId: uuid("division_id").references(() => divisions.id, {
      onDelete: "set null",
    }),

    /** Department scope */
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),

    /** Location scope */
    locationId: uuid("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),

    /** When created */
    createdAt: timestamp("created_at").defaultNow().notNull(),

    /** Who created this scope row (for audit) */
    createdByUserKey: varchar("created_by_user_key", { length: 255 }),
  },
  (table) => ({
    entityIdx: index("org_entity_scopes_entity_idx").on(table.entityType, table.entityId),
    divisionIdx: index("org_entity_scopes_division_idx").on(table.divisionId),
    departmentIdx: index("org_entity_scopes_department_idx").on(table.departmentId),
    locationIdx: index("org_entity_scopes_location_idx").on(table.locationId),
    uniqueScope: uniqueIndex("org_entity_scopes_unique").on(
      table.entityType,
      table.entityId,
      table.scopeKind,
      table.divisionId,
      table.departmentId,
      table.locationId
    ),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

// Location Type types
export type LocationType = typeof locationTypes.$inferSelect;
export type InsertLocationType = typeof locationTypes.$inferInsert;
export type UpdateLocationType = Partial<Omit<InsertLocationType, "id" | "createdAt">>;

// Location types
export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type UpdateLocation = Partial<Omit<InsertLocation, "id" | "createdAt">>;

// Division types
export type Division = typeof divisions.$inferSelect;
export type InsertDivision = typeof divisions.$inferInsert;
export type UpdateDivision = Partial<Omit<InsertDivision, "id" | "createdAt">>;

// Department types
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;
export type UpdateDepartment = Partial<Omit<InsertDepartment, "id" | "createdAt">>;

// User Org Assignment types
export type UserOrgAssignment = typeof userOrgAssignments.$inferSelect;
export type InsertUserOrgAssignment = typeof userOrgAssignments.$inferInsert;
export type UpdateUserOrgAssignment = Partial<Omit<InsertUserOrgAssignment, "id" | "createdAt">>;

// Entity Scope types
export type OrgEntityScope = typeof orgEntityScopes.$inferSelect;
export type InsertOrgEntityScope = typeof orgEntityScopes.$inferInsert;
export type UpdateOrgEntityScope = Partial<Omit<InsertOrgEntityScope, "id" | "createdAt">>;

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT LOCATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default location types to be seeded
 */
export const DEFAULT_LOCATION_TYPES: Omit<InsertLocationType, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Headquarters",
    code: "hq",
    icon: "Building2",
    color: "#fbbf24",
    description: "Main headquarters or corporate office",
    isSystem: true,
  },
  {
    name: "Office",
    code: "office",
    icon: "Building",
    color: "#6366f1",
    description: "General office location",
    isSystem: true,
  },
  {
    name: "Warehouse",
    code: "warehouse",
    icon: "Package",
    color: "#3b82f6",
    description: "Storage and distribution facility",
    isSystem: true,
  },
  {
    name: "Store",
    code: "store",
    icon: "ShoppingBag",
    color: "#10b981",
    description: "Retail store location",
    isSystem: true,
  },
  {
    name: "Remote",
    code: "remote",
    icon: "Home",
    color: "#8b5cf6",
    description: "Remote/work-from-home",
    isSystem: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ORG SCOPE TYPES (for principal resolution)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The org dimension kinds supported by HIT
 */
export type OrgDimensionKind = "division" | "department" | "location";

/**
 * A user's resolved org scope - their divisions, departments, and locations
 */
export interface OrgScope {
  divisionIds: string[];
  departmentIds: string[];
  locationIds: string[];
}

/**
 * Ownership scope for an entity - who owns it and what org units it belongs to
 */
export interface OwnershipScope {
  ownerUserKey?: string | null;
  divisionId?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
}
