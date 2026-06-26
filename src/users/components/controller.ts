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
  currentStreak?: number; // streak as of lastPracticedDate
  longestStreak?: number; // best streak ever reached
  lastPracticedDate?: string; // "YYYY-MM-DD" (client local date)
}

export interface UserInfo {
  uid: string;
  email?: string;
  displayName?: string;
}

export interface PracticeRecord {
  currentStreak: number;
  longestStreak: number;
  lastPracticedDate: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Shift a "YYYY-MM-DD" date string by a number of days using UTC math (TZ-independent). */
function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Pure streak transition. Given the previously stored streak fields and the
 * client's local `today` (YYYY-MM-DD), returns the next streak state.
 */
export function nextStreak(
  prev: Pick<UserProfile, "currentStreak" | "longestStreak" | "lastPracticedDate">,
  today: string,
): { currentStreak: number; longestStreak: number; lastPracticedDate: string } {
  const yesterday = addDays(today, -1);
  let current: number;
  if (prev.lastPracticedDate === today) {
    current = prev.currentStreak ?? 1; // idempotent same-day
  } else if (prev.lastPracticedDate === yesterday) {
    current = (prev.currentStreak ?? 0) + 1;
  } else {
    current = 1; // first practice or streak broken → restart at 1
  }
  const longest = Math.max(prev.longestStreak ?? 0, current);
  return { currentStreak: current, longestStreak: longest, lastPracticedDate: today };
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
    const userRecord = await getAuth().getUser(uid);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
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

  async function getPractice(uid: string): Promise<PracticeRecord> {
    const profile = (await injectedStore.get(USERS_TABLE, uid)) as UserProfile | null;
    return {
      currentStreak: profile?.currentStreak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      lastPracticedDate: profile?.lastPracticedDate ?? null,
    };
  }

  async function recordPractice(uid: string, date: unknown): Promise<PracticeRecord> {
    if (typeof date !== "string" || !DATE_RE.test(date)) {
      throw Object.assign(new Error("date must be a YYYY-MM-DD string"), { status: 400 });
    }
    const profile = (await injectedStore.get(USERS_TABLE, uid)) as UserProfile | null;
    const streak = nextStreak(profile ?? {}, date);
    await injectedStore.upsert(USERS_TABLE, {
      id: uid,
      uid,
      ...streak,
      updated_at: Date.now(),
    });
    return { ...streak };
  }

  return { lookupByEmail, getByUid, getProfile, updateProfile, getPractice, recordPractice };
}
