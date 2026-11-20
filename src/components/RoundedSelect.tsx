import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface RoundedSelectProps {
  id?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export const RoundedSelect: React.FC<RoundedSelectProps> = ({
  id, value, options, placeholder, required = false, onChange,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <input type="hidden" name={id} value={value} required={required} />
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs transition focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 ${selectedLabel ? "text-neutral-800" : "text-neutral-400"}`}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" aria-labelledby={id} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl shadow-neutral-900/10">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => { onChange(option.value); setOpen(false); }}
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
