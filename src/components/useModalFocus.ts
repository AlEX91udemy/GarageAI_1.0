import { useEffect, useRef } from "react";

/** Shared keyboard contract for existing overlays, without changing their forms. */
export function useModalFocus(onClose: () => void, open = true, restoreSelector?: string) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Hide background from keyboard and assistive technology, including portal dialogs.
    const background: Array<{ element: HTMLElement; inert: boolean }> = [];
    let branch: HTMLElement = dialog;
    while (branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          background.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    )).filter(el =>
      el.tabIndex >= 0 &&
      !el.closest('[hidden], [inert]') &&
      el.getClientRects().length > 0
    );
    if (!dialog.contains(document.activeElement)) (focusable()[0] || dialog).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0] || dialog;
        const last = elements.at(-1) || dialog;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    dialog.addEventListener("keydown", handleKey);
    return () => {
      dialog.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      background.forEach(({ element, inert }) => { element.inert = inert; });
      // React may commit the closing render after this cleanup. Restore focus
      // on the next frame, after the trigger is connected and its ancestors
      // are no longer inert; fall back to the first visible page control.
      const restoreFocus = () => {
        const selected = restoreSelector
          ? document.querySelector<HTMLElement>(restoreSelector)
          : null;
        const candidate = selected && !selected.hasAttribute("disabled") && selected.getClientRects().length > 0
          ? selected
          : previous && previous.isConnected && !previous.hasAttribute("disabled") && !previous.closest("[inert], [hidden]") && previous.getClientRects().length > 0
          ? previous
          : Array.from(document.querySelectorAll<HTMLElement>(
              "[data-modal-trigger]:not([disabled]), button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
            )).find((element) => !element.closest("[inert], [hidden]") && element.getClientRects().length > 0);
        candidate?.focus({ preventScroll: true });
      };
      restoreFocus();
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(restoreFocus);
      window.setTimeout(restoreFocus, 50);
      window.setTimeout(restoreFocus, 150);
    };
  }, [open]);
  return ref;
}
