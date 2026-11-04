import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { api } from "../api/api";
import { ErrorBanner } from "../components/common";
import IdentityPanel from "../components/IdentityPanel";
import SectionCard from "../components/SectionCard";
import { Icon } from "../components/ui";

export default function Dashboard() {
  const qc = useQueryClient();
  const sections = useQuery({ queryKey: ["sections"], queryFn: api.sections });
  const limits = useQuery({ queryKey: ["limits"], queryFn: api.limits, staleTime: Infinity });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [gdrive, setGdrive] = useState("");

  const create = useMutation({
    mutationFn: () => api.createSection(name.trim(), gdrive.trim()),
    onSuccess: () => {
      setName("");
      setGdrive("");
      setAdding(false);
      void qc.invalidateQueries({ queryKey: ["sections"] });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }
  const count = sections.data?.length ?? 0;

  return (
    <main className="page">
      <div className="dash">
        <IdentityPanel />
        <section aria-label="Your resumes">
          <div className="pagehead">
            <div className="grow">
              <h1>Your resumes</h1>
              <p>One permanent link per role. It always shows the version you choose.</p>
            </div>
            <button className="primary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
              <Icon name="plus" />New section
            </button>
          </div>

          {adding && (
            <form className="card composer" onSubmit={submit}>
              <div className="row" style={{ alignItems: "flex-end" }}>
                <div className="field grow" style={{ margin: 0 }}>
                  <label htmlFor="new-name">What kind of role is this for?</label>
                  <input id="new-name" autoFocus placeholder="e.g. Backend Developer" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field grow" style={{ margin: 0 }}>
                  <label htmlFor="new-drive">Google Drive link (optional)</label>
                  <input id="new-drive" placeholder="https://drive.google.com/…" value={gdrive} onChange={(e) => setGdrive(e.target.value)} />
                </div>
                <button className="primary" disabled={create.isPending}>Create</button>
                <button type="button" className="ghost" onClick={() => setAdding(false)}>Cancel</button>
              </div>
              {limits.data && <p className="muted small-text" style={{ margin: "10px 0 0" }}>{count} of {limits.data.max_sections} sections used</p>}
            </form>
          )}

          <ErrorBanner error={create.error ?? sections.error} />
          {sections.isLoading && <p className="muted">Loading your resumes…</p>}
          {sections.data?.length === 0 && (
            <div className="emptystate">
              <h3>Start with the role you apply to most</h3>
              <p>Create a section like “Backend Developer”, upload a PDF, and you get a link that never goes stale.</p>
              <button className="primary" onClick={() => setAdding(true)}><Icon name="plus" />Create your first section</button>
            </div>
          )}
          <div className="cards">{sections.data?.map((s) => <SectionCard key={s.id} section={s} />)}</div>
        </section>
      </div>
    </main>
  );
}
