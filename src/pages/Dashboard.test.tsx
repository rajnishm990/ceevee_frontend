import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/api";
import * as auth from "../auth/AuthContext";
import { makeSection, renderWithProviders } from "../test/helpers";
import Dashboard from "./Dashboard";

vi.mock("../api/api", async (orig) => ({
  ...(await orig<typeof import("../api/api")>()),
  api: { sections: vi.fn(), profile: vi.fn(), createSection: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(auth, "useAuth").mockReturnValue({
    user: { id: 1, email: "me@example.com", is_active: true, base_profile: {} },
    loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(),
  });
});

describe("Dashboard", () => {
  it("shows the user's details above one card per section", async () => {
    vi.mocked(api.profile).mockResolvedValue({
      full_name: "Alice Johnson", headline: "Backend Developer", contact_email: "alice@work.com",
      linkedin_url: "https://www.linkedin.com/in/alice", github_url: "https://github.com/alice",
      other_links: [{ label: "Blog", url: "https://blog.example.com" }],
      custom_fields: [{ label: "Notice period", value: "30 days" }],
    });
    vi.mocked(api.sections).mockResolvedValue([makeSection(), makeSection({ id: 2, domain_name: "ML Engineer" })]);
    renderWithProviders(<Dashboard />);

    expect(await screen.findByRole("heading", { name: "Alice Johnson" })).toBeInTheDocument();
    expect(screen.getByText("alice@work.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "linkedin.com/in/alice" })).toBeInTheDocument();
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Backend Developer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ML Engineer" })).toBeInTheDocument();
  });

  it("falls back to the email and invites the user to add details", async () => {
    vi.mocked(api.profile).mockResolvedValue({ other_links: [], custom_fields: [] });
    vi.mocked(api.sections).mockResolvedValue([]);
    renderWithProviders(<Dashboard />);
    expect(await screen.findByRole("heading", { name: "me@example.com" })).toBeInTheDocument();
    expect(screen.getByText(/No sections yet/)).toBeInTheDocument();
  });
});
