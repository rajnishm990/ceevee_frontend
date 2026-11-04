import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api/api";
import { useAuth } from "../auth/AuthContext";
import { CopyButton, shortUrl } from "./common";

type Item = [string, string | null | undefined];

function Group({ title, items }: { title: string; items: Item[] }) {
  const shown = items.filter((i): i is [string, string] => Boolean(i[1]));
  if (shown.length === 0) return null;
  return (
    <div className="idgroup">
      <div className="eyebrow">{title}</div>
      {shown.map(([label, value], i) => (
        <div className="iditem" key={`${label}-${i}`}>
          <span className="k">{label}</span>
          {/^https?:\/\//.test(value) ? <a className="v" href={value} target="_blank" rel="noopener noreferrer">{shortUrl(value)}</a> : <span className="v" title={value}>{value}</span>}
          <CopyButton text={value} message={`${label} copied`} />
        </div>
      ))}
    </div>
  );
}

export default function IdentityPanel() {
  const { user } = useAuth();
  const p = useQuery({ queryKey: ["profile"], queryFn: api.profile }).data;
  const name = p?.full_name || user?.email || "";
  const links: Item[] = [["LinkedIn", p?.linkedin_url], ["GitHub", p?.github_url], ["Website", p?.website_url], ...(p?.other_links ?? []).map((l): Item => [l.label, l.url])];
  const empty = !p || [p.contact_email, p.phone, p.location, p.linkedin_url, p.github_url, p.website_url].every((x) => !x) && !p.other_links?.length && !p.custom_fields?.length;

  return (
    <aside className="identity" aria-label="Your details">
      <div className="monogram" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
      <h2>{name}</h2>
      {p?.headline && <div className="headline">{p.headline}</div>}
      <Group title="Contact" items={[["Email", p?.contact_email ?? user?.email], ["Phone", p?.phone], ["Location", p?.location]]} />
      <Group title="Links" items={links} />
      <Group title="Details" items={(p?.custom_fields ?? []).map((f): Item => [f.label, f.value])} />
      {empty && <p className="muted small-text" style={{ marginTop: 18 }}>Add your links and details once, then copy them into any application.</p>}
      <Link to="/profile" style={{ display: "inline-block", marginTop: 18, fontWeight: 600, fontSize: 13.5 }}>{empty ? "Add your details" : "Edit details"} →</Link>
    </aside>
  );
}
