import controllerFactory from "../controller.ts";
import { CreateBandRequestSchema } from "../../types/types.ts";
import type { Band } from "../../types/types.ts";
import { makeMockStore } from "./mockStore.ts";

// Prevent mongoStore from calling connect() at import time.
jest.mock("../../../store/mongoStore.ts", () => ({}));

const OWNER = "u1";
const MEMBER = "u2";
const OUTSIDER = "u3";

const baseBand: Band = {
  id: "band-1",
  name: "The Cats",
  created_by: OWNER,
  members: [OWNER, MEMBER],
  created_at: "2026-01-01T00:00:00.000Z",
  image_url: "https://example.com/cats.png",
};

describe("CreateBandRequestSchema", () => {
  test("accepts a minimal payload with just a name", () => {
    const result = CreateBandRequestSchema.safeParse({ name: "The Cats" });
    expect(result.success).toBe(true);
  });

  test("accepts members array and a valid image_url", () => {
    const result = CreateBandRequestSchema.safeParse({
      name: "The Cats",
      members: ["u1", "u2"],
      image_url: "https://example.com/cover.jpg",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an empty name", () => {
    const result = CreateBandRequestSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  test("rejects a non-URL image_url", () => {
    const result = CreateBandRequestSchema.safeParse({
      name: "The Cats",
      image_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-array members", () => {
    const result = CreateBandRequestSchema.safeParse({
      name: "The Cats",
      members: "u1",
    });
    expect(result.success).toBe(false);
  });
});

describe("createBand", () => {
  test("creates a band with a generated id and defaults members to the creator", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    const { id } = await controller.createBand({
      name: "New Band",
      created_by: OWNER,
    });

    const stored = store._data.get(id)!;
    expect(stored.name).toBe("New Band");
    expect(stored.created_by).toBe(OWNER);
    expect(stored.members).toEqual([OWNER]);
    expect(stored.created_at).toEqual(expect.any(String));
    expect(stored.image_url).toBeUndefined();
  });

  test("persists image_url when provided", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    const { id } = await controller.createBand({
      name: "New Band",
      created_by: OWNER,
      image_url: "https://example.com/x.png",
    });

    expect(store._data.get(id)!.image_url).toBe("https://example.com/x.png");
  });

  test("uses provided members array verbatim", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    const { id } = await controller.createBand({
      name: "New Band",
      created_by: OWNER,
      members: [OWNER, MEMBER],
    });

    expect(store._data.get(id)!.members).toEqual([OWNER, MEMBER]);
  });
});

describe("updateBand", () => {
  test("creator can update name and image_url", async () => {
    const store = makeMockStore([{ ...baseBand }]);
    const controller = controllerFactory(store);

    const updated = await controller.updateBand(
      "band-1",
      { name: "Renamed", image_url: "https://example.com/new.png" },
      OWNER,
    );

    expect(updated.name).toBe("Renamed");
    expect(updated.image_url).toBe("https://example.com/new.png");
    expect(store._data.get("band-1")!.name).toBe("Renamed");
    expect(store._data.get("band-1")!.image_url).toBe("https://example.com/new.png");
  });

  test("members can update the band", async () => {
    const store = makeMockStore([{ ...baseBand }]);
    const controller = controllerFactory(store);

    const updated = await controller.updateBand(
      "band-1",
      { name: "Member rename" },
      MEMBER,
    );

    expect(updated.name).toBe("Member rename");
  });

  test("rejects updates from a non-member, non-creator", async () => {
    const store = makeMockStore([{ ...baseBand }]);
    const controller = controllerFactory(store);

    await expect(
      controller.updateBand("band-1", { name: "Hijacked" }, OUTSIDER),
    ).rejects.toMatchObject({ status: 403 });

    expect(store._data.get("band-1")!.name).toBe("The Cats");
  });

  test("throws 404 when the band does not exist", async () => {
    const store = makeMockStore();
    const controller = controllerFactory(store);

    await expect(
      controller.updateBand("missing", { name: "x" }, OWNER),
    ).rejects.toMatchObject({ status: 404 });
  });

  test("omitting a patch field leaves it unchanged", async () => {
    const store = makeMockStore([{ ...baseBand }]);
    const controller = controllerFactory(store);

    const updated = await controller.updateBand(
      "band-1",
      { name: "Only renamed" },
      OWNER,
    );

    expect(updated.name).toBe("Only renamed");
    expect(updated.image_url).toBe(baseBand.image_url);
  });

  test("does not mutate created_by or members", async () => {
    const store = makeMockStore([{ ...baseBand }]);
    const controller = controllerFactory(store);

    await controller.updateBand(
      "band-1",
      { name: "Renamed" },
      OWNER,
    );

    const stored = store._data.get("band-1")!;
    expect(stored.created_by).toBe(OWNER);
    expect(stored.members).toEqual([OWNER, MEMBER]);
  });
});
