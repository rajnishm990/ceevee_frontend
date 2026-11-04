import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, publicUrl } from "../api/api";
import type { VersionSummary } from "../api/types";
import { CopyButton, ErrorBanner, download, shortUrl, timeAgo } from "../components/common";
import Sheet from "../components/Sheet";
import { Icon, Switch, useConfirm, useToast } from "../components/ui";

function UploadZone({ busy, disabled, onFile }: { busy: boolean; disabled: boolean; onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  };
  return (
    <div
      className={`dropzone${over ? " over" : ""}`}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      style={disabled ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
    >
      <span className="ico"><Icon name="upload" size={18} /></span>
      <div className="grow">
        <strong>{busy ? "Uploading…" : disabled ? "Version limit reached" : "Upload a new version"}</strong>
        <div className="muted small-text">{disabled ? "Delete an old version to add another." : "Drop a PDF here or click to browse. Text-based PDFs are editable."}</div>
      </div>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

function VersionRow({ v, active, busy, onActivate, onRelabel, onDelete, onDownload }: {
  v: VersionSummary; active: boolean; busy: boolean;
  onActivate: () => void; onRelabel: (label: string) => void; onDelete: () => void; onDownload: () => void;
}) {
  return (
    <li className={`vrow${active ? " isactive" : ""}`} style={{ listStyle: "none" }}>
      <Sheet versionId={v.id} mini label={`Version ${v.version_number} preview`} />
      <span className="vnum">v{v.version_number}</span>
      <div className="grow">
        <input
          className="labelinput"
          key={`${v.id}-${v.label ?? ""}`}
          aria-label={`Label for version ${v.version_number}`}
          defaultValue={v.label ?? ""}
          placeholder="Add a label, e.g. For fintech roles"
          maxLength={100}
          onBlur={(e) => e.target.value.trim() !== (v.label ?? "") && onRelabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <div className="muted small-text">Created {timeAgo(v.created_at)}</div>
      </div>
      {active ? <span className="chip active"><i className="dot" />Active</span> : <button className="small" disabled={busy} onClick={onActivate}>Make active</button>}
      <div className="actions">
        <Link to={`/versions/${v.id}/edit`}><button className="small primary" tabIndex={-1}><Icon name="edit" size={14} />Edit</button></Link>
        <button className="iconbtn ghost" aria-label={`Download version ${v.version_number}`} title="Download" onClick={onDownload}><Icon name="download" size={16} /></button>
        <button className="iconbtn ghost" aria-label={`Delete version ${v.version_number}`} title="Delete" onClick={onDelete}><Icon name="trash" size={16} /></button>
      </div>
    </li>
  );
}

export default function SectionPage() {
  const id = Number(useParams().sectionId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const section = useQuery({ queryKey: ["section", id], queryFn: () => api.section(id) });
  const limits = useQuery({ queryKey: ["limits"], queryFn: api.limits, staleTime: Infinity });
  const [name, setName] = useState("");
  const [gdrive, setGdrive] = useState("");

  useEffect(() => {
    if (section.data) {
      setName(section.data.domain_name);
      setGdrive(section.data.gdrive_link ?? "");
    }
  }, [section.data]);

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["section"] }), qc.invalidateQueries({ queryKey: ["sections"] })]);
  const update = useMutation({ mutationFn: (patch: Parameters<typeof api.updateSection>[1]) => api.updateSection(id, patch), onSuccess: refresh });
  const rotate = useMutation({ mutationFn: () => api.rotateSlug(id), onSuccess: async () => { await refresh(); toast.show("New share link created"); } });
  const remove = useMutation({ mutationFn: () => api.deleteSection(id), onSuccess: async () => { await refresh(); navigate("/"); } });
  const upload = useMutation({ mutationFn: (file: File) => api.uploadVersion(id, file), onSuccess: async () => { await refresh(); toast.show("Version uploaded"); } });
  const activate = useMutation({ mutationFn: (vid: number) => api.setActive(id, vid), onSuccess: async () => { await refresh(); toast.show("Active version changed. Your link now shows it."); } });
  const relabel = useMutation({ mutationFn: (v: { id: number; label: string }) => api.setLabel(v.id, v.label.trim() || null), onSuccess: refresh });
  const removeVersion = useMutation({ mutationFn: (vid: number) => api.deleteVersion(vid), onSuccess: async () => { await refresh(); toast.show("Version deleted"); } });
  const downloadPdf = useMutation({ mutationFn: async (v: VersionSummary) => download(await api.versionPdf(v.id), `${section.data?.domain_name ?? "resume"}-v${v.version_number}.pdf`) });

  const s = section.data;
  const error = section.error ?? update.error ?? rotate.error ?? remove.error ?? upload.error ?? activate.error ?? relabel.error ?? removeVersion.error ?? downloadPdf.error;
  if (!s) return <main className="page">{section.isLoading ? <p className="muted">Loading…</p> : <ErrorBanner error={section.error} />}</main>;

  const max = limits.data?.max_versions_per_section ?? 20;
  const used = s.versions.length;
  const share = publicUrl(s.shareable_slug);
  const active = s.versions.find((v) => v.id === s.active_version_id);

  async function onDeleteVersion(v: VersionSummary) {
    const wasActive = v.id === s!.active_version_id;
    const ok = await confirm({
      title: `Delete version ${v.version_number}?`,
      message: wasActive ? "This is the active version. Until you pick another, your share link will show nothing." : "This permanently removes the version and its file.",
      confirmLabel: "Delete version", danger: true,
    });
    if (ok) removeVersion.mutate(v.id);
  }

  return (
    <main className="page">
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Resumes</Link><span>/</span><span>{s.domain_name}</span></nav>
      <div className="pagehead">
        <div className="grow">
          <input className="titleinput" aria-label="Section name" value={name} maxLength={50} onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name.trim() !== s.domain_name && update.mutate({ domain_name: name.trim() })}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
          <div className="row" style={{ marginTop: 6, gap: 8 }}>
            {s.sharing_enabled ? <span className="chip live"><i className="dot" />Link live</span> : <span className="chip paused"><i className="dot" />Link paused</span>}
            <span className="muted">{active ? `Showing v${active.version_number}${active.label ? ` · ${active.label}` : ""}` : "No active version"}</span>
          </div>
        </div>
      </div>
      <ErrorBanner error={error} />

      <div className="panelgrid">
        <section aria-label="Versions">
          <UploadZone busy={upload.isPending} disabled={used >= max} onFile={(f) => upload.mutate(f)} />
          <div className="row" style={{ marginTop: 18, justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 20 }}>Versions</h2>
            <span className="muted small-text">{used} of {max} used</span>
          </div>
          <div className={`meter${used >= max ? " full" : ""}`} style={{ marginTop: 8 }} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={used} aria-label="Versions used"><i style={{ width: `${Math.min(100, (used / max) * 100)}%` }} /></div>
          {used === 0 && <div className="emptystate" style={{ marginTop: 16 }}><h3>No versions yet</h3><p>Upload your resume PDF. The first one becomes active automatically.</p></div>}
          <ul className="vlist" style={{ padding: 0, margin: "16px 0 0" }}>
            {[...s.versions].sort((a, b) => b.version_number - a.version_number).map((v) => (
              <VersionRow key={v.id} v={v} active={v.id === s.active_version_id} busy={activate.isPending}
                onActivate={() => activate.mutate(v.id)} onRelabel={(label) => relabel.mutate({ id: v.id, label })}
                onDelete={() => onDeleteVersion(v)} onDownload={() => downloadPdf.mutate(v)} />
            ))}
          </ul>
        </section>

        <aside className="side" aria-label="Sharing and settings">
          <div className="card">
            <h3>Share link</h3>
            <p className="muted small-text" style={{ margin: "0 0 12px" }}>Always shows the active version. Switching versions never changes this link.</p>
            <a className="urlbox" href={share} target="_blank" rel="noopener noreferrer">{shortUrl(share)}</a>
            <div className="row" style={{ marginTop: 10 }}>
              <CopyButton text={share} label="Copy link" message="Share link copied" className="small" />
              <a href={share} target="_blank" rel="noopener noreferrer"><button className="small" tabIndex={-1}><Icon name="external" size={14} />Open</button></a>
            </div>
            <div className="row" style={{ marginTop: 14, justifyContent: "space-between" }}>
              <label htmlFor="live-switch" style={{ fontWeight: 550 }}>{s.sharing_enabled ? "Link is live" : "Link is paused"}</label>
              <Switch label="Share link enabled" checked={s.sharing_enabled} onChange={(on) => update.mutate({ sharing_enabled: on })} />
            </div>
            <button className="small" style={{ marginTop: 14 }} onClick={async () => (await confirm({ title: "Create a new link?", message: "The current link stops working immediately. Anyone you already sent it to will need the new one.", confirmLabel: "Create new link", danger: true })) && rotate.mutate()}>
              <Icon name="refresh" size={14} />Create a new link
            </button>
          </div>

          <div className="card">
            <h3>Google Drive link</h3>
            <p className="muted small-text" style={{ margin: "0 0 12px" }}>Optional. Shown on your dashboard so you can copy it quickly.</p>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input className="grow" aria-label="Google Drive link" placeholder="https://drive.google.com/…" value={gdrive} onChange={(e) => setGdrive(e.target.value)} />
              <button disabled={update.isPending || gdrive.trim() === (s.gdrive_link ?? "")} onClick={() => update.mutate({ gdrive_link: gdrive.trim() || null })}>Save</button>
            </div>
          </div>

          <div className="card">
            <h3>Delete section</h3>
            <p className="muted small-text" style={{ margin: "0 0 12px" }}>Removes every version and the share link.</p>
            <button className="danger" onClick={async () => (await confirm({ title: `Delete “${s.domain_name}”?`, message: "All versions and files are permanently removed, and the share link stops working.", confirmLabel: "Delete section", danger: true })) && remove.mutate()}>
              <Icon name="trash" size={15} />Delete section
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
