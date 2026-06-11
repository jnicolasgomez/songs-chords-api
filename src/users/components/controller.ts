import { getAuth } from "firebase-admin/auth";
import * as firestore from "../../store/firestore.ts";
import type { Store } from "../../songs/types/types.ts";

const USERS_TABLE = process.env.USERS_TABLE_NAME || "users";

export const BAND_ROLES = [
  "singer",
  "guitarist",
  "bassist",
  "drummer",
  "keyboardist",
  "other",
] as const;
export type BandRole = (typeof BAND_ROLES)[number];

export interface UserProfile {
  id?: string;
  uid: string;
  roles: BandRole[];
  updated_at?: number;
}

export interface UserInfo {
  uid: string;
  email?: string;
  displayName?: string;
  roles?: BandRole[];
}

export default function (selectedStore?: Store<UserProfile>) {
  const injectedStore: Store<UserProfile> =
    selectedStore || (firestore as unknown as Store<UserProfile>);

  async function lookupByEmail(email: string): Promise<UserInfo> {
    const userRecord = await getAuth().getUserByEmail(email);
    return {
      uid: userRecord.uid,
      email: userRecord.email!,
      displayName: userRecord.displayName,
    };
  }

  async function getByUid(uid: string): Promise<UserInfo> {
    const [userRecord, profile] = await Promise.all([
      getAuth().getUser(uid),
      injectedStore.get(USERS_TABLE, uid) as Promise<UserProfile | null>,
    ]);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      roles: profile?.roles ?? [],
    };
  }

  async function getProfile(uid: string): Promise<{ roles: BandRole[] }> {
    const profile = (await injectedStore.get(USERS_TABLE, uid)) as UserProfile | null;
    return { roles: profile?.roles ?? [] };
  }

  async function updateProfile(
    uid: string,
    body: { roles?: unknown },
  ): Promise<{ roles: BandRole[] }> {
    if (!Array.isArray(body.roles)) {
      throw Object.assign(new Error("roles must be an array"), { status: 400 });
    }
    const seen = new Set<string>();
    const validated: BandRole[] = [];
    for (const r of body.roles) {
      if (typeof r !== "string" || !(BAND_ROLES as readonly string[]).includes(r)) {
        throw Object.assign(new Error(`Unknown role: ${String(r)}`), { status: 400 });
      }
      if (seen.has(r)) continue;
      seen.add(r);
      validated.push(r as BandRole);
    }
    await injectedStore.upsert(USERS_TABLE, {
      id: uid,
      uid,
      roles: validated,
      updated_at: Date.now(),
    });
    return { roles: validated };
  }

  return { lookupByEmail, getByUid, getProfile, updateProfile };
}
