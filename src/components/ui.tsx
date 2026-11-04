import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

const PATHS: Record<string, string> = {
  copy: "M9 9h10v10H9zM5 15V5h10",
  external: "M14 4h6v6M20 4l-9 9M18 14v5H5V6h5",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7",
  edit: "M4 20l1-4L16 5l3 3L8 19zM14 7l3 3",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  drive: "M9 4h6l6 10-3 5H6l-3-5zM9 4l6 10M15 4L6 19M3 14h18",
  chevron: "M6 9l6 6 6-6",
  back: "M15 5l-7 7 7 7",
  upload: "M12 16V5M7 9l5-5 5 5M5 20h14",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1-4 4-6 8-6s7 2 8 6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  refresh: "M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4",
  minus: "M5 12h14",
};

export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)} />;
}

interface ToastApi { show: (message: string) => void }
const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);
  const counter = useRef(0);
  const show = useCallback((message: string) => {
    const id = ++counter.current;
    setItems((x) => [...x, { id, message }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast"><Icon name="check" size={15} />{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ConfirmOptions { title: string; message: string; confirmLabel?: string; danger?: boolean }
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn>(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>();
  const dialog = useRef<HTMLDialogElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => { resolver.current = resolve; setOpts(o); }), []);
  useEffect(() => { if (opts) dialog.current?.showModal(); }, [opts]);

  const close = (value: boolean) => {
    dialog.current?.close();
    setOpts(null);
    resolver.current?.(value);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <dialog ref={dialog} className="confirm" onCancel={(e) => { e.preventDefault(); close(false); }} aria-labelledby="confirm-title">
          <h3 id="confirm-title">{opts.title}</h3>
          <p>{opts.message}</p>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button onClick={() => close(false)}>Cancel</button>
            <button className={opts.danger ? "danger solid" : "primary"} onClick={() => close(true)}>{opts.confirmLabel ?? "Confirm"}</button>
          </div>
        </dialog>
      )}
    </ConfirmContext.Provider>
  );
}
