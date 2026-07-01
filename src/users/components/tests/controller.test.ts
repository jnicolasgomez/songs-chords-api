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

describe("recordPractice", () => {
  test("first practice starts the streak at 1", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    const result = await controller.recordPractice("u1", "2026-06-25");

    expect(result).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
      lastPracticedDate: "2026-06-25",
    });
  });

  test("consecutive day increments the streak", async () => {
    const store = makeMockStore([
      { uid: "u1", roles: [], currentStreak: 3, longestStreak: 3, lastPracticedDate: "2026-06-24" },
    ]);
    const controller = controllerFactory(store);

    const result = await controller.recordPractice("u1", "2026-06-25");

    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
  });

  test("same-day repeat is idempotent", async () => {
    const store = makeMockStore([
      { uid: "u1", roles: [], currentStreak: 4, longestStreak: 4, lastPracticedDate: "2026-06-25" },
    ]);
    const controller = controllerFactory(store);

    const result = await controller.recordPractice("u1", "2026-06-25");

    expect(result.currentStreak).toBe(4);
  });

  test("a gap of 2+ days resets the streak to 1 but keeps longest", async () => {
    const store = makeMockStore([
      { uid: "u1", roles: [], currentStreak: 5, longestStreak: 5, lastPracticedDate: "2026-06-22" },
    ]);
    const controller = controllerFactory(store);

    const result = await controller.recordPractice("u1", "2026-06-25");

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(5);
  });

  test("preserves existing roles via merge upsert", async () => {
    const store = makeMockStore([{ uid: "u1", roles: ["drummer"] }]);
    const controller = controllerFactory(store);

    await controller.recordPractice("u1", "2026-06-25");

    expect(store._data.get("u1")?.roles).toEqual(["drummer"]);
  });

  test("first practice initializes empty roles", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await controller.recordPractice("u1", "2026-06-25");

    expect(store._data.get("u1")?.roles).toEqual([]);
  });

  test("rejects an invalid date with 400", async () => {
    const controller = controllerFactory(makeMockStore());

    await expect(controller.recordPractice("u1", "06/25/2026")).rejects.toMatchObject({
      status: 400,
    });
    await expect(controller.recordPractice("u1", 20260625 as unknown)).rejects.toMatchObject({
      status: 400,
    });
    await expect(controller.recordPractice("u1", "2026-02-30")).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe("getPractice", () => {
  test("returns zeros and null when the user has never practiced", async () => {
    const controller = controllerFactory(makeMockStore());

    await expect(controller.getPractice("nobody")).resolves.toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastPracticedDate: null,
    });
  });

  test("returns stored streak fields", async () => {
    const controller = controllerFactory(
      makeMockStore([
        { uid: "u1", roles: [], currentStreak: 7, longestStreak: 9, lastPracticedDate: "2026-06-25" },
      ]),
    );

    await expect(controller.getPractice("u1")).resolves.toEqual({
      currentStreak: 7,
      longestStreak: 9,
      lastPracticedDate: "2026-06-25",
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
