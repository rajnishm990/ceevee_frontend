import type { CSSProperties } from "react";

import type { SpanMeta } from "../api/types";

export type Family = "sans" | "serif" | "mono";

const SERIF_HINTS = ["times", "georgia", "garamond", "cambria", "palatino", "minion"];

export function describeFont(flags: number, fontName: string): { family: Family; bold: boolean; italic: boolean } {
  const name = fontName.toLowerCase();
  let family: Family = "sans";
  if (flags & 8 || name.includes("mono") || name.includes("courier")) family = "mono";
  else if (flags & 4 || SERIF_HINTS.some((h) => name.includes(h))) family = "serif";
  return {
    family,
    bold: Boolean(flags & 16) || name.includes("bold"),
    italic: Boolean(flags & 2) || name.includes("italic") || name.includes("oblique"),
  };
}

const FAMILY_CSS: Record<Family, string> = {
  sans: "Helvetica, Arial, sans-serif",
  serif: '"Times New Roman", Times, serif',
  mono: '"Courier New", Courier, monospace',
};

export function cssColor(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
}

export function spanStyle(meta: SpanMeta, scale: number): CSSProperties {
  const [x0, y0, x1, y1] = meta.bbox;
  const font = describeFont(meta.flags, meta.font);
  return {
    left: x0 * scale,
    top: y0 * scale,
    minWidth: (x1 - x0) * scale,
    height: (y1 - y0) * scale,
    fontSize: meta.size * scale,
    lineHeight: `${(y1 - y0) * scale}px`,
    fontFamily: FAMILY_CSS[font.family],
    fontWeight: font.bold ? 700 : 400,
    fontStyle: font.italic ? "italic" : "normal",
    ["--span-color" as string]: cssColor(meta.color),
  };
}

export function dirtyContent(values: Record<string, string>, saved: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([id, text]) => text !== saved[id]));
}

export function isEditable(pages: { rotation: number }[], spanCount: number): boolean {
  return spanCount > 0 && pages.every((p) => p.rotation === 0);
}
