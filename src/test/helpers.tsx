import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { SectionWithVersions, Version } from "../api/types";
import { ConfirmProvider, ToastProvider } from "../components/ui";

export function renderWithProviders(ui: ReactElement, opts: { path?: string; route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = opts.route ? <Routes><Route path={opts.route} element={ui} /><Route path="*" element={<div>elsewhere</div>} /></Routes> : ui;
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[opts.path ?? "/"]}>
        <ToastProvider><ConfirmProvider>{tree}</ConfirmProvider></ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export function makeSection(overrides: Partial<SectionWithVersions> = {}): SectionWithVersions {
  return {
    id: 1,
    domain_name: "Backend Developer",
    shareable_slug: "backend-abc123",
    gdrive_link: "https://drive.google.com/file/d/xyz",
    active_version_id: 12,
    sharing_enabled: true,
    versions: [
      { id: 11, version_number: 1, label: "Original", created_at: "2026-01-01T00:00:00Z" },
      { id: 12, version_number: 2, label: "For Stripe", created_at: "2026-02-01T00:00:00Z" },
      { id: 13, version_number: 3, label: null, created_at: "2026-03-01T00:00:00Z" },
    ],
    ...overrides,
  };
}

export function makeVersion(overrides: Partial<Version> = {}): Version {
  const span = { page: 0, bbox: [10, 10, 110, 24], origin: [10, 22], font: "Helvetica", flags: 0, size: 12, color: 0, text: "Hello" };
  return {
    id: 11, section_id: 1, version_number: 1, revision: 1, label: "Original",
    content: { s1: "Hello", s2: "World" },
    coordinate_map: { s1: span, s2: { ...span, bbox: [10, 40, 110, 54], origin: [10, 52], text: "World" } },
    page_info: [{ width: 595, height: 842, rotation: 0 }],
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Version;
}

export const fakeBlob = () => ({ arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer, type: "application/pdf" }) as unknown as Blob;
