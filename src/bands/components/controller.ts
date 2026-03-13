import * as store from "../../store/mongoStore.ts";
import type { Store } from "../../songs/types/types.ts";
import type { Band } from "../types/types.ts";

const BANDS_TABLE = process.env.BANDS_TABLE_NAME || "bands";

export default function (injectedStore?: Store<Band>) {
  let selectedStore: Store<Band> = store as unknown as Store<Band>;
  selectedStore = injectedStore || selectedStore;

  async function createBand(body: { name: string; created_by: string; members?: string[] }): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    const band: Band = {
      id,
      name: body.name,
      created_by: body.created_by,
      members: body.members ?? [body.created_by],
      created_at: new Date().toISOString(),
    };
    return selectedStore.upsert(BANDS_TABLE, band as any);
  }

  async function getBandById(id: string): Promise<Band | null> {
    return selectedStore.get(BANDS_TABLE, id);
  }

  async function getBandsByUser(userId: string): Promise<Band[]> {
    return selectedStore.query(BANDS_TABLE, { members: userId });
  }

  async function addMember(bandId: string, userId: string): Promise<Band> {
    const band = await selectedStore.get(BANDS_TABLE, bandId);
    if (!band) {
      throw Object.assign(new Error(`Band ${bandId} not found`), { status: 404 });
    }
    const members = band.members ?? [];
    if (!members.includes(userId)) {
      members.push(userId);
    }
    const updated = { ...band, members };
    await selectedStore.upsert(BANDS_TABLE, updated as any);
    return updated;
  }

  async function removeMember(bandId: string, userId: string): Promise<Band> {
    const band = await selectedStore.get(BANDS_TABLE, bandId);
    if (!band) {
      throw Object.assign(new Error(`Band ${bandId} not found`), { status: 404 });
    }
    const members = (band.members ?? []).filter((m) => m !== userId);
    const updated = { ...band, members };
    await selectedStore.upsert(BANDS_TABLE, updated as any);
    return updated;
  }

  return {
    createBand,
    getBandById,
    getBandsByUser,
    addMember,
    removeMember,
  };
}
