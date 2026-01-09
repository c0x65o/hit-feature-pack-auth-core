/**
 * Stub for @/lib/feature-pack-schemas
 *
 * This is a type-only stub for feature pack compilation.
 * At runtime, the consuming application provides the actual implementation
 * which is auto-generated from feature pack schemas.
 *
 * This stub re-exports from the local schema file for type checking.
 */

// Re-export from the actual schema file for type checking during build
export {
  // Tables
  locationTypes,
  locations,
  divisions,
  departments,
  userOrgAssignments,

  // Location Type types
  type LocationType,
  type InsertLocationType,
  type UpdateLocationType,

  // Location types
  type Location,
  type InsertLocation,
  type UpdateLocation,

  // Division types
  type Division,
  type InsertDivision,
  type UpdateDivision,

  // Department types
  type Department,
  type InsertDepartment,
  type UpdateDepartment,

  // User Org Assignment types
  type UserOrgAssignment,
  type InsertUserOrgAssignment,
  type UpdateUserOrgAssignment,

  // Org scope types
  type OrgDimensionKind,
  type OrgScope,
  type OwnershipScope,

  // Default data
  DEFAULT_LOCATION_TYPES,
} from "../schema/org-dimensions";
