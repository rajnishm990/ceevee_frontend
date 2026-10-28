// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

const live = Boolean(import.meta.env.VITE_API_BASE);

describe.skipIf(!live)("frontend client against the live backend", () => {
  let api: typeof import("../api/api").api;
  let client: typeof import("../api/client");
  const email = `live-${Date.now()}@example.com`;
  const pdf = readFileSync(new URL("fixtures/sample.pdf", import.meta.url));
  const ctx: { sectionId?: number; versionId?: number; slug?: string; spanId?: string } = {};

  beforeAll(async () => {
    ({ api } = await import("../api/api"));
    client = await import("../api/client");
  });

  it("registers and logs in", async () => {
    const user = await api.register(email, "supersecret123");
    expect(user.email).toBe(email);
  });

  it("creates a section and uploads a PDF", async () => {
    const section = await api.createSection("Backend", "https://drive.google.com/x");
    ctx.sectionId = section.id;
    ctx.slug = section.shareable_slug;
    const version = await api.uploadVersion(section.id, new File([pdf], "resume.pdf", { type: "application/pdf" }), "First");
    ctx.versionId = version.id;
    ctx.spanId = Object.keys(version.content)[0];
    expect(version.revision).toBe(1);
    expect(Object.keys(version.content)).toHaveLength(7);
    expect((await api.section(section.id)).active_version_id).toBe(version.id);
  });

  it("surfaces validation errors from the server", async () => {
    await expect(api.createSection("Backend")).rejects.toMatchObject({ status: 409 });
    await expect(api.updateSection(ctx.sectionId!, { gdrive_link: "javascript:alert(1)" })).rejects.toMatchObject({ status: 422 });
  });

  it("previews without saving, then saves with the revision", async () => {
    const blob = await api.previewVersion(ctx.versionId!, { [ctx.spanId!]: "Alicia Johnson" });
    expect(blob.type).toBe("application/pdf");
    expect((await api.version(ctx.versionId!)).revision).toBe(1);
    const saved = await api.saveVersion(ctx.versionId!, { [ctx.spanId!]: "Alicia Johnson" }, 1);
    expect(saved.revision).toBe(2);
    expect(saved.content[ctx.spanId!]).toBe("Alicia Johnson");
  });

  it("rejects a stale save with 409 and unrenderable text with 400", async () => {
    await expect(api.saveVersion(ctx.versionId!, { [ctx.spanId!]: "stale" }, 1)).rejects.toMatchObject({ status: 409 });
    await expect(api.saveVersion(ctx.versionId!, { [ctx.spanId!]: "日本語" }, 2)).rejects.toMatchObject({ status: 400 });
  });

  it("serves the edited PDF on the public link without auth", async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/v1/public/${ctx.slug}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("makes the same share link serve whichever version is active", async () => {
    const bytes = async (blobP: Promise<Blob>) => Buffer.from(await (await blobP).arrayBuffer());
    const publicBytes = async () => Buffer.from(await (await fetch(`${import.meta.env.VITE_API_BASE}/api/v1/public/${ctx.slug}`)).arrayBuffer());
    const v2 = await api.uploadVersion(ctx.sectionId!, new File([pdf], "resume2.pdf", { type: "application/pdf" }), "Second");
    const edited = await bytes(api.versionPdf(ctx.versionId!));
    const untouched = await bytes(api.versionPdf(v2.id));
    expect(edited.equals(untouched)).toBe(false);
    expect((await publicBytes()).equals(edited)).toBe(true);
    await api.setActive(ctx.sectionId!, v2.id);
    expect((await publicBytes()).equals(untouched)).toBe(true);
    await api.setActive(ctx.sectionId!, ctx.versionId!);
    expect((await publicBytes()).equals(edited)).toBe(true);
    await api.deleteVersion(v2.id);
  });

  it("recovers from an expired access token via the refresh token", async () => {
    const refresh = store.get("ceevee.refresh")!;
    client.session.set("not-a-valid-token", refresh);
    expect((await api.me()).email).toBe(email);
  });

  it("manages profile and cover letters", async () => {
    await api.saveProfile({ full_name: "Alice", github_url: "https://github.com/alice", other_links: [], custom_fields: [{ label: "Notice", value: "30 days" }] });
    expect((await api.profile()).custom_fields?.[0]?.value).toBe("30 days");
    const letter = await api.createCoverLetter({ name: "General", body: "Dear {{company}}", is_default: true });
    expect((await api.updateCoverLetter(letter.id, { body: "Hi {{company}}" })).body).toBe("Hi {{company}}");
    await api.deleteCoverLetter(letter.id);
    expect(await api.coverLetters()).toEqual([]);
  });

  it("deletes the version, then the account", async () => {
    await api.deleteVersion(ctx.versionId!);
    expect((await api.section(ctx.sectionId!)).active_version_id).toBeNull();
    await api.deleteAccount("supersecret123");
    client.session.clear();
    await expect(api.me()).rejects.toMatchObject({ status: 401 });
  });
});
