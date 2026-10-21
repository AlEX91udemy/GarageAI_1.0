import React, { useState } from "react";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronRight,
  ScanLine,
  ScanBarcode,
  Calendar,
  FileDown,
} from "lucide-react";
import { Vehicle, ServiceRecord, OemScheduleItem } from "../../types";
import { exportServiceBookToPdf } from "../../utils/serviceBookPdfExport";
import { formatGarageCurrency } from "../currency";

interface ServiceScreenProps {
  vehicle: Vehicle;
  records: ServiceRecord[];
  oemSchedules: OemScheduleItem[];
  onSelectRecord: (record: ServiceRecord) => void;
  onOpenAddService: () => void;
  onOpenScanReceipt: () => void;
  onOpenScanBarcode?: () => void;
  onMarkOemDone: (item: OemScheduleItem) => void;
  onExportPdf?: () => void;
}

export const ServiceScreen: React.FC<ServiceScreenProps> = ({
  vehicle,
  records,
  oemSchedules,
  onSelectRecord,
  onOpenAddService,
  onOpenScanReceipt,
  onOpenScanBarcode,
  onMarkOemDone,
  onExportPdf,
}) => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");

  const carRecords = records
    .filter((r) => r.vehicleId === vehicle.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const carSchedules = oemSchedules.filter((s) => s.vehicleId === vehicle.id);

  // Group OEM items into Critical, Due Soon, Scheduled
  const upcomingItems = carSchedules
    .map((s) => {
      const lastDoneKm = s.lastDoneKm || 0;
      const diffKm = vehicle.currentMileage - lastDoneKm;
      const remainingKm = s.intervalKm - diffKm;

      let priority: "critical" | "due_soon" | "scheduled" = "scheduled";
      if (remainingKm <= 0) {
        priority = "critical";
      } else if (remainingKm <= 2500) {
        priority = "due_soon";
      }

      return {
        schedule: s,
        remainingKm,
        priority,
      };
    })
    .sort((a, b) => a.remainingKm - b.remainingKm);

  const criticalCount = upcomingItems.filter((i) => i.priority === "critical").length;
  const dueSoonCount = upcomingItems.filter((i) => i.priority === "due_soon").length;

  return (
    <div className="flex flex-col w-full pb-8 bg-[#F4F5F8] dark:bg-[#0d131d] text-neutral-900 dark:text-white select-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between bg-white/90 dark:bg-[#17202e]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-[#243044] sticky top-0 z-20 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
            Сервис и ТО
          </h2>
          <p className="text-xs text-neutral-500">
            {vehicle.make} {vehicle.model} • {vehicle.currentMileage.toLocaleString("ru-RU")} км
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (onExportPdf) onExportPdf();
              else exportServiceBookToPdf(vehicle, carRecords);
            }}
            className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-800 flex items-center justify-center transition cursor-pointer"
            title="Экспорт сервисной книжки в PDF"
          >
            <FileDown className="w-4 h-4 text-brand-strong" />
          </button>
          {onOpenScanBarcode && (
            <button
              onClick={onOpenScanBarcode}
              className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-800 flex items-center justify-center transition cursor-pointer"
              title="Сканировать штрихкод детали или VIN"
            >
              <ScanBarcode className="w-4 h-4 text-neutral-700" />
            </button>
          )}
          <button
            onClick={onOpenScanReceipt}
            className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 flex items-center justify-center transition cursor-pointer"
            title="Сканировать чек"
          >
            <ScanLine className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAddService}
            className="px-3 py-1.5 rounded-xl bg-brand-strong hover:bg-brand text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-brand-strong/30 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Запись</span>
          </button>
        </div>
      </div>

      {/* Segmented Tab Controller (UPCOMING / HISTORY) */}
      <div className="px-4 py-3">
        <div className="flex p-1 bg-neutral-200/70 dark:bg-[#1c2637] rounded-2xl border border-neutral-200 dark:border-[#243044]">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-white dark:bg-[#243044] text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <span>Ближайшие ТО</span>
            {(criticalCount > 0 || dueSoonCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-brand-strong" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "history"
                ? "bg-white dark:bg-[#243044] text-neutral-900 dark:text-white shadow-xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <span>История ({carRecords.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: UPCOMING SCHEDULE */}
      {activeTab === "upcoming" && (
        <div className="px-4 space-y-3">
          {/* Quick status summary chip */}
          <div className="p-3 rounded-2xl bg-white border border-neutral-200/90 shadow-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-neutral-700">
                Заводской регламент ТО:
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-brand-strong font-bold">{criticalCount} критично</span>
              <span className="text-neutral-300">•</span>
              <span className="text-amber-600 font-bold">{dueSoonCount} скоро</span>
            </div>
          </div>

          {upcomingItems.map(({ schedule, remainingKm, priority }) => {
            const isCritical = priority === "critical";
            const isDueSoon = priority === "due_soon";

            return (
              <div
                key={schedule.id}
                className={`p-4 rounded-3xl border transition-all shadow-xs ${
                  isCritical
                    ? "bg-white border-brand-border"
                    : isDueSoon
                    ? "bg-white border-amber-200"
                    : "bg-white border-neutral-200/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block mb-1 ${
                        isCritical
                          ? "bg-brand-soft-strong text-brand-hover"
                          : isDueSoon
                          ? "bg-amber-100 text-amber-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {isCritical ? "CRITICAL • СРОЧНО" : isDueSoon ? "DUE SOON • СКОРО" : "SCHEDULED"}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                      {schedule.title}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-bold ${isCritical ? "text-brand-strong" : isDueSoon ? "text-amber-600" : "text-neutral-800"}`}>
                      {remainingKm <= 0
                        ? "Просрочено"
                        : `через ${remainingKm.toLocaleString("ru-RU")} км`}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Интервал {schedule.intervalKm.toLocaleString("ru-RU")} км
                    </div>
                  </div>
                </div>

                {schedule.oemPartHint && (
                  <p className="text-[11px] text-neutral-600 mb-3 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200/60">
                    💡 <span className="font-semibold text-neutral-800">Детали:</span> {schedule.oemPartHint}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => onMarkOemDone?.(schedule)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Отметить выполнено</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SERVICE HISTORY TIMELINE */}
      {activeTab === "history" && (
        <div className="px-4 space-y-3">
          {/* Official Service Book & PDF Export Card */}
          <div className="p-3.5 rounded-3xl bg-white border border-neutral-200/90 shadow-xs flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-brand-strong uppercase tracking-wider">
                Сервисная книжка авто
              </div>
              <div className="text-xs font-bold text-neutral-900 truncate">
                {carRecords.length} {carRecords.length === 1 ? "запись" : "записей"} • {formatGarageCurrency(carRecords.reduce((s, r) => s + r.totalCost, 0))}
              </div>
            </div>
            <button
              onClick={() => {
                if (onExportPdf) onExportPdf();
                else exportServiceBookToPdf(vehicle, carRecords);
              }}
              className="px-3 py-2 rounded-xl bg-brand-strong hover:bg-brand text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-strong/20 active:scale-95 transition cursor-pointer shrink-0"
              title="Выгрузить сервисную историю в PDF для печати или сохранения"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Экспорт в PDF</span>
            </button>
          </div>

          <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-300">
            {carRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => onSelectRecord?.(record)}
                className="relative bg-white border border-neutral-200/90 hover:border-neutral-300 rounded-3xl p-4 transition shadow-xs active:scale-[0.99] cursor-pointer"
              >
                {/* Timeline node */}
                <div className="absolute -left-6 top-5 w-3.5 h-3.5 rounded-full bg-brand-strong border-2 border-white shadow-xs" />

                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span className="text-[10px] font-mono text-brand-strong font-bold uppercase tracking-wider">
                      {record.category}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                      {record.title}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-neutral-900 font-mono">
                      {formatGarageCurrency(record.totalCost)}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {record.date}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 line-clamp-2 mb-2.5 leading-relaxed">
                  {record.description}
                </p>

                {/* Parts tag badges */}
                {record.parts && record.parts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {record.parts.map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono"
                      >
                        {p.brand} {p.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
                  <span>{record.mileage.toLocaleString("ru-RU")} км • {record.serviceCenter || "Сервис"}</span>
                  <div className="flex items-center gap-1 text-brand-strong font-bold">
                    <span>Подробнее</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
