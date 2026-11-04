import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api, publicUrl } from "../api/api";
import type { SectionWithVersions } from "../api/types";
import { CopyButton, ErrorBanner, download, shortUrl, timeAgo } from "./common";
import Sheet from "./Sheet";
import { Icon } from "./ui";

export default function SectionCard({ section }: { section: SectionWithVersions }) {
  const qc = useQueryClient();
  const versions = [...section.versions].sort((a, b) => b.version_number - a.version_number);
  const active = versions.find((v) => v.id === section.active_version_id);
  const share = publicUrl(section.shareable_slug);
  const href = `/sections/${section.id}`;

  const setActive = useMutation({
    mutationFn: (versionId: number) => api.setActive(section.id, versionId),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["sections"] }), qc.invalidateQueries({ queryKey: ["section"] })]),
  });
  const downloadActive = useMutation({
    mutationFn: async () => download(await api.versionPdf(active!.id), `${section.domain_name}-v${active!.version_number}.pdf`),
  });

  return (
    <article className="card rcard">
      <Link to={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${section.domain_name}`} tabIndex={-1}>
        <Sheet versionId={active?.id ?? null} versions={versions.length} label={`${section.domain_name} preview`} />
      </Link>

      <div className="body">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h3><Link to={href} target="_blank" rel="noopener noreferrer">{section.domain_name}</Link></h3>
            {section.sharing_enabled ? <span className="chip live"><i className="dot" />Link live</span> : <span className="chip paused"><i className="dot" />Link paused</span>}
          </div>
          <div className="meta">
            {active ? <>v{active.version_number}{active.label ? ` · ${active.label}` : ""} · added {timeAgo(active.created_at)}</> : "Nothing uploaded yet"} · {versions.length} version{versions.length === 1 ? "" : "s"}
          </div>
        </div>

        {versions.length > 0 && (
          <div className="versionpick">
            <label htmlFor={`active-${section.id}`} className="small-text muted">Showing</label>
            <span className="select">
              <select id={`active-${section.id}`} value={section.active_version_id ?? ""} disabled={setActive.isPending} onChange={(e) => setActive.mutate(Number(e.target.value))}>
                {!active && <option value="" disabled>Choose a version…</option>}
                {versions.map((v) => <option key={v.id} value={v.id}>v{v.version_number}{v.label ? ` · ${v.label}` : ""}</option>)}
              </select>
              <Icon name="chevron" size={14} />
            </span>
          </div>
        )}

        <div className="linkrow">
          <span className="kind"><Icon name="link" size={14} />Share</span>
          <a className="ellipsis" href={share} target="_blank" rel="noopener noreferrer" title={share}>{shortUrl(share)}</a>
          <CopyButton text={share} message="Share link copied" />
        </div>
        {section.gdrive_link ? (
          <div className="linkrow">
            <span className="kind"><Icon name="drive" size={14} />Drive</span>
            <a className="ellipsis" href={section.gdrive_link} target="_blank" rel="noopener noreferrer" title={section.gdrive_link}>{shortUrl(section.gdrive_link)}</a>
            <CopyButton text={section.gdrive_link} message="Drive link copied" />
          </div>
        ) : (
          <div className="linkrow blank"><span className="kind"><Icon name="drive" size={14} />Drive</span>No Drive link yet</div>
        )}

        <ErrorBanner error={setActive.error ?? downloadActive.error} />
        <div className="cardfoot">
          {active && <button onClick={() => downloadActive.mutate()} disabled={downloadActive.isPending}><Icon name="download" />Download PDF</button>}
          <Link to={href} target="_blank" rel="noopener noreferrer"><button className="ghost" tabIndex={-1}>Manage <Icon name="external" size={14} /></button></Link>
        </div>
      </div>
    </article>
  );
}
