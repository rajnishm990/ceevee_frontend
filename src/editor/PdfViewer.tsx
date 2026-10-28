import type { PDFDocumentProxy } from "pdfjs-dist";
import { ReactNode, useEffect, useRef, useState } from "react";

import type { PageInfo } from "../api/types";

interface Props {
  data: ArrayBuffer;
  pages: PageInfo[];
  maxWidth?: number;
  overlay: (pageIndex: number, scale: number) => ReactNode;
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  return pdfjs;
}

function PageCanvas({ doc, index, width, scale }: { doc: PDFDocumentProxy; index: number; width: number; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: { cancel: () => void; promise: Promise<unknown> } | undefined;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(index + 1);
      if (cancelled || !ref.current) return;
      const ratio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * ratio });
      const canvas = ref.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${width}px`;
      task = page.render({ canvasContext: canvas.getContext("2d")!, viewport });
      await task.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, index, width, scale]);
  return <canvas ref={ref} />;
}

export default function PdfViewer({ data, pages, maxWidth = 900, overlay }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(maxWidth);

  useEffect(() => {
    let destroyed = false;
    let loaded: PDFDocumentProxy | null = null;
    setError(null);
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        loaded = await pdfjs.getDocument({ data: data.slice(0) }).promise;
        if (destroyed) await loaded.destroy();
        else setDoc(loaded);
      } catch (e) {
        if (!destroyed) setError(e instanceof Error ? e.message : "Could not render this PDF");
      }
    })();
    return () => {
      destroyed = true;
      void loaded?.destroy();
    };
  }, [data]);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setAvailable(el.clientWidth));
    observer.observe(el);
    setAvailable(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  if (error) return <div className="banner error">{error}</div>;
  const width = Math.min(maxWidth, available || maxWidth);

  return (
    <div className="pages" ref={holder}>
      {doc &&
        pages.map((info, i) => {
          const scale = width / info.width;
          return (
            <div key={i} className="pdfpage" style={{ width, height: info.height * scale }}>
              <PageCanvas doc={doc} index={i} width={width} scale={scale} />
              {overlay(i, scale)}
            </div>
          );
        })}
    </div>
  );
}
