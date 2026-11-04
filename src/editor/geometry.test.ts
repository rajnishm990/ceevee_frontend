import { describe, expect, it } from "vitest";

import type { SpanMeta } from "../api/types";
import { cssColor, describeFont, dirtyContent, isEditable, spanStyle } from "./geometry";

const meta: SpanMeta = {
  page: 0, bbox: [50, 80, 150, 96], origin: [50, 92], font: "Helvetica", flags: 0, size: 12, color: 0x336699, text: "Hello",
};

describe("spanStyle", () => {
  it("scales the bounding box and font size by the page scale", () => {
    const style = spanStyle(meta, 2);
    expect(style).toMatchObject({ left: 100, top: 160, minWidth: 200, height: 32, fontSize: 24 });
  });

  it("exposes the span colour as a CSS variable", () => {
    expect((spanStyle(meta, 1) as Record<string, unknown>)["--span-color"]).toBe("#336699");
  });
});

describe("cssColor", () => {
  it("pads short values", () => expect(cssColor(0)).toBe("#000000"));
  it("renders white", () => expect(cssColor(0xffffff)).toBe("#ffffff"));
});

describe("describeFont mirrors the backend font picker", () => {
  it.each([
    [0, "Arial", "sans", false, false],
    [16, "Arial-Bold", "sans", true, false],
    [2, "Arial-Italic", "sans", false, true],
    [4, "Whatever", "serif", false, false],
    [20, "X", "serif", true, false],
    [8, "Consolas", "mono", false, false],
    [0, "Times-Roman", "serif", false, false],
  ])("flags=%i name=%s", (flags, name, family, bold, italic) => {
    expect(describeFont(flags, name)).toEqual({ family, bold, italic });
  });
});

describe("dirtyContent", () => {
  it("returns only changed ids", () => {
    expect(dirtyContent({ a: "1", b: "x", c: "3" }, { a: "1", b: "2", c: "3" })).toEqual({ b: "x" });
  });
  it("is empty when nothing changed", () => expect(dirtyContent({ a: "1" }, { a: "1" })).toEqual({}));
});

describe("isEditable", () => {
  it("requires text and unrotated pages", () => {
    expect(isEditable([{ rotation: 0 }], 3)).toBe(true);
    expect(isEditable([{ rotation: 0 }], 0)).toBe(false);
    expect(isEditable([{ rotation: 0 }, { rotation: 90 }], 3)).toBe(false);
  });
});
