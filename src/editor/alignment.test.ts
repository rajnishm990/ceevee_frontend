// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { PageInfo, SpanMeta } from "../api/types";

const fixtures = new URL("../test/fixtures/", import.meta.url);
const pdf = new Uint8Array(readFileSync(new URL("sample.pdf", fixtures)));
const layout = JSON.parse(readFileSync(new URL("sample.layout.json", fixtures), "utf8")) as {
  coordinate_map: Record<string, SpanMeta>;
  page_info: PageInfo[];
};

async function load() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs.getDocument({ data: pdf.slice(), useSystemFonts: true, verbosity: 0 }).promise;
}

describe("pdf.js and PyMuPDF agree on geometry (so overlays line up with the canvas)", () => {
  it("reports the same page sizes", async () => {
    const doc = await load();
    for (let i = 0; i < layout.page_info.length; i++) {
      const view = (await doc.getPage(i + 1)).getViewport({ scale: 1 });
      expect(view.width).toBeCloseTo(layout.page_info[i].width, 1);
      expect(view.height).toBeCloseTo(layout.page_info[i].height, 1);
    }
  });

  it("places every text run at the origin PyMuPDF recorded", async () => {
    const doc = await load();
    let matched = 0;
    for (const [id, meta] of Object.entries(layout.coordinate_map)) {
      const page = await doc.getPage(meta.page + 1);
      const view = page.getViewport({ scale: 1 });
      const items = (await page.getTextContent()).items as { str: string; transform: number[] }[];
      const item = items.find((it) => it.str.trim() === meta.text.trim());
      expect(item, `span ${id} (${meta.text}) not found by pdf.js`).toBeDefined();
      const x = item!.transform[4];
      const baselineY = view.height - item!.transform[5];
      expect(Math.abs(x - meta.origin[0]), `${id} x`).toBeLessThan(1);
      expect(Math.abs(baselineY - meta.origin[1]), `${id} baseline`).toBeLessThan(1);
      matched++;
    }
    expect(matched).toBe(Object.keys(layout.coordinate_map).length);
  });
});
