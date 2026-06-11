import controllerFactory from "../controller.ts";
import type { UserProfile } from "../controller.ts";
import type { Store } from "../../../songs/types/types.ts";

jest.mock("../../../store/firestore.ts", () => ({}));
jest.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    getUser: jest.fn(async (uid: string) => ({
      uid,
      email: `${uid}@example.com`,
      displayName: `User ${uid}`,
    })),
    getUserByEmail: jest.fn(async (email: string) => ({
      uid: "u-by-email",
      email,
      displayName: "By Email",
    })),
  }),
}));

type MockProfileStore = Store<UserProfile> & { _data: Map<string, UserProfile> };

function makeMockStore(seed: UserProfile[] = []): MockProfileStore {
  const data = new Map<string, UserProfile>(seed.map((p) => [p.uid, p]));
  return {
    async list() {
      return [...data.values()];
    },
    async get(_table: string, id: string) {
      return data.get(id) ?? null;
    },
    async upsert(_table: string, body: UserProfile & { id: string }) {
      data.set(body.id, { ...(data.get(body.id) ?? {}), ...body } as UserProfile);
      return { id: body.id };
    },
    async query() {
      return [];
    },
    async byUserId() {
      return [];
    },
    async listPublic() {
      return [];
    },
    async byIdsArray() {
      return [];
    },
    async sharedWithUser() {
      return [];
    },
    _data: data,
  };
}

describe("updateProfile", () => {
  test("rejects unknown roles with 400", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await expect(
      controller.updateProfile("u1", { roles: ["singer", "bagpipes"] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test("rejects a non-array roles payload with 400", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await expect(
      controller.updateProfile("u1", { roles: "singer" as unknown }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test("deduplicates roles before persisting", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    const result = await controller.updateProfile("u1", {
      roles: ["singer", "guitarist", "singer"],
    });

    expect(result.roles).toEqual(["singer", "guitarist"]);
    expect(store._data.get("u1")?.roles).toEqual(["singer", "guitarist"]);
  });

  test("accepts an empty array (clears roles)", async () => {
    const store = makeMockStore([
      { uid: "u1", roles: ["singer"] },
    ]);
    const controller = controllerFactory(store);

    const result = await controller.updateProfile("u1", { roles: [] });

    expect(result.roles).toEqual([]);
    expect(store._data.get("u1")?.roles).toEqual([]);
  });

  test("writes uid and updated_at to the store", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);
    const before = Date.now();

    await controller.updateProfile("u1", { roles: ["drummer"] });

    const stored = store._data.get("u1")!;
    expect(stored.uid).toBe("u1");
    expect(stored.updated_at).toBeGreaterThanOrEqual(before);
  });
});

describe("getProfile", () => {
  test("returns empty roles when no document exists", async () => {
    const controller = controllerFactory(makeMockStore());
    await expect(controller.getProfile("nobody")).resolves.toEqual({ roles: [] });
  });

  test("returns stored roles", async () => {
    const controller = controllerFactory(
      makeMockStore([{ uid: "u1", roles: ["singer", "guitarist"] }]),
    );
    await expect(controller.getProfile("u1")).resolves.toEqual({
      roles: ["singer", "guitarist"],
    });
  });
});

describe("getByUid", () => {
  test("returns auth record fields without roles", async () => {
    const controller = controllerFactory(
      makeMockStore([{ uid: "u1", roles: ["bassist"] }]),
    );

    const info = await controller.getByUid("u1");

    expect(info).toEqual({
      uid: "u1",
      email: "u1@example.com",
      displayName: "User u1",
    });
  });
});
