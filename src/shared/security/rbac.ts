/**
 * RBAC — Role-Based Access Control
 *
 * P0/P1: Centralized role definitions and permission checks.
 * Replaces scattered `role === "ADMIN"` checks throughout the codebase.
 *
 * Roles hierarchy (from least to most privileged):
 *   USER → EDITOR → REVIEWER → MODERATOR → ADMIN → SUPER_ADMIN
 */

export type Role = "USER" | "EDITOR" | "REVIEWER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export const ROLE_HIERARCHY: Record<Role, number> = {
  USER: 0,
  EDITOR: 10,
  REVIEWER: 20,
  MODERATOR: 30,
  ADMIN: 40,
  SUPER_ADMIN: 50,
};

/**
 * Permission definitions.
 * Each permission maps to the minimum role required.
 */
export const PERMISSIONS = {
  // Content
  CREATE_QUESTION: "EDITOR" as Role,
  EDIT_QUESTION: "EDITOR" as Role,
  DELETE_QUESTION: "ADMIN" as Role,
  PUBLISH_QUESTION: "REVIEWER" as Role,
  REVIEW_QUESTION: "REVIEWER" as Role,
  IMPORT_QUESTIONS: "EDITOR" as Role,
  GENERATE_QUESTIONS_AI: "EDITOR" as Role,

  // Banks
  CREATE_BANK: "EDITOR" as Role,
  EDIT_BANK: "ADMIN" as Role,
  DELETE_BANK: "ADMIN" as Role,

  // Exams
  CREATE_EXAM: "EDITOR" as Role,
  EDIT_EXAM: "ADMIN" as Role,
  DELETE_EXAM: "ADMIN" as Role,

  // Moderation
  VIEW_REPORTS: "MODERATOR" as Role,
  RESOLVE_REPORTS: "MODERATOR" as Role,
  BAN_USER: "ADMIN" as Role,

  // Users
  VIEW_USERS: "ADMIN" as Role,
  CHANGE_USER_ROLE: "ADMIN" as Role,
  DELETE_USER: "SUPER_ADMIN" as Role,

  // System
  VIEW_ANALYTICS: "ADMIN" as Role,
  BROADCAST_EMAIL: "ADMIN" as Role,
  EXPORT_DATA: "ADMIN" as Role,
  VIEW_AUDIT_LOG: "SUPER_ADMIN" as Role,
  MANAGE_SUBSCRIPTIONS: "ADMIN" as Role,
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission.
 * Uses hierarchy: higher roles inherit lower roles' permissions.
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const userRole = role.toUpperCase() as Role;
  if (!(userRole in ROLE_HIERARCHY)) return false;

  const requiredRole = PERMISSIONS[permission];
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a role is staff (can manage content).
 */
export function isStaff(role: string | undefined): boolean {
  if (!role) return false;
  return hasPermission(role, "CREATE_QUESTION");
}

/**
 * Check if a role is admin level.
 */
export function isAdmin(role: string | undefined): boolean {
  if (!role) return false;
  return hasPermission(role, "VIEW_USERS");
}

/**
 * Require a specific permission, throw if not met.
 * Use in API routes for clean guard clauses.
 */
export function requirePermission(role: string | undefined, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionError(`Permission requise: ${permission}`);
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

/**
 * Require ownership or admin override.
 * Use for resources that belong to a specific user.
 */
export function requireOwnershipOrAdmin(
  resourceOwnerId: string | null | undefined,
  requesterId: string | undefined,
  requesterRole: string | undefined,
): void {
  const isOwner = resourceOwnerId && requesterId && resourceOwnerId === requesterId;
  const isAdminLevel = isAdmin(requesterRole);
  if (!isOwner && !isAdminLevel) {
    throw new PermissionError("Accès refusé: vous n'êtes pas propriétaire de cette ressource");
  }
}
