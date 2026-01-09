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
import { pgTable, varchar, text, timestamp, boolean, uuid, decimal, index, uniqueIndex, } from "drizzle-orm/pg-core";
// ─────────────────────────────────────────────────────────────────────────────
// LOCATION TYPES
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Location Types table - categorizes locations
 *
 * Examples: "Headquarters", "Warehouse", "Store", "Office", "Remote"
 */
export const locationTypes = pgTable("org_location_types", {
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
}, (table) => ({
    codeIdx: uniqueIndex("org_location_types_code_idx").on(table.code),
}));
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
export const locations = pgTable("org_locations", {
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
    parentId: uuid("parent_id").references(() => locations.id, {
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
}, (table) => ({
    nameIdx: index("org_locations_name_idx").on(table.name),
    codeIdx: uniqueIndex("org_locations_code_idx").on(table.code),
    parentIdx: index("org_locations_parent_idx").on(table.parentId),
    typeIdx: index("org_locations_type_idx").on(table.locationTypeId),
    managerIdx: index("org_locations_manager_idx").on(table.managerUserKey),
    primaryIdx: index("org_locations_primary_idx").on(table.isPrimary),
    activeIdx: index("org_locations_active_idx").on(table.isActive),
}));
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
export const divisions = pgTable("org_divisions", {
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
    parentId: uuid("parent_id").references(() => divisions.id, {
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
}, (table) => ({
    nameIdx: index("org_divisions_name_idx").on(table.name),
    codeIdx: uniqueIndex("org_divisions_code_idx").on(table.code),
    parentIdx: index("org_divisions_parent_idx").on(table.parentId),
    managerIdx: index("org_divisions_manager_idx").on(table.managerUserKey),
    activeIdx: index("org_divisions_active_idx").on(table.isActive),
}));
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
 * - Cost center code for finance integration
 */
export const departments = pgTable("org_departments", {
    /** Unique identifier */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Department name */
    name: varchar("name", { length: 255 }).notNull(),
    /** Optional unique code for external integrations */
    code: varchar("code", { length: 50 }),
    /** Description */
    description: text("description"),
    /**
     * Division this department belongs to (optional)
     * Some organizations have departments without divisions
     */
    divisionId: uuid("division_id").references(() => divisions.id, {
        onDelete: "set null",
    }),
    /**
     * Parent department ID for hierarchical structure
     * Null for top-level departments
     */
    parentId: uuid("parent_id").references(() => departments.id, {
        onDelete: "set null",
    }),
    /**
     * Department manager (user email/key)
     * Used for approval routing and reporting
     */
    managerUserKey: varchar("manager_user_key", { length: 255 }),
    /** Cost center code for finance/HR integration */
    costCenterCode: varchar("cost_center_code", { length: 50 }),
    /** Whether the department is active */
    isActive: boolean("is_active").notNull().default(true),
    /** When created */
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** When last updated */
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    nameIdx: index("org_departments_name_idx").on(table.name),
    codeIdx: uniqueIndex("org_departments_code_idx").on(table.code),
    divisionIdx: index("org_departments_division_idx").on(table.divisionId),
    parentIdx: index("org_departments_parent_idx").on(table.parentId),
    managerIdx: index("org_departments_manager_idx").on(table.managerUserKey),
    activeIdx: index("org_departments_active_idx").on(table.isActive),
}));
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
 * - Each user can have one "primary" assignment (isPrimary = true)
 * - Users can have multiple assignments (e.g., works in 2 locations)
 * - At least one of divisionId, departmentId, or locationId should be set
 *
 * Examples:
 * - User belongs to "Engineering" division + "Frontend" department + "NYC Office"
 * - User belongs to "Sales" division + "Chicago Office" (no department)
 * - User belongs to multiple locations (remote + HQ)
 */
export const userOrgAssignments = pgTable("org_user_assignments", {
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
    /**
     * Whether this is the user's primary assignment
     * Only one assignment per user should be primary
     */
    isPrimary: boolean("is_primary").notNull().default(false),
    /**
     * Optional role within this assignment context
     * Examples: "manager", "lead", "member"
     */
    role: varchar("role", { length: 50 }),
    /** When the assignment was created */
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Who created this assignment (for audit) */
    createdByUserKey: varchar("created_by_user_key", { length: 255 }),
}, (table) => ({
    // Indexes for common queries
    userKeyIdx: index("org_user_assignments_user_key_idx").on(table.userKey),
    divisionIdx: index("org_user_assignments_division_idx").on(table.divisionId),
    departmentIdx: index("org_user_assignments_department_idx").on(table.departmentId),
    locationIdx: index("org_user_assignments_location_idx").on(table.locationId),
    primaryIdx: index("org_user_assignments_primary_idx").on(table.isPrimary),
    // Unique constraint: user can only have one assignment to the same combination
    // This prevents duplicate rows like "user X in division Y + department Z" twice
    uniqueAssignment: uniqueIndex("org_user_assignments_unique").on(table.userKey, table.divisionId, table.departmentId, table.locationId),
}));
// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT LOCATION TYPES
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Default location types to be seeded
 */
export const DEFAULT_LOCATION_TYPES = [
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
//# sourceMappingURL=org-dimensions.js.map