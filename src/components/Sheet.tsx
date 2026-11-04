import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { api } from "../api/api";
import { loadPdfjs } from "../editor/pdfjs";
import { Icon } from "./ui";

function Thumbnail({ versionId, width }: { versionId: number; width: number }) {
  const pdf = useQuery({ queryKey: ["thumb", versionId], queryFn: async () => (await api.versionPdf(versionId)).arrayBuffer(), staleTime: 5 * 60_000 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (pdf.error) setState("failed");
    if (!pdf.data || !canvas.current) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const doc = await pdfjs.getDocument({ data: pdf.data.slice(0) }).promise;
        const page = await doc.getPage(1);
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (width * 2) / natural.width });
        const el = canvas.current;
        if (cancelled || !el) return;
        el.width = Math.floor(viewport.width);
        el.height = Math.floor(viewport.height);
        await page.render({ canvasContext: el.getContext("2d")!, viewport }).promise;
        void doc.destroy();
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => { cancelled = true; };
  }, [pdf.data, pdf.error, width]);

  if (state === "failed") return <span className="paper skeleton" style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}><Icon name="eye" size={18} /></span>;
  return (
    <span className={`paper${state === "loading" ? " skeleton" : ""}`}>
      <canvas ref={canvas} aria-hidden="true" style={{ visibility: state === "ready" ? "visible" : "hidden" }} />
    </span>
  );
}

export default function Sheet({ versionId, versions = 1, mini = false, label }: { versionId: number | null; versions?: number; mini?: boolean; label?: string }) {
  const stack = mini ? "" : versions >= 3 ? " stack-3" : versions === 2 ? " stack-2" : "";
  if (versionId === null) {
    return <span className={`sheet blank${mini ? " mini" : ""}`}><span className="paper">{mini ? "" : "No resume yet"}</span></span>;
  }
  return (
    <span className={`sheet${stack}${mini ? " mini" : ""}`} role="img" aria-label={label ?? "Resume preview"}>
      <Thumbnail versionId={versionId} width={mini ? 52 : 128} />
    </span>
  );
}
