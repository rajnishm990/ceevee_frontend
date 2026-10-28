import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, publicUrl } from "../api/api";
import { CopyButton, ErrorBanner, download } from "../components/common";

function UploadBox({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function drop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      className={`dropzone${over ? " over" : ""}`}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
    >
      {busy ? "Uploading…" : "Drop a PDF here, or click to choose one"}
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function SectionPage() {
  const id = Number(useParams().sectionId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const section = useQuery({ queryKey: ["section", id], queryFn: () => api.section(id) });
  const [name, setName] = useState("");
  const [gdrive, setGdrive] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (section.data) {
      setName(section.data.domain_name);
      setGdrive(section.data.gdrive_link ?? "");
    }
  }, [section.data]);

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["section"] }), qc.invalidateQueries({ queryKey: ["sections"] })]);
  const opts = { onSuccess: refresh };

  const save = useMutation({ mutationFn: () => api.updateSection(id, { domain_name: name.trim(), gdrive_link: gdrive.trim() || null }), ...opts });
  const toggle = useMutation({ mutationFn: (on: boolean) => api.updateSection(id, { sharing_enabled: on }), ...opts });
  const rotate = useMutation({ mutationFn: () => api.rotateSlug(id), ...opts });
  const remove = useMutation({ mutationFn: () => api.deleteSection(id), onSuccess: async () => { await refresh(); navigate("/"); } });
  const upload = useMutation({ mutationFn: (file: File) => api.uploadVersion(id, file, label.trim() || undefined), onSuccess: () => { setLabel(""); return refresh(); } });
  const activate = useMutation({ mutationFn: (versionId: number) => api.setActive(id, versionId), ...opts });
  const relabel = useMutation({ mutationFn: (v: { id: number; label: string }) => api.setLabel(v.id, v.label.trim() || null), ...opts });
  const removeVersion = useMutation({ mutationFn: (versionId: number) => api.deleteVersion(versionId), ...opts });
  const downloadPdf = useMutation({ mutationFn: async (v: { id: number; n: number }) => download(await api.versionPdf(v.id), `${section.data?.domain_name ?? "resume"}-v${v.n}.pdf`) });

  const s = section.data;
  const error = section.error ?? save.error ?? toggle.error ?? rotate.error ?? remove.error ?? upload.error ?? activate.error ?? relabel.error ?? removeVersion.error ?? downloadPdf.error;
  if (!s) return <>{section.isLoading ? <p className="muted">Loading…</p> : <ErrorBanner error={section.error} />}</>;

  return (
    <>
      <p><Link to="/">← All sections</Link></p>
      <h1>{s.domain_name}</h1>
      <ErrorBanner error={error} />

      <div className="card">
        <div className="row">
          <input className="grow" aria-label="Section name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="grow" aria-label="Google Drive link" placeholder="Google Drive link" value={gdrive} onChange={(e) => setGdrive(e.target.value)} />
          <button onClick={() => save.mutate()} disabled={save.isPending}>Save</button>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label><input type="checkbox" checked={s.sharing_enabled} onChange={(e) => toggle.mutate(e.target.checked)} /> Share link enabled</label>
          <span className="muted grow" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{publicUrl(s.shareable_slug)}</span>
          <CopyButton text={publicUrl(s.shareable_slug)} />
          <button className="small" onClick={() => window.confirm("The current link will stop working. Continue?") && rotate.mutate()}>New link</button>
        </div>
      </div>

      <h2>Versions</h2>
      <div className="row" style={{ marginBottom: 8 }}>
        <input className="grow" placeholder="Label for the next upload (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <UploadBox busy={upload.isPending} onFile={(f) => upload.mutate(f)} />

      <table style={{ marginTop: 14 }}>
        <thead><tr><th>Active</th><th>Version</th><th>Label</th><th>Created</th><th /></tr></thead>
        <tbody>
          {[...s.versions].reverse().map((v) => (
            <tr key={v.id}>
              <td><input type="radio" name="active" aria-label={`Make v${v.version_number} active`} checked={v.id === s.active_version_id} onChange={() => activate.mutate(v.id)} /></td>
              <td>v{v.version_number}</td>
              <td>
                <input
                  key={`${v.id}-${v.label ?? ""}`}
                  defaultValue={v.label ?? ""}
                  placeholder="Add a label"
                  onBlur={(e) => e.target.value !== (v.label ?? "") && relabel.mutate({ id: v.id, label: e.target.value })}
                />
              </td>
              <td className="muted">{new Date(v.created_at).toLocaleDateString()}</td>
              <td className="row">
                <Link to={`/versions/${v.id}/edit`}>Edit</Link>
                <button className="small" onClick={() => downloadPdf.mutate({ id: v.id, n: v.version_number })}>Download</button>
                <button className="small danger" onClick={() => window.confirm(`Delete v${v.version_number}?`) && removeVersion.mutate(v.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {s.versions.length === 0 && <p className="muted">Upload your first PDF. The first one becomes active automatically.</p>}

      <h2>Danger zone</h2>
      <button className="danger" onClick={() => window.confirm(`Delete "${s.domain_name}" and all its versions?`) && remove.mutate()}>Delete section</button>
    </>
  );
}
