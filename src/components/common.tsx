import { Icon, useToast } from "./ui";

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="banner error" role="alert">{error instanceof Error ? error.message : String(error)}</div>;
}

export function CopyButton({ text, label, message = "Copied to clipboard", className = "iconbtn ghost" }: { text: string; label?: string; message?: string; className?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
      aria-label={label ? undefined : "Copy"}
      title={label ? undefined : "Copy"}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.show(message);
      }}
    >
      <Icon name="copy" size={15} />{label}
    </button>
  );
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const units: [number, number, string][] = [[3600, 60, "minute"], [86400, 3600, "hour"], [2592000, 86400, "day"], [31536000, 2592000, "month"]];
  for (const [limit, size, name] of units) {
    if (seconds < limit) {
      const n = Math.max(1, Math.round(seconds / size));
      return `${n} ${name}${n > 1 ? "s" : ""} ago`;
    }
  }
  const years = Math.round(seconds / 31536000);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

export const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");
