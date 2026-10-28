import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { api } from "../api/api";
import { ErrorBanner } from "../components/common";
import ProfileHeader from "../components/ProfileHeader";
import SectionCard from "../components/SectionCard";

export default function Dashboard() {
  const qc = useQueryClient();
  const sections = useQuery({ queryKey: ["sections"], queryFn: api.sections });
  const [name, setName] = useState("");
  const [gdrive, setGdrive] = useState("");

  const create = useMutation({
    mutationFn: () => api.createSection(name.trim(), gdrive.trim()),
    onSuccess: () => {
      setName("");
      setGdrive("");
      void qc.invalidateQueries({ queryKey: ["sections"] });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <>
      <ProfileHeader />
      <h2>Your resumes</h2>
      <form className="card row" onSubmit={submit}>
        <input className="grow" placeholder="New section, e.g. Backend Developer" required value={name} onChange={(e) => setName(e.target.value)} />
        <input className="grow" placeholder="Google Drive link (optional)" value={gdrive} onChange={(e) => setGdrive(e.target.value)} />
        <button className="primary" disabled={create.isPending}>Add section</button>
      </form>
      <ErrorBanner error={create.error ?? sections.error} />
      {sections.isLoading && <p className="muted">Loading…</p>}
      {sections.data?.length === 0 && <p className="muted">No sections yet. Create one per kind of role you apply to.</p>}
      <div className="cards">
        {sections.data?.map((s) => <SectionCard key={s.id} section={s} />)}
      </div>
    </>
  );
}
