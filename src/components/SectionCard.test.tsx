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

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

describe("SectionCard", () => {
  it("opens the section details in a new tab from the title", () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    const title = screen.getByRole("link", { name: "Backend Developer" });
    expect(title).toHaveAttribute("href", "/sections/1");
    expect(title).toHaveAttribute("target", "_blank");
    expect(title).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows the active version as the PDF tile and in the dropdown", () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    expect(screen.getByText("Backend Developer-v2.pdf")).toBeInTheDocument();
    expect(screen.getByText(/For Stripe/, { selector: "div" })).toBeInTheDocument();
    expect(screen.getByLabelText("Active version")).toHaveValue("12");
  });

  it("lists versions newest first", () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    const options = within(screen.getByLabelText("Active version")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["v3", "v2 · For Stripe", "v1 · Original"]);
  });

  it("switches the active version from the dropdown", async () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    await userEvent.selectOptions(screen.getByLabelText("Active version"), "13");
    await waitFor(() => expect(api.setActive).toHaveBeenCalledWith(1, 13));
  });

  it("downloads the active version", async () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(api.versionPdf).toHaveBeenCalledWith(12));
  });

  it("shows the stable share link and the Drive link", () => {
    renderWithProviders(<SectionCard section={makeSection()} />);
    expect(screen.getByRole("link", { name: /\/api\/v1\/public\/backend-abc123$/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "https://drive.google.com/file/d/xyz" })).toBeInTheDocument();
  });

  it("prompts to add a Drive link when there is none", () => {
    renderWithProviders(<SectionCard section={makeSection({ gdrive_link: null })} />);
    expect(screen.getByText(/No Drive link yet/)).toBeInTheDocument();
  });

  it("handles a section with no versions", () => {
    renderWithProviders(<SectionCard section={makeSection({ versions: [], active_version_id: null })} />);
    expect(screen.getByText(/No resume yet/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Active version")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("asks for a choice when versions exist but none is active", () => {
    renderWithProviders(<SectionCard section={makeSection({ active_version_id: null })} />);
    expect(screen.getByLabelText("Active version")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("flags a paused share link", () => {
    renderWithProviders(<SectionCard section={makeSection({ sharing_enabled: false })} />);
    expect(screen.getByText("Share link paused")).toBeInTheDocument();
  });
});
