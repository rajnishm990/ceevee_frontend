import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

import type { SectionWithVersions } from "../api/types";

export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
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
