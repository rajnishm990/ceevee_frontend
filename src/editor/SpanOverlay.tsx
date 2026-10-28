import type { SpanMeta } from "../api/types";
import { spanStyle } from "./geometry";

interface Props {
  page: number;
  scale: number;
  spans: Record<string, SpanMeta>;
  values: Record<string, string>;
  saved: Record<string, string>;
  readOnly?: boolean;
  onChange: (id: string, text: string) => void;
}

export default function SpanOverlay({ page, scale, spans, values, saved, readOnly, onChange }: Props) {
  return (
    <div className="overlay">
      {Object.entries(spans)
        .filter(([, meta]) => meta.page === page)
        .map(([id, meta]) => {
          const value = values[id] ?? meta.text;
          const classes = ["span-input"];
          if (value !== meta.text) classes.push("edited");
          if (value !== saved[id]) classes.push("unsaved");
          return (
            <input
              key={id}
              data-span-id={id}
              className={classes.join(" ")}
              style={spanStyle(meta, scale)}
              value={value}
              size={Math.max(1, value.length)}
              readOnly={readOnly}
              tabIndex={readOnly ? -1 : 0}
              aria-label={`Text: ${meta.text}`}
              spellCheck={false}
              onChange={(e) => onChange(id, e.target.value)}
            />
          );
        })}
    </div>
  );
}
