import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "../api/api";
import type { ProfileInput } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ErrorBanner } from "../components/common";

const EMPTY: ProfileInput = { other_links: [], custom_fields: [] };
const TEXT_FIELDS: [keyof ProfileInput, string][] = [
  ["full_name", "Full name"], ["headline", "Headline"], ["contact_email", "Contact email"], ["phone", "Phone"],
  ["location", "Location"], ["linkedin_url", "LinkedIn URL"], ["github_url", "GitHub URL"], ["website_url", "Website URL"],
];

export default function ProfilePage() {
  const qc = useQueryClient();
  const { logout } = useAuth();
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const [form, setForm] = useState<ProfileInput>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => { if (profile.data) setForm(profile.data); }, [profile.data]);

  const save = useMutation({
    mutationFn: () => api.saveProfile({
      ...form,
      contact_email: form.contact_email || null,
      other_links: form.other_links ?? [],
      custom_fields: form.custom_fields ?? [],
    }),
    onSuccess: (p) => { qc.setQueryData(["profile"], p); setSaved(true); },
  });
  const deleteAccount = useMutation({ mutationFn: () => api.deleteAccount(password), onSuccess: logout });

  const set = (key: keyof ProfileInput, value: string) => { setSaved(false); setForm((f) => ({ ...f, [key]: value || null })); };
  const links = form.other_links ?? [];
  const fields = form.custom_fields ?? [];

  return (
    <>
      <h1>Your details</h1>
      <p className="muted">Everything you usually retype into applications. The extension will show this for quick copying.</p>
      <ErrorBanner error={profile.error ?? save.error} />
      <div className="card">
        {TEXT_FIELDS.map(([key, label]) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            <input id={key} value={(form[key] as string | null | undefined) ?? ""} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
      </div>

      <h2>Other links</h2>
      <div className="card">
        {links.map((l, i) => (
          <div className="row" key={i} style={{ marginBottom: 6 }}>
            <input aria-label="Link label" placeholder="Label" value={l.label} onChange={(e) => { setSaved(false); setForm({ ...form, other_links: links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }); }} />
            <input aria-label="Link URL" className="grow" placeholder="https://" value={l.url} onChange={(e) => { setSaved(false); setForm({ ...form, other_links: links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) }); }} />
            <button className="small danger" onClick={() => setForm({ ...form, other_links: links.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
        <button className="small" onClick={() => setForm({ ...form, other_links: [...links, { label: "", url: "" }] })}>Add link</button>
      </div>

      <h2>Custom fields</h2>
      <div className="card">
        {fields.map((f, i) => (
          <div className="row" key={i} style={{ marginBottom: 6 }}>
            <input aria-label="Field label" placeholder="e.g. Notice period" value={f.label} onChange={(e) => { setSaved(false); setForm({ ...form, custom_fields: fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }); }} />
            <input aria-label="Field value" className="grow" placeholder="Value" value={f.value} onChange={(e) => { setSaved(false); setForm({ ...form, custom_fields: fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) }); }} />
            <button className="small danger" onClick={() => setForm({ ...form, custom_fields: fields.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
        <button className="small" onClick={() => setForm({ ...form, custom_fields: [...fields, { label: "", value: "" }] })}>Add field</button>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button className="primary" onClick={() => save.mutate()} disabled={save.isPending}>Save details</button>
        {saved && <span className="banner ok" style={{ margin: 0 }}>Saved</span>}
      </div>

      <h2>Danger zone</h2>
      <div className="card row">
        <input type="password" className="grow" placeholder="Confirm your password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="danger" disabled={!password || deleteAccount.isPending} onClick={() => window.confirm("Permanently delete your account and every resume?") && deleteAccount.mutate()}>
          Delete account
        </button>
      </div>
      <ErrorBanner error={deleteAccount.error} />
    </>
  );
}
