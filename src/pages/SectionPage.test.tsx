import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/api";
import { makeSection, renderWithProviders } from "../test/helpers";
import SectionPage from "./SectionPage";

vi.mock("../api/api", async (orig) => ({
  ...(await orig<typeof import("../api/api")>()),
  api: {
    section: vi.fn(), limits: vi.fn(), updateSection: vi.fn(), rotateSlug: vi.fn(), deleteSection: vi.fn(), uploadVersion: vi.fn(),
    setActive: vi.fn(), setLabel: vi.fn(), deleteVersion: vi.fn(), versionPdf: vi.fn(),
  },
}));
vi.mock("../components/Sheet", () => ({ default: () => <span data-testid="sheet" /> }));

const open = () => renderWithProviders(<SectionPage />, { path: "/sections/1", route: "/sections/:sectionId" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.section).mockResolvedValue(makeSection());
  vi.mocked(api.limits).mockResolvedValue({ max_sections: 20, max_versions_per_section: 20, max_upload_bytes: 5242880 });
  for (const fn of [api.updateSection, api.rotateSlug, api.setActive, api.setLabel, api.uploadVersion]) vi.mocked(fn).mockResolvedValue({} as never);
  vi.mocked(api.deleteVersion).mockResolvedValue(undefined);
  vi.mocked(api.deleteSection).mockResolvedValue(undefined);
});

describe("SectionPage control panel", () => {
  it("lists versions newest first and marks the active one", async () => {
    open();
    const items = await screen.findAllByRole("listitem");
    expect(items.map((li) => within(li).getByText(/^v\d$/).textContent)).toEqual(["v3", "v2", "v1"]);
    expect(within(items[1]).getByText("Active")).toBeInTheDocument();
    expect(within(items[0]).getByRole("button", { name: "Make active" })).toBeInTheDocument();
    expect(screen.getByText("3 of 20 used")).toBeInTheDocument();
  });

  it("makes another version active", async () => {
    open();
    const first = (await screen.findAllByRole("listitem"))[0];
    await userEvent.click(within(first).getByRole("button", { name: "Make active" }));
    await waitFor(() => expect(api.setActive).toHaveBeenCalledWith(1, 13));
    expect(await screen.findByText(/Your link now shows it/)).toBeInTheDocument();
  });

  it("asks before deleting a version and only deletes when confirmed", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Delete version 1" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(api.deleteVersion).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete version 1" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete version" }));
    await waitFor(() => expect(api.deleteVersion).toHaveBeenCalledWith(11));
  });

  it("warns when deleting the active version", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Delete version 2" }));
    expect(await screen.findByText(/your share link will show nothing/)).toBeInTheDocument();
  });

  it("saves a label when the field loses focus", async () => {
    open();
    const input = await screen.findByLabelText("Label for version 3");
    await userEvent.type(input, "For fintech");
    await userEvent.tab();
    await waitFor(() => expect(api.setLabel).toHaveBeenCalledWith(13, "For fintech"));
  });

  it("uploads a PDF chosen through the file picker", async () => {
    const { container } = open();
    await screen.findByText("Upload a new version");
    const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });
    await userEvent.upload(container.querySelector("input[type=file]") as HTMLInputElement, file);
    await waitFor(() => expect(api.uploadVersion).toHaveBeenCalledWith(1, file));
  });

  it("disables uploading at the version limit", async () => {
    vi.mocked(api.limits).mockResolvedValue({ max_sections: 20, max_versions_per_section: 3, max_upload_bytes: 1 });
    open();
    expect(await screen.findByText("Version limit reached")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Versions used" })).toHaveAttribute("aria-valuenow", "3");
  });

  it("pauses and resumes sharing", async () => {
    open();
    await userEvent.click(await screen.findByRole("switch", { name: "Share link enabled" }));
    await waitFor(() => expect(api.updateSection).toHaveBeenCalledWith(1, { sharing_enabled: false }));
  });

  it("only creates a new link after confirmation", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Create a new link/ }));
    expect(await screen.findByText(/stops working immediately/)).toBeInTheDocument();
    expect(api.rotateSlug).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Create new link" }));
    await waitFor(() => expect(api.rotateSlug).toHaveBeenCalledWith(1));
  });

  it("saves and clears the Drive link", async () => {
    open();
    const input = await screen.findByLabelText("Google Drive link");
    await userEvent.clear(input);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.updateSection).toHaveBeenCalledWith(1, { gdrive_link: null }));
  });

  it("renames the section when the title loses focus", async () => {
    open();
    const title = await screen.findByLabelText("Section name");
    await userEvent.clear(title);
    await userEvent.type(title, "Platform Engineer");
    await userEvent.tab();
    await waitFor(() => expect(api.updateSection).toHaveBeenCalledWith(1, { domain_name: "Platform Engineer" }));
  });

  it("shows an empty state for a section with no versions", async () => {
    vi.mocked(api.section).mockResolvedValue(makeSection({ versions: [], active_version_id: null }));
    open();
    expect(await screen.findByText("No versions yet")).toBeInTheDocument();
  });
});
