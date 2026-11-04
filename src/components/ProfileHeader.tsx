import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api/api";
import { useAuth } from "../auth/AuthContext";
import { CopyButton } from "./common";

export default function ProfileHeader() {
  const { user } = useAuth();
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const p = profile.data;

  const items: [string, string | null | undefined][] = [
    ["Email", p?.contact_email ?? user?.email],
    ["Phone", p?.phone],
    ["Location", p?.location],
    ["LinkedIn", p?.linkedin_url],
    ["GitHub", p?.github_url],
    ["Website", p?.website_url],
    ...(p?.other_links ?? []).map((l): [string, string] => [l.label, l.url]),
    ...(p?.custom_fields ?? []).map((f): [string, string] => [f.label, f.value]),
  ];
  const shown = items.filter((i): i is [string, string] => Boolean(i[1]));

  return (
    <div className="card profileheader">
      <div className="row">
        <div className="grow">
          <h1 style={{ margin: 0 }}>{p?.full_name || user?.email}</h1>
          {p?.headline && <div className="muted">{p.headline}</div>}
        </div>
        <Link to="/profile">Edit details</Link>
      </div>
      {shown.length === 0 ? (
        <p className="muted">Add your links and details so you can copy them into applications. <Link to="/profile">Add details</Link></p>
      ) : (
        <div className="chips">
          {shown.map(([label, value], i) => (
            <span className="chip" key={`${label}-${i}`}>
              <span className="muted">{label}</span>
              {/^https?:\/\//.test(value) ? <a href={value} target="_blank" rel="noopener noreferrer">{value.replace(/^https?:\/\/(www\.)?/, "")}</a> : <span>{value}</span>}
              <CopyButton text={value} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
