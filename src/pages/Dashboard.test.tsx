import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/api";
import * as auth from "../auth/AuthContext";
import { makeSection, renderWithProviders } from "../test/helpers";
import Dashboard from "./Dashboard";

vi.mock("../api/api", async (orig) => ({
  ...(await orig<typeof import("../api/api")>()),
  api: { sections: vi.fn(), profile: vi.fn(), createSection: vi.fn(), limits: vi.fn() },
}));
vi.mock("../components/Sheet", () => ({ default: () => <div data-testid="sheet" /> }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.limits).mockResolvedValue({ max_sections: 20, max_versions_per_section: 20, max_upload_bytes: 5242880 });
  vi.spyOn(auth, "useAuth").mockReturnValue({
    user: { id: 1, email: "me@example.com", is_active: true, base_profile: {} },
    loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(),
  });
});

describe("Dashboard", () => {
  it("shows the user's details beside one card per section", async () => {
    vi.mocked(api.profile).mockResolvedValue({
      full_name: "Alice Johnson", headline: "Backend Developer", contact_email: "alice@work.com", phone: "+91 99999 00000",
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
    expect(screen.getByText("Notice period")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Backend Developer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ML Engineer" })).toBeInTheDocument();
  });

  it("falls back to the email and invites the user to add details", async () => {
    vi.mocked(api.profile).mockResolvedValue({ other_links: [], custom_fields: [] });
    vi.mocked(api.sections).mockResolvedValue([]);
    renderWithProviders(<Dashboard />);
    expect(await screen.findByRole("heading", { name: "me@example.com" })).toBeInTheDocument();
    expect(screen.getByText(/Add your links and details once/)).toBeInTheDocument();
    expect(await screen.findByText(/Start with the role you apply to most/)).toBeInTheDocument();
  });

  it("creates a section from the composer", async () => {
    vi.mocked(api.profile).mockResolvedValue({ other_links: [], custom_fields: [] });
    vi.mocked(api.sections).mockResolvedValue([makeSection()]);
    vi.mocked(api.createSection).mockResolvedValue(makeSection({ id: 5 }));
    renderWithProviders(<Dashboard />);
    await userEvent.click(await screen.findByRole("button", { name: /New section/ }));
    await userEvent.type(screen.getByLabelText(/What kind of role/), "ML Engineer");
    expect(await screen.findByText("1 of 20 sections used")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(api.createSection).toHaveBeenCalledWith("ML Engineer", ""));
    await waitFor(() => expect(screen.queryByLabelText(/What kind of role/)).not.toBeInTheDocument());
  });

  it("shows the server's error when creation fails", async () => {
    vi.mocked(api.profile).mockResolvedValue({ other_links: [], custom_fields: [] });
    vi.mocked(api.sections).mockResolvedValue([]);
    vi.mocked(api.createSection).mockRejectedValue(new Error("You already have a section with this name."));
    renderWithProviders(<Dashboard />);
    await userEvent.click(await screen.findByRole("button", { name: /New section/ }));
    await userEvent.type(screen.getByLabelText(/What kind of role/), "Backend");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already have a section");
  });
});
