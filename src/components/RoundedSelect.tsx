import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface RoundedSelectProps {
  id?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  required?: boolean;
  ariaLabelledBy?: string;
  onChange: (value: string) => void;
}

export const RoundedSelect: React.FC<RoundedSelectProps> = ({
  id, value, options, placeholder, required = false, ariaLabelledBy, onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const buttonId = id || "rounded-select-" + generatedId;
  const listboxId = buttonId + "-listbox";
  const selectedLabel = options.find((option) => option.value === value)?.label;

  const openAt = (index: number) => {
    if (options.length === 0) return;
    setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
    setOpen(true);
  };

  const selectActive = () => {
    const option = options[activeIndex];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const selectedIndex = options.findIndex((option) => option.value === value);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(open ? (activeIndex + 1) % options.length : Math.max(selectedIndex, 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(open ? (activeIndex - 1 + options.length) % options.length : selectedIndex < 0 ? options.length - 1 : selectedIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      openAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      openAt(options.length - 1);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      selectActive();
    }
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-0">
      {required && <input type="text" name={id} value={value} required tabIndex={-1} aria-hidden="true" className="sr-only" onChange={() => undefined} onInvalid={(event) => { event.preventDefault(); buttonRef.current?.focus(); }} />}
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        aria-valuetext={selectedLabel || placeholder}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? listboxId + "-option-" + activeIndex : undefined}
        aria-labelledby={ariaLabelledBy}
        onKeyDown={handleKeyDown}
        onClick={() => open ? setOpen(false) : openAt(Math.max(options.findIndex((option) => option.value === value), 0))}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs transition focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 ${selectedLabel ? "text-neutral-800" : "text-neutral-400"}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={listboxId} role="listbox" aria-labelledby={ariaLabelledBy || buttonId} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl shadow-neutral-900/10">
          {options.map((option, index) => (
            <button
              key={option.value}
              id={listboxId + "-option-" + index}
              type="button"
              role="option"
              aria-selected={value === option.value}
              tabIndex={-1}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => { setActiveIndex(index); onChange(option.value); setOpen(false); buttonRef.current?.focus(); }}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${value === option.value ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
