import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api, publicUrl } from "../api/api";
import type { SectionWithVersions } from "../api/types";
import { CopyButton, ErrorBanner, download } from "./common";
import PdfIcon from "./PdfIcon";

function LinkRow({ label, url, hint }: { label: string; url: string | null; hint?: string }) {
  return (
    <div className="linkrow">
      <span className="muted linklabel">{label}</span>
      {url ? (
        <>
          <a className="grow ellipsis" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
          <CopyButton text={url} />
        </>
      ) : (
        <span className="muted grow">{hint}</span>
      )}
    </div>
  );
}

export default function SectionCard({ section }: { section: SectionWithVersions }) {
  const qc = useQueryClient();
  const versions = [...section.versions].sort((a, b) => b.version_number - a.version_number);
  const active = versions.find((v) => v.id === section.active_version_id);

  const setActive = useMutation({
    mutationFn: (versionId: number) => api.setActive(section.id, versionId),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["sections"] }), qc.invalidateQueries({ queryKey: ["section"] })]),
  });
  const downloadActive = useMutation({
    mutationFn: async () => download(await api.versionPdf(active!.id), `${section.domain_name}-v${active!.version_number}.pdf`),
  });

  return (
    <div className="card sectioncard">
      <div className="row">
        <Link to={`/sections/${section.id}`} target="_blank" rel="noopener noreferrer" className="cardtitle">
          {section.domain_name}
        </Link>
        {!section.sharing_enabled && <span className="badge">Share link paused</span>}
      </div>

      <div className="pdftile">
        <PdfIcon />
        {active ? (
          <>
            <div className="grow">
              <div>{section.domain_name}-v{active.version_number}.pdf</div>
              <div className="muted">{active.label ?? "No label"} · added {new Date(active.created_at).toLocaleDateString()}</div>
            </div>
            <button onClick={() => downloadActive.mutate()} disabled={downloadActive.isPending}>Download</button>
          </>
        ) : (
          <div className="grow muted">No resume yet. Open the section to upload one.</div>
        )}
      </div>

      {versions.length > 0 && (
        <div className="row" style={{ margin: "10px 0" }}>
          <label htmlFor={`active-${section.id}`} className="muted linklabel">Active version</label>
          <select
            id={`active-${section.id}`}
            value={section.active_version_id ?? ""}
            disabled={setActive.isPending}
            onChange={(e) => setActive.mutate(Number(e.target.value))}
          >
            {!active && <option value="" disabled>Choose a version…</option>}
            {versions.map((v) => (
              <option key={v.id} value={v.id}>v{v.version_number}{v.label ? ` · ${v.label}` : ""}</option>
            ))}
          </select>
          <span className="muted">Your share link always serves this version.</span>
        </div>
      )}

      <LinkRow label="Share link" url={publicUrl(section.shareable_slug)} />
      <LinkRow label="Drive link" url={section.gdrive_link} hint="No Drive link yet. Add one in the section." />
      <ErrorBanner error={setActive.error ?? downloadActive.error} />
    </div>
  );
}
