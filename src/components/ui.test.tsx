import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../test/helpers";
import { shortUrl, timeAgo } from "./common";
import { useConfirm, useToast } from "./ui";

function Harness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  return (
    <>
      <button onClick={async () => onResult(await confirm({ title: "Sure?", message: "Really.", confirmLabel: "Do it", danger: true }))}>ask</button>
      <button onClick={() => toast.show("Hello toast")}>toast</button>
    </>
  );
}

describe("confirm dialog", () => {
  it("resolves true when confirmed and false when cancelled", async () => {
    const onResult = vi.fn();
    renderWithProviders(<Harness onResult={onResult} />);
    await userEvent.click(screen.getByText("ask"));
    expect(await screen.findByText("Really.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Do it" }));
    expect(onResult).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByText("ask"));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(onResult).toHaveBeenLastCalledWith(false);
  });
});

describe("toast", () => {
  it("shows a message", async () => {
    renderWithProviders(<Harness onResult={() => {}} />);
    await userEvent.click(screen.getByText("toast"));
    expect(await screen.findByText("Hello toast")).toBeInTheDocument();
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();
  const at = (secondsAgo: number) => new Date(now - secondsAgo * 1000).toISOString();
  it.each([
    [10, "just now"], [120, "2 minutes ago"], [60 * 60, "1 hour ago"], [5 * 3600, "5 hours ago"],
    [86400, "1 day ago"], [10 * 86400, "10 days ago"], [45 * 86400, "2 months ago"], [800 * 86400, "2 years ago"],
  ])("%is ago -> %s", (s, expected) => expect(timeAgo(at(s), now)).toBe(expected));
  it("never goes negative for clock skew", () => expect(timeAgo(new Date(now + 5000).toISOString(), now)).toBe("just now"));
});

describe("shortUrl", () => {
  it("strips the scheme and www", () => expect(shortUrl("https://www.linkedin.com/in/a")).toBe("linkedin.com/in/a"));
});
