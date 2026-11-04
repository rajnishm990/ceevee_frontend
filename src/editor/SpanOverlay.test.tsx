import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { SpanMeta } from "../api/types";
import SpanOverlay from "./SpanOverlay";

const span = (page: number, text: string, x = 10): SpanMeta => ({
  page, bbox: [x, 10, x + 100, 24], origin: [x, 22], font: "Helvetica", flags: 0, size: 12, color: 0, text,
});
const spans = { s1: span(0, "Alice"), s2: span(0, "Engineer", 200), s3: span(1, "Page two") };
const saved = { s1: "Alice", s2: "Engineer", s3: "Page two" };

describe("SpanOverlay", () => {
  it("renders only the spans for its page", () => {
    render(<SpanOverlay page={0} scale={1} spans={spans} values={saved} saved={saved} onChange={() => {}} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("reports the edited span id and new text", async () => {
    const onChange = vi.fn();
    render(<SpanOverlay page={0} scale={1} spans={spans} values={saved} saved={saved} onChange={onChange} />);
    await userEvent.type(screen.getByDisplayValue("Alice"), "!");
    expect(onChange).toHaveBeenCalledWith("s1", "Alice!");
  });

  it("marks changed spans as edited (hides the original text) and unsaved", () => {
    const values = { ...saved, s1: "Alicia" };
    render(<SpanOverlay page={0} scale={1} spans={spans} values={values} saved={saved} onChange={() => {}} />);
    const edited = screen.getByDisplayValue("Alicia");
    expect(edited).toHaveClass("edited", "unsaved");
    expect(screen.getByDisplayValue("Engineer")).not.toHaveClass("edited");
  });

  it("distinguishes a saved edit from an unsaved one", () => {
    const savedWithEdit = { ...saved, s1: "Alicia" };
    render(<SpanOverlay page={0} scale={1} spans={spans} values={savedWithEdit} saved={savedWithEdit} onChange={() => {}} />);
    expect(screen.getByDisplayValue("Alicia")).toHaveClass("edited");
    expect(screen.getByDisplayValue("Alicia")).not.toHaveClass("unsaved");
  });

  it("is not editable in read-only mode", () => {
    render(<SpanOverlay page={0} scale={1} spans={spans} values={saved} saved={saved} readOnly onChange={() => {}} />);
    expect(screen.getByDisplayValue("Alice")).toHaveAttribute("readonly");
  });

  it("positions inputs using the page scale", () => {
    render(<SpanOverlay page={0} scale={1.5} spans={spans} values={saved} saved={saved} onChange={() => {}} />);
    expect(screen.getByDisplayValue("Alice")).toHaveStyle({ left: "15px", top: "15px" });
  });
});
