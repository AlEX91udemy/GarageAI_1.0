import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const pad = (value: number) => String(value).padStart(2, "0");
const toKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value: string) => {
  const parts = value.split("-").map(Number);
  return new Date(parts[0] || new Date().getFullYear(), (parts[1] || 1) - 1, parts[2] || 1);
};

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label = "Дата" }) => {
  const [open, setOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const selected = parseDate(value);
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const rootRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const todayKey = toKey(new Date());
  const years = useMemo(() => Array.from({ length: 21 }, (_, index) => currentYear - 20 + index), [currentYear]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (value) setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((start + count) / 7) * 7 }, (_, index) => index - start + 1);
  }, [month]);

  const display = selected.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const choose = (day: number) => {
    onChange(toKey(new Date(month.getFullYear(), month.getMonth(), day)));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="h-8 flex items-start text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 leading-tight">{label}</label>
      <button type="button" onClick={() => setOpen((current) => !current)} className="garage-date-trigger w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs hover:border-brand transition">
        <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-neutral-400" />{display}</span>
        <Calendar className="w-3.5 h-3.5 text-neutral-700" />
      </button>
      {open && (
        <div className="garage-date-panel absolute z-50 mt-1.5 w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between mb-2 gap-1">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1 rounded-lg hover:bg-neutral-100"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <div className="flex min-w-0 items-center gap-1">
              <span className="text-sm font-bold capitalize truncate">{month.toLocaleDateString("ru-RU", { month: "long" })}</span>
              <div className="relative">
                <button type="button" aria-haspopup="listbox" aria-expanded={yearOpen} onClick={() => setYearOpen((current) => !current)} className="garage-date-year rounded-lg border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[11px] font-bold text-neutral-900 outline-none transition hover:border-brand focus:border-brand focus:ring-2 focus:ring-brand/20">{month.getFullYear()} <span className="ml-0.5 text-neutral-400">⌄</span></button>
                {yearOpen && <div role="listbox" aria-label="Выбор года" className="absolute right-0 top-full z-10 mt-1 max-h-44 w-24 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
                  {years.map((year) => <button key={year} type="button" role="option" aria-selected={month.getFullYear() === year} onClick={() => { setMonth(new Date(year, month.getMonth(), 1)); setYearOpen(false); }} className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition ${month.getFullYear() === year ? "bg-brand-soft text-brand-hover" : "text-neutral-800 hover:bg-neutral-50"}`}>{year}</button>)}
                </div>}
              </div>
            </div>
            <button type="button" aria-label="Следующий месяц" disabled={month.getFullYear() > currentYear || (month.getFullYear() === currentYear && month.getMonth() >= currentMonth)} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-7 mb-0.5">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day} className="text-center text-[9px] font-bold text-neutral-400">{day}</span>)}</div>
          <div className="grid grid-cols-7 gap-0.5">{days.map((day, index) => { const exists = day > 0 && day <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); const key = exists ? toKey(new Date(month.getFullYear(), month.getMonth(), day)) : `empty-${index}`; const selectable = exists && key <= todayKey; const active = exists && key === value; return <button key={key} type="button" disabled={!selectable} onClick={() => selectable && choose(day)} className={`h-6 rounded-md text-[11px] ${!exists ? "invisible" : active ? "bg-brand-strong text-white font-bold" : selectable ? "hover:bg-brand-soft text-neutral-700" : "text-neutral-300 cursor-not-allowed"}`}>{exists ? day : ""}</button>; })}</div>
          <button type="button" onClick={() => { const today = new Date(); onChange(toKey(today)); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setOpen(false); }} className="w-full mt-2 py-1.5 rounded-lg bg-neutral-100 text-[11px] font-bold text-neutral-700 hover:bg-neutral-200">Сегодня</button>
        </div>
      )}
    </div>
  );
};
