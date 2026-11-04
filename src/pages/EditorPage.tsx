import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { api } from "../api/api";
import { ApiError } from "../api/client";
import type { PageInfo, SectionWithVersions, SpanMeta, Version } from "../api/types";
import { download, ErrorBanner } from "../components/common";
import { Icon, useToast } from "../components/ui";
import { dirtyContent, isEditable } from "../editor/geometry";
import PdfViewer from "../editor/PdfViewer";
import SpanOverlay from "../editor/SpanOverlay";

const ZOOMS = [640, 760, 900, 1040, 1200];

function Editor({ version, original, section, maxVersions }: { version: Version; original: ArrayBuffer; section: SectionWithVersions; maxVersions: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const alreadyForked = Boolean((useLocation().state as { forked?: boolean } | null)?.forked);

  const [values, setValues] = useState<Record<string, string>>(version.content);
  const [preview, setPreview] = useState<ArrayBuffer | null>(null);
  const [makeActive, setMakeActive] = useState(true);
  const [zoom, setZoom] = useState(2);

  const spans = version.coordinate_map as unknown as Record<string, SpanMeta>;
  const pages = version.page_info as unknown as PageInfo[];
  const editable = isEditable(pages, Object.keys(spans).length);
  const dirty = useMemo(() => dirtyContent(values, version.content), [values, version.content]);
  const dirtyCount = Object.keys(dirty).length;
  const current = section.versions.find((v) => v.id === version.id);
  const nextNumber = Math.max(0, ...section.versions.map((v) => v.version_number)) + 1;
  const full = !alreadyForked && section.versions.length >= maxVersions;

  const save = useMutation({
    mutationFn: async () =>
      alreadyForked
        ? { forked: false, version: await api.saveVersion(version.id, dirty, version.revision) }
        : { forked: true, version: await api.forkVersion(version.id, dirty, makeActive) },
    onSuccess: ({ forked, version: saved }) => {
      qc.setQueryData(["version", saved.id], saved);
      qc.removeQueries({ queryKey: ["thumb", saved.id] });
      void qc.invalidateQueries({ queryKey: ["section"] });
      void qc.invalidateQueries({ queryKey: ["sections"] });
      if (forked) {
        toast.show(`Saved as v${saved.version_number}${makeActive ? " and set as active" : ""}`);
        navigate(`/versions/${saved.id}/edit`, { replace: true, state: { forked: true } });
      } else {
        toast.show("Changes saved");
      }
    },
  });
  const render = useMutation({
    mutationFn: async () => (await api.previewVersion(version.id, dirty)).arrayBuffer(),
    onSuccess: setPreview,
  });
  const conflict = save.error instanceof ApiError && save.error.status === 409 && alreadyForked;

  const onChange = useCallback((id: string, text: string) => setValues((v) => ({ ...v, [id]: text })), []);
  const saveNow = useCallback(() => {
    if (dirtyCount > 0 && !save.isPending && !preview && !full) save.mutate();
  }, [dirtyCount, save, preview, full]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveNow(); }
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

  const title = `${section.domain_name} · v${version.version_number}${current?.label ? ` · ${current.label}` : ""}`;

  return (
    <div className="bench">
      <div className="editorbar">
        <Link to={`/sections/${version.section_id}`} className="row" style={{ gap: 6, textDecoration: "none", fontWeight: 600 }}><Icon name="back" />Back</Link>
        <span className="title">{title}</span>
        {dirtyCount > 0 ? <span className="chip paused"><i className="dot" />{dirtyCount} unsaved change{dirtyCount > 1 ? "s" : ""}</span> : <span className="chip">No unsaved changes</span>}
        <span className="spacer" />

        <div className="segment" role="group" aria-label="Mode">
          <button aria-pressed={!preview} onClick={() => setPreview(null)}>Edit</button>
          <button aria-pressed={Boolean(preview)} disabled={!editable || render.isPending} onClick={() => render.mutate()}>{render.isPending ? "Rendering…" : "Preview"}</button>
        </div>
        <div className="row" style={{ gap: 2 }}>
          <button className="iconbtn ghost" aria-label="Zoom out" disabled={zoom === 0} onClick={() => setZoom((z) => z - 1)}><Icon name="minus" /></button>
          <button className="iconbtn ghost" aria-label="Zoom in" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => z + 1)}><Icon name="plus" /></button>
        </div>
        <button className="ghost" onClick={async () => download(await api.versionPdf(version.id), `resume-v${version.version_number}.pdf`)}><Icon name="download" />Download</button>
        {!alreadyForked && (
          <label className="row small-text" style={{ gap: 6 }}>
            <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} />Set as active
          </label>
        )}
        <button className="ghost" onClick={() => setValues(version.content)} disabled={!dirtyCount}>Discard</button>
        <button className="primary" onClick={saveNow} disabled={!dirtyCount || save.isPending || Boolean(preview) || full}>
          {save.isPending ? "Saving…" : alreadyForked ? "Save changes" : `Save as v${nextNumber}`}
        </button>
      </div>

      <div className="stage">
        <div className="hintbar">
          {conflict ? (
            <div className="banner error" role="alert">This version was changed in another tab. <button className="small" onClick={reload}>Discard my changes and reload</button></div>
          ) : (
            <ErrorBanner error={save.error ?? render.error} />
          )}
          {full && <div className="banner warn">This section has reached its version limit. Delete an old version before saving a new one.</div>}
          {!editable && <div className="banner error">This PDF has no editable text or uses rotated pages, so it is view-only.</div>}
          {editable && !preview && (
            <div className="banner info">
              <span>
                {alreadyForked
                  ? <>You are editing <strong>v{version.version_number}</strong>. Changes save to this version.</>
                  : <>Click any text to edit it. Saving creates <strong>v{nextNumber}</strong>; v{version.version_number} stays exactly as it is.</>}
              </span>
              <span className="muted">Ctrl/Cmd+S saves.</span>
            </div>
          )}
          {preview && <div className="banner info">Previewing the exact PDF your edits will produce. Switch back to Edit to keep working.</div>}
        </div>

        <PdfViewer
          data={preview ?? original}
          pages={pages}
          maxWidth={ZOOMS[zoom]}
          overlay={(page, scale) => preview || !editable ? null : <SpanOverlay page={page} scale={scale} spans={spans} values={values} saved={version.content} onChange={onChange} />}
        />
      </div>
    </div>
  );
}

export default function EditorPage() {
  const id = Number(useParams().versionId);
  const version = useQuery({ queryKey: ["version", id], queryFn: () => api.version(id), staleTime: Infinity });
  const original = useQuery({ queryKey: ["version-original", id], queryFn: async () => (await api.versionPdf(id, "original")).arrayBuffer(), staleTime: Infinity, gcTime: 0 });
  const sectionId = version.data?.section_id;
  const section = useQuery({ queryKey: ["section", sectionId], queryFn: () => api.section(sectionId!), enabled: sectionId !== undefined });
  const limits = useQuery({ queryKey: ["limits"], queryFn: api.limits, staleTime: Infinity });

  const error = version.error ?? original.error ?? section.error;
  if (error) return <main className="page"><ErrorBanner error={error} /></main>;
  if (!version.data || !original.data || !section.data) return <main className="page"><p className="muted">Loading editor…</p></main>;
  return <Editor key={version.data.id} version={version.data} original={original.data} section={section.data} maxVersions={limits.data?.max_versions_per_section ?? 20} />;
}
