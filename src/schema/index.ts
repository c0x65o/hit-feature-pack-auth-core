/**
 * Auth Core Schema Exports
 *
 * Re-exports all schema definitions for use by applications.
 */

export {
  // Tables
  locationTypes,
  locations,
  divisions,
  departments,
  userOrgAssignments,
  orgEntityScopes,

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

  // Entity Scope types
  type OrgEntityScope,
  type InsertOrgEntityScope,
  type UpdateOrgEntityScope,

  // Org scope types
  type OrgDimensionKind,
  type OrgScope,
  type OwnershipScope,

  // Default data
  DEFAULT_LOCATION_TYPES,
} from "./org-dimensions";
