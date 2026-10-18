import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalFocus } from "./useModalFocus";

export function DialogFrame({ label, onClose, children }: {
  label: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useModalFocus(onClose);
  return createPortal(
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>, document.body
  );
}
