import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/api";
import { ApiError } from "../api/client";
import { fakeBlob, makeSection, makeVersion, renderWithProviders } from "../test/helpers";
import EditorPage from "./EditorPage";

vi.mock("../api/api", async (orig) => ({
  ...(await orig<typeof import("../api/api")>()),
  api: { version: vi.fn(), versionPdf: vi.fn(), section: vi.fn(), limits: vi.fn(), forkVersion: vi.fn(), saveVersion: vi.fn(), previewVersion: vi.fn() },
}));
vi.mock("../editor/PdfViewer", () => ({
  default: ({ overlay, pages }: { overlay: (i: number, s: number) => unknown; pages: unknown[] }) => <div data-testid="viewer">{pages.map((_, i) => <div key={i}>{overlay(i, 1) as never}</div>)}</div>,
}));

const v1 = makeVersion();
const forked = makeVersion({ id: 99, version_number: 3, label: "Edited from v1", content: { s1: "Changed", s2: "World" } });
const sectionWith = (n: number) => makeSection({ versions: Array.from({ length: n }, (_, i) => ({ id: 11 + i, version_number: i + 1, label: null, created_at: "2026-01-01T00:00:00Z" })), active_version_id: 11 });

function open(path = "/versions/11/edit") {
  return renderWithProviders(<EditorPage />, { path, route: "/versions/:versionId/edit" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.limits).mockResolvedValue({ max_sections: 20, max_versions_per_section: 20, max_upload_bytes: 1 });
  vi.mocked(api.versionPdf).mockResolvedValue(fakeBlob());
  vi.mocked(api.section).mockResolvedValue(sectionWith(2));
  vi.mocked(api.version).mockImplementation(async (id: number) => (id === 99 ? forked : v1));
});

describe("EditorPage saving", () => {
  it("explains that saving creates a new version and leaves the current one alone", async () => {
    open();
    expect(await screen.findByText(/Saving creates/)).toHaveTextContent("Saving creates v3; v1 stays exactly as it is");
    expect(screen.getByRole("button", { name: "Save as v3" })).toBeDisabled();
  });

  it("the first save forks, activates the new version and moves the editor onto it", async () => {
    vi.mocked(api.forkVersion).mockResolvedValue(forked);
    open();
    await userEvent.clear(await screen.findByDisplayValue("Hello"));
    await userEvent.type(screen.getByDisplayValue(""), "Changed");
    await userEvent.click(screen.getByRole("button", { name: "Save as v3" }));
    await waitFor(() => expect(api.forkVersion).toHaveBeenCalledWith(11, { s1: "Changed" }, true));
    expect(api.saveVersion).not.toHaveBeenCalled();
    expect(await screen.findByText(/Saved as v3 and set as active/)).toBeInTheDocument();
    expect(await screen.findByText(/You are editing/)).toHaveTextContent("v3");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("later saves in the same session update the new version instead of creating more", async () => {
    vi.mocked(api.forkVersion).mockResolvedValue(forked);
    vi.mocked(api.saveVersion).mockResolvedValue({ ...forked, revision: 2, content: { s1: "Changed", s2: "Again" } });
    open();
    await userEvent.type(await screen.findByDisplayValue("Hello"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save as v3" }));
    await screen.findByRole("button", { name: "Save changes" });
    await userEvent.type(await screen.findByDisplayValue("World"), "?");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.saveVersion).toHaveBeenCalledWith(99, { s2: "World?" }, 1));
    expect(api.forkVersion).toHaveBeenCalledTimes(1);
  });

  it("can save without making the new version active", async () => {
    vi.mocked(api.forkVersion).mockResolvedValue(forked);
    open();
    await userEvent.type(await screen.findByDisplayValue("Hello"), "!");
    await userEvent.click(screen.getByLabelText("Set as active"));
    await userEvent.click(screen.getByRole("button", { name: "Save as v3" }));
    await waitFor(() => expect(api.forkVersion).toHaveBeenCalledWith(11, { s1: "Hello!" }, false));
  });

  it("sends only the spans that changed", async () => {
    vi.mocked(api.forkVersion).mockResolvedValue(forked);
    open();
    await userEvent.type(await screen.findByDisplayValue("World"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save as v3" }));
    await waitFor(() => expect(api.forkVersion).toHaveBeenCalledWith(11, { s2: "World!" }, true));
  });

  it("shows the server's error and creates nothing locally when the save fails", async () => {
    vi.mocked(api.forkVersion).mockRejectedValue(new ApiError(400, "These characters can't be drawn with this resume's fonts: 日"));
    open();
    await userEvent.type(await screen.findByDisplayValue("Hello"), "日");
    await userEvent.click(screen.getByRole("button", { name: "Save as v3" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("can't be drawn");
    expect(screen.getByRole("button", { name: "Save as v3" })).toBeInTheDocument();
  });

  it("blocks saving and explains when the section is at its version limit", async () => {
    vi.mocked(api.limits).mockResolvedValue({ max_sections: 20, max_versions_per_section: 2, max_upload_bytes: 1 });
    open();
    await userEvent.type(await screen.findByDisplayValue("Hello"), "!");
    expect(await screen.findByText(/reached its version limit/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as v3" })).toBeDisabled();
  });

  it("offers a reload when an in-place save hits a conflict", async () => {
    vi.mocked(api.forkVersion).mockResolvedValue(forked);
    vi.mocked(api.saveVersion).mockRejectedValue(new ApiError(409, "This version was changed elsewhere. Reload to continue."));
    open();
    await userEvent.type(await screen.findByDisplayValue("Hello"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save as v3" }));
    await userEvent.type(await screen.findByDisplayValue("World"), "?");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/changed in another tab/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Discard my changes and reload/ })).toBeInTheDocument();
  });

  it("previews the dirty spans and returns to editing", async () => {
    vi.mocked(api.previewVersion).mockResolvedValue(fakeBlob());
    open();
    await userEvent.type(await screen.findByDisplayValue("Hello"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(api.previewVersion).toHaveBeenCalledWith(11, { s1: "Hello!" }));
    expect(await screen.findByText(/Previewing the exact PDF/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as v3" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.queryByText(/Previewing the exact PDF/)).not.toBeInTheDocument();
  });

  it("discards unsaved changes", async () => {
    open();
    await userEvent.type(await screen.findByDisplayValue("Hello"), "!!");
    expect(screen.getByText("1 unsaved change")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByDisplayValue("Hello")).toBeInTheDocument();
    expect(screen.getByText("No unsaved changes")).toBeInTheDocument();
  });

  it("is view-only for PDFs without editable text", async () => {
    vi.mocked(api.version).mockResolvedValue(makeVersion({ content: {}, coordinate_map: {} }));
    open();
    expect(await screen.findByText(/view-only/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
  });
});
