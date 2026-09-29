import { describe, it, expect } from "vitest";
import {
  hasPermission,
  isStaff,
  isAdmin,
  requirePermission,
  requireOwnershipOrAdmin,
  PermissionError,
} from "../rbac";

describe("hasPermission", () => {
  it("VISITOR (rôle inconnu de la hiérarchie) n'a aucune permission", () => {
    expect(hasPermission("VISITOR", "CREATE_QUESTION")).toBe(false);
    expect(hasPermission("VISITOR", "VIEW_USERS")).toBe(false);
  });

  it("absence de rôle → refus", () => {
    expect(hasPermission(undefined, "CREATE_QUESTION")).toBe(false);
    expect(hasPermission("", "CREATE_QUESTION")).toBe(false);
  });

  it("hiérarchie : les rôles supérieurs héritent des permissions inférieures", () => {
    // CREATE_QUESTION requiert EDITOR
    expect(hasPermission("USER", "CREATE_QUESTION")).toBe(false);
    expect(hasPermission("EDITOR", "CREATE_QUESTION")).toBe(true);
    expect(hasPermission("REVIEWER", "CREATE_QUESTION")).toBe(true);
    expect(hasPermission("ADMIN", "CREATE_QUESTION")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "CREATE_QUESTION")).toBe(true);
  });

  it("les rôles inférieurs ne montent pas dans la hiérarchie", () => {
    // VIEW_USERS requiert ADMIN
    expect(hasPermission("EDITOR", "VIEW_USERS")).toBe(false);
    expect(hasPermission("MODERATOR", "VIEW_USERS")).toBe(false);
    expect(hasPermission("ADMIN", "VIEW_USERS")).toBe(true);
  });

  it("SUPER_ADMIN seul dispose de DELETE_USER et VIEW_AUDIT_LOG", () => {
    expect(hasPermission("ADMIN", "DELETE_USER")).toBe(false);
    expect(hasPermission("SUPER_ADMIN", "DELETE_USER")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "VIEW_AUDIT_LOG")).toBe(true);
  });

  it("est insensible à la casse", () => {
    expect(hasPermission("admin", "VIEW_USERS")).toBe(true);
    expect(hasPermission("editor", "CREATE_QUESTION")).toBe(true);
  });
});

describe("isStaff / isAdmin", () => {
  it("isStaff : EDITOR et au-dessus", () => {
    expect(isStaff("VISITOR")).toBe(false);
    expect(isStaff("USER")).toBe(false);
    expect(isStaff("EDITOR")).toBe(true);
    expect(isStaff("ADMIN")).toBe(true);
  });

  it("isAdmin : ADMIN et au-dessus", () => {
    expect(isAdmin("MODERATOR")).toBe(false);
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("SUPER_ADMIN")).toBe(true);
  });
});

describe("requirePermission", () => {
  it("passe silencieusement quand la permission est présente", () => {
    expect(() => requirePermission("ADMIN", "BAN_USER")).not.toThrow();
  });

  it("lève une PermissionError sinon", () => {
    expect(() => requirePermission("USER", "BAN_USER")).toThrow(PermissionError);
    expect(() => requirePermission(undefined, "VIEW_USERS")).toThrow(
      /Permission requise/,
    );
  });
});

describe("requireOwnershipOrAdmin", () => {
  it("le propriétaire accède à sa ressource", () => {
    expect(() =>
      requireOwnershipOrAdmin("u1", "u1", "USER"),
    ).not.toThrow();
  });

  it("un admin accède à toute ressource", () => {
    expect(() =>
      requireOwnershipOrAdmin("u1", "u2", "ADMIN"),
    ).not.toThrow();
    expect(() =>
      requireOwnershipOrAdmin("u1", "u2", "SUPER_ADMIN"),
    ).not.toThrow();
  });

  it("un autre utilisateur est refusé", () => {
    expect(() => requireOwnershipOrAdmin("u1", "u2", "USER")).toThrow(
      PermissionError,
    );
    expect(() => requireOwnershipOrAdmin("u1", "u2", "MODERATOR")).toThrow(
      /propriétaire/,
    );
  });

  it("ressource sans propriétaire : seul un admin passe", () => {
    expect(() => requireOwnershipOrAdmin(null, "u1", "USER")).toThrow(
      PermissionError,
    );
    expect(() => requireOwnershipOrAdmin(null, "u1", "ADMIN")).not.toThrow();
  });
});
