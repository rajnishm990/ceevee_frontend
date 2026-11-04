import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/api";
import { makeSection, renderWithProviders } from "../test/helpers";
import SectionCard from "./SectionCard";

vi.mock("../api/api", async (orig) => ({
  ...(await orig<typeof import("../api/api")>()),
  api: { setActive: vi.fn().mockResolvedValue({}), versionPdf: vi.fn().mockResolvedValue(new Blob(["%PDF"])) },
}));
vi.mock("./Sheet", () => ({ default: (p: { versionId: number | null; versions?: number }) => <div data-testid="sheet" data-version={String(p.versionId)} data-stack={p.versions} /> }));

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

describe("SectionCard", () => {
  it("opens the section in a new tab from the title", () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    const title = screen.getByRole("heading", { name: "Backend Developer" }).querySelector("a")!;
    expect(title).toHaveAttribute("href", "/sections/1");
    expect(title).toHaveAttribute("target", "_blank");
    expect(title).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("previews the active version and shows how many versions exist", () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-version", "12");
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-stack", "3");
    expect(screen.getByText(/v2 · For Stripe · added/)).toBeInTheDocument();
    expect(screen.getByText(/3 versions/)).toBeInTheDocument();
  });

  it("lists versions newest first with the active one selected", () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    const select = screen.getByLabelText("Showing");
    expect(select).toHaveValue("12");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["v3", "v2 · For Stripe", "v1 · Original"]);
  });

  it("switches the active version from the dropdown", async () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    await userEvent.selectOptions(screen.getByLabelText("Showing"), "13");
    await waitFor(() => expect(api.setActive).toHaveBeenCalledWith(1, 13));
  });

  it("downloads the active version", async () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    await userEvent.click(screen.getByRole("button", { name: /Download PDF/ }));
    await waitFor(() => expect(api.versionPdf).toHaveBeenCalledWith(12));
  });

  it("shows the share and Drive links and copies them", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SectionCard section={makeSection()} />);
    expect(screen.getByRole("link", { name: /\/api\/v1\/public\/backend-abc123$/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "drive.google.com/file/d/xyz" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Copy" })[0]);
    expect(await navigator.clipboard.readText()).toMatch(/\/api\/v1\/public\/backend-abc123$/);
    expect(await screen.findByText("Share link copied")).toBeInTheDocument();
  });

  it("invites the user to add a Drive link when there is none", () => {
    renderWithProviders(<SectionCard section={makeSection({ gdrive_link: null })} />);
    expect(screen.getByText(/No Drive link yet/)).toBeInTheDocument();
  });

  it("handles a section with no versions", () => {
    renderWithProviders(<SectionCard section={makeSection({ versions: [], active_version_id: null })} />);
    expect(screen.getByText(/Nothing uploaded yet/)).toBeInTheDocument();
    expect(screen.getByTestId("sheet")).toHaveAttribute("data-version", "null");
    expect(screen.queryByLabelText("Showing")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download PDF/ })).not.toBeInTheDocument();
  });

  it("asks for a choice when versions exist but none is active", () => {
    renderWithProviders(<SectionCard section={makeSection({ active_version_id: null })} />);
    expect(screen.getByLabelText("Showing")).toHaveValue("");
    expect(screen.queryByRole("button", { name: /Download PDF/ })).not.toBeInTheDocument();
  });

  it("shows whether the share link is live or paused", () => {
    const { unmount } = renderWithProviders(<SectionCard section={makeSection()} />);
    expect(screen.getByText("Link live")).toBeInTheDocument();
    unmount();
    renderWithProviders(<SectionCard section={makeSection({ sharing_enabled: false })} />);
    expect(screen.getByText("Link paused")).toBeInTheDocument();
  });
});
