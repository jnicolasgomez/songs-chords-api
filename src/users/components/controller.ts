import { getAuth } from "firebase-admin/auth";

export default function () {
  async function lookupByEmail(email: string): Promise<{ uid: string; email: string; displayName?: string }> {
    const userRecord = await getAuth().getUserByEmail(email);
    return {
      uid: userRecord.uid,
      email: userRecord.email!,
      displayName: userRecord.displayName,
    };
  }

  async function getByUid(uid: string): Promise<{ uid: string; email?: string; displayName?: string }> {
    const userRecord = await getAuth().getUser(uid);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    };
  }

  return { lookupByEmail, getByUid };
}
