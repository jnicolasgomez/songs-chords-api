import type { Request } from "express";

export type OwnedResource = {
  user_uid?: string;
  shared_with?: string[];
};

export function getUid(req: Request): string {
  const uid = (req as any).uid;
  if (!uid) {
    throw Object.assign(new Error("INVALID_SESSION"), { status: 403 });
  }
  return uid;
}

// Like getUid, but for routes served through optionalAuth: returns undefined
// for anonymous callers instead of throwing.
export function getOptionalUid(req: Request): string | undefined {
  return (req as any).uid as string | undefined;
}

export function canEdit(resource: OwnedResource | null | undefined, uid: string): boolean {
  if (!resource) return false;
  if (resource.user_uid === uid) return true;
  return Array.isArray(resource.shared_with) && resource.shared_with.includes(uid);
}

export function assertCanEdit(resource: OwnedResource | null | undefined, uid: string): void {
  if (!canEdit(resource, uid)) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }
}

export function assertOwner(resource: OwnedResource | null | undefined, uid: string): void {
  if (!resource || resource.user_uid !== uid) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }
}
