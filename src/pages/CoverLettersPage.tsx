import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "../api/api";
import { CopyButton, ErrorBanner } from "../components/common";

interface Draft { id: number | null; name: string; body: string; is_default: boolean }
const NEW: Draft = { id: null, name: "", body: "Dear {{company}} hiring team,\n\n", is_default: false };

export default function CoverLettersPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["cover-letters"], queryFn: api.coverLetters });
  const [draft, setDraft] = useState<Draft>(NEW);

  useEffect(() => {
    if (draft.id !== null && list.data && !list.data.some((c) => c.id === draft.id)) setDraft(NEW);
  }, [list.data, draft.id]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["cover-letters"] });
  const save = useMutation({
    mutationFn: () => {
      const body = { name: draft.name.trim(), body: draft.body, is_default: draft.is_default };
      return draft.id === null ? api.createCoverLetter(body) : api.updateCoverLetter(draft.id, body);
    },
    onSuccess: async (c) => { await refresh(); setDraft({ id: c.id, name: c.name, body: c.body, is_default: c.is_default }); },
  });
  const remove = useMutation({ mutationFn: (id: number) => api.deleteCoverLetter(id), onSuccess: refresh });

  return (
    <>
      <h1>Cover letter templates</h1>
      <p className="muted">Use placeholders like {"{{company}}"} and {"{{role}}"}; they will be filled in later.</p>
      <ErrorBanner error={list.error ?? save.error ?? remove.error} />
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div style={{ width: 220 }}>
          <button className="small" onClick={() => setDraft(NEW)}>+ New template</button>
          {list.data?.map((c) => (
            <div key={c.id} className="card" style={{ marginTop: 8, cursor: "pointer", borderColor: c.id === draft.id ? "var(--accent)" : undefined }} onClick={() => setDraft({ id: c.id, name: c.name, body: c.body, is_default: c.is_default })}>
              {c.name} {c.is_default && <span className="badge">default</span>}
            </div>
          ))}
        </div>
        <div className="grow card">
          <div className="field">
            <label htmlFor="cl-name">Name</label>
            <input id="cl-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="cl-body">Body</label>
            <textarea id="cl-body" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
          <div className="row">
            <label><input type="checkbox" checked={draft.is_default} onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })} /> Default</label>
            <span className="spacer" />
            <CopyButton text={draft.body} />
            {draft.id !== null && <button className="danger" onClick={() => window.confirm("Delete this template?") && remove.mutate(draft.id!)}>Delete</button>}
            <button className="primary" disabled={!draft.name.trim() || !draft.body.trim() || save.isPending} onClick={() => save.mutate()}>Save</button>
          </div>
        </div>
      </div>
    </>
  );
}
