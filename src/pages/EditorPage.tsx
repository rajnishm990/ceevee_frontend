import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/api";
import { ApiError } from "../api/client";
import type { PageInfo, SpanMeta, Version } from "../api/types";
import { ErrorBanner, download } from "../components/common";
import { dirtyContent, isEditable } from "../editor/geometry";
import PdfViewer from "../editor/PdfViewer";
import SpanOverlay from "../editor/SpanOverlay";

function Editor({ version, original }: { version: Version; original: ArrayBuffer }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(version.content);
  const [preview, setPreview] = useState<ArrayBuffer | null>(null);
  const [savedAt, setSavedAt] = useState(false);

  const spans = version.coordinate_map as unknown as Record<string, SpanMeta>;
  const pages = version.page_info as unknown as PageInfo[];
  const editable = isEditable(pages, Object.keys(spans).length);
  const dirty = useMemo(() => dirtyContent(values, version.content), [values, version.content]);
  const dirtyCount = Object.keys(dirty).length;

  const save = useMutation({
    mutationFn: () => api.saveVersion(version.id, dirty, version.revision),
    onSuccess: (saved) => {
      qc.setQueryData(["version", version.id], saved);
      void qc.invalidateQueries({ queryKey: ["section"] });
      setSavedAt(true);
    },
  });
  const showPreview = useMutation({
    mutationFn: async () => (await api.previewVersion(version.id, dirty)).arrayBuffer(),
    onSuccess: setPreview,
  });
  const conflict = save.error instanceof ApiError && save.error.status === 409;

  const onChange = useCallback((id: string, text: string) => {
    setSavedAt(false);
    setValues((v) => ({ ...v, [id]: text }));
  }, []);

  const saveNow = useCallback(() => {
    if (dirtyCount > 0 && !save.isPending && !preview) save.mutate();
  }, [dirtyCount, save, preview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  useEffect(() => {
    if (dirtyCount === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyCount]);

  async function reload() {
    save.reset();
    const fresh = await api.version(version.id);
    qc.setQueryData(["version", version.id], fresh);
    setValues(fresh.content);
  }

  return (
    <>
      <p><Link to={`/sections/${version.section_id}`}>← Back to section</Link></p>
      <div className="toolbar">
        <strong>v{version.version_number}{version.label ? ` · ${version.label}` : ""}</strong>
        <span className="muted">
          {preview ? "Previewing the final PDF" : dirtyCount ? `${dirtyCount} unsaved change(s)` : savedAt ? "Saved" : "No changes"}
        </span>
        <span className="spacer" />
        {preview ? (
          <button onClick={() => setPreview(null)}>Back to editing</button>
        ) : (
          <>
            <button onClick={() => setValues(version.content)} disabled={!dirtyCount}>Revert</button>
            <button onClick={() => showPreview.mutate()} disabled={!editable || showPreview.isPending}>
              {showPreview.isPending ? "Rendering…" : "Preview"}
            </button>
            <button className="primary" onClick={saveNow} disabled={!dirtyCount || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </>
        )}
        <button onClick={async () => download(await api.versionPdf(version.id), `resume-v${version.version_number}.pdf`)}>Download</button>
      </div>

      {conflict ? (
        <div className="banner error" role="alert">
          This version was changed elsewhere (another tab or device). <button className="small" onClick={reload}>Discard my changes and reload</button>
        </div>
      ) : (
        <ErrorBanner error={save.error ?? showPreview.error} />
      )}
      {!editable && <div className="banner error">This PDF has no editable text or uses rotated pages, so it is view-only.</div>}
      {!preview && editable && <p className="muted">Click any text on the page to edit it. Press Ctrl/Cmd+S to save.</p>}

      <PdfViewer
        data={preview ?? original}
        pages={pages}
        overlay={(page, scale) =>
          preview || !editable ? null : (
            <SpanOverlay page={page} scale={scale} spans={spans} values={values} saved={version.content} onChange={onChange} />
          )
        }
      />
    </>
  );
}

export default function EditorPage() {
  const id = Number(useParams().versionId);
  const version = useQuery({ queryKey: ["version", id], queryFn: () => api.version(id), staleTime: Infinity });
  const original = useQuery({
    queryKey: ["version-original", id],
    queryFn: async () => (await api.versionPdf(id, "original")).arrayBuffer(),
    staleTime: Infinity,
    gcTime: 0,
  });

  if (version.error || original.error) return <ErrorBanner error={version.error ?? original.error} />;
  if (!version.data || !original.data) return <p className="muted">Loading editor…</p>;
  return <Editor version={version.data} original={original.data} />;
}
