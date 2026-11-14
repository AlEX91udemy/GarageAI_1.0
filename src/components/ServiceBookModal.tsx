import { useModalFocus } from "./useModalFocus";
import React, { useState } from "react";
import {
  X,
  FileText,
  Printer,
  Download,
  Upload,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Calendar,
  Gauge,
  Car,
  FileDown,
} from "lucide-react";
import { Vehicle, ServiceRecord } from "../types";
import { LicensePlateBadge } from "./LicensePlateBadge";
import {
  exportServiceBookToPdf,
  downloadServiceBookHtml,
} from "../utils/serviceBookPdfExport";

interface ServiceBookModalProps {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  onClose: () => void;
  onImportBackup: (jsonData: string) => void;
}

export const ServiceBookModal: React.FC<ServiceBookModalProps> = ({
  vehicle,
  serviceRecords,
  onClose,
  onImportBackup,
}) => {
  const [activeTab, setActiveTab] = useState<"book" | "backup">("book");
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const vehicleRecords = [...serviceRecords]
    .filter((r) => r.vehicleId === vehicle.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalSpent = vehicleRecords.reduce((sum, r) => sum + r.totalCost, 0);

  const handlePrint = () => {
    try {
      if (typeof window !== "undefined" && typeof window.print === "function") {
        window.print();
      }
    } catch (e) {
      console.warn("Print not supported in current environment", e);
    }
  };

  const handleExportJson = () => {
    const backupData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      vehicle,
      serviceRecords: vehicleRecords,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Garage AI_${vehicle.make}_${vehicle.model}_ServiceBook.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      JSON.parse(importJsonText);
      onImportBackup(importJsonText);
      setImportStatus({ type: "success", message: "Данные успешно импортированы!" });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setImportStatus({ type: "error", message: "Ошибка: некорректный формат JSON." });
    }
  };

  const dialogRef = useModalFocus(onClose);

  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-label="Сервисная книжка" tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header & Tabs */}
        <div className="p-4 sm:p-6 pb-3 border-b border-neutral-100 shrink-0 bg-white">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-brand-strong uppercase tracking-wider">
                  Официальный документ для продажи авто
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
                  Электронная сервисная книжка
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportServiceBookToPdf(vehicle, serviceRecords)}
                className="px-3.5 py-1.5 bg-brand-strong hover:bg-brand text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md shadow-brand-strong/25 active:scale-95"
                title="Экспорт сервисной книжки в PDF для печати или сохранения документа"
              >
                <FileDown className="w-4 h-4" />
                <span>Экспорт в PDF</span>
              </button>
              <button
                onClick={() => downloadServiceBookHtml(vehicle, serviceRecords)}
                className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition cursor-pointer hidden sm:flex items-center gap-1 text-xs font-semibold"
                title="Скачать автономный файл сервисной книжки в HTML"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span>HTML</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                title="Закрыть (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 text-xs">
            <button
              onClick={() => setActiveTab("book")}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeTab === "book"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              Паспорт обслуживания
            </button>
            <button
              onClick={() => setActiveTab("backup")}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeTab === "backup"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              Экспорт / Импорт бэкапа
            </button>
          </div>
        </div>

        {/* Scrollable Document Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          {activeTab === "book" ? (
            <div className="space-y-4 print:p-0">
              {/* Passport Car Cover */}
            <div className="p-4 sm:p-5 bg-neutral-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-brand-strong text-xs font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Верифицированная сервисная история</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black mt-1">
                  {vehicle.make} {vehicle.model} {vehicle.generation}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 mt-1">
                  <span>VIN: <strong className="text-white font-mono">{vehicle.vin || "Не указан"}</strong></span>
                  <span>•</span>
                  {vehicle.licensePlate ? (
                    <LicensePlateBadge plate={vehicle.licensePlate} size="sm" />
                  ) : (
                    <span>Госномер: <strong className="text-white">Не указан</strong></span>
                  )}
                  <span>•</span>
                  <span>Год: <strong>{vehicle.year}</strong></span>
                  <span>•</span>
                  <span>ДВС: <strong>{vehicle.engine}</strong></span>
                </div>
              </div>

              {/* Verified Badge / Stamp */}
              <div className="p-3 bg-neutral-800 rounded-xl border border-neutral-700 flex items-center gap-3 shrink-0">
                <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-neutral-900" />
                </div>
                <div className="text-[11px]">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Проверено
                  </div>
                  <div className="text-neutral-400">Garage AI Cloud</div>
                  <div className="text-neutral-400 font-mono text-[10px]">
                    {vehicleRecords.length} записей
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="text-neutral-500 text-[11px]">Текущий пробег</div>
                <div className="font-bold text-neutral-900 font-mono mt-0.5">
                  {vehicle.currentMileage.toLocaleString("ru-RU")} км
                </div>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="text-neutral-500 text-[11px]">Всего записей</div>
                <div className="font-bold text-neutral-900 font-mono mt-0.5">
                  {vehicleRecords.length} ТО и ремонтов
                </div>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="text-neutral-500 text-[11px]">Подтвержденный бюджет</div>
                <div className="font-bold text-neutral-900 font-mono mt-0.5">
                  {totalSpent.toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </div>

            {/* Service Log Table for Print/Resale */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-neutral-200 rounded-2xl overflow-hidden">
                <thead className="bg-neutral-100 text-neutral-700 font-semibold text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Дата / Пробег</th>
                    <th className="py-2.5 px-3">Вид работ / Сервис</th>
                    <th className="py-2.5 px-3">Установленные детали (Бренд / Артикул)</th>
                    <th className="py-2.5 px-3 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800">
                  {vehicleRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 align-top font-mono">
                        <div className="font-bold text-neutral-900">{record.date}</div>
                        <div className="text-neutral-500 text-[11px]">
                          {record.mileage.toLocaleString("ru-RU")} км
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-bold text-neutral-900">{record.title}</div>
                        <div className="text-neutral-500 text-[11px]">
                          {record.serviceCenter || "Гараж"} • {record.category}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 align-top text-[11px] text-neutral-600">
                        {record.parts.length > 0 ? (
                          <div className="space-y-0.5">
                            {record.parts.map((p) => (
                              <div key={p.id}>
                                • {p.name} — <span className="font-bold text-neutral-800">{p.brand}</span> [{p.partNumber || "—"}]
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400">Без запчастей (диагностика/регулировка)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-top text-right font-mono font-bold text-neutral-900">
                        {record.totalCost.toLocaleString("ru-RU")} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Backup tab */
          <div className="mt-4 space-y-4 text-xs">
            {/* PDF Export Section */}
            <div className="p-4 bg-gradient-to-br from-brand/60 to-brand/30 rounded-2xl border border-brand-border/80 space-y-2">
              <h4 className="font-bold text-neutral-900 flex items-center gap-1.5">
                <FileDown className="w-4 h-4 text-brand-strong" />
                <span>Официальный экспорт сервисной книжки (PDF / Печать)</span>
              </h4>
              <p className="text-neutral-600 text-[11px] leading-relaxed">
                Сформируйте чистый верифицированный сервисный паспорт автомобиля со всеми записями ТО, артикулами заменённых запчастей и суммами. Удобно распечатать на бумаге или сохранить как PDF для покупателя.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => exportServiceBookToPdf(vehicle, serviceRecords)}
                  className="px-4 py-2 bg-brand-strong hover:bg-brand text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-brand-strong/20 active:scale-95"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Экспорт в PDF (Сохранить / Печать)</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadServiceBookHtml(vehicle, serviceRecords)}
                  className="px-3 py-2 bg-white hover:bg-neutral-100 text-neutral-700 font-semibold border border-neutral-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  title="Скачать сервисный паспорт в HTML"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Скачать HTML-файл</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
              <h4 className="font-bold text-neutral-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Резервная копия данных (JSON)</span>
              </h4>
              <p className="text-neutral-500 text-[11px]">
                Выгрузите полную историю автомобиля со всеми запчастями, артикулами и чеками в файл на компьютер или телефон.
              </p>
              <button
                onClick={handleExportJson}
                className="px-4 py-2 bg-neutral-900 text-white font-bold rounded-xl hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать бэкап (.json)</span>
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
              <h4 className="font-bold text-neutral-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-brand-strong" />
                <span>Восстановить данные из бэкапа</span>
              </h4>
              <textarea
                rows={4}
                placeholder="Вставьте скопированный JSON бэкапа сюда..."
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-[11px] font-mono"
                required
              />
              {importStatus && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    importStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-brand-soft text-brand-hover border border-brand-border"
                  }`}
                >
                  {importStatus.message}
                </div>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-brand-strong hover:bg-brand text-white font-bold rounded-xl transition cursor-pointer"
              >
                Импортировать
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="flex items-center justify-between p-3.5 sm:px-6 border-t border-neutral-100 shrink-0 bg-neutral-50/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportServiceBookToPdf(vehicle, serviceRecords)}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-strong hover:bg-brand rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-brand-strong/20 active:scale-95"
            title="Выгрузить сервисную книжку в PDF"
          >
            <FileDown className="w-4 h-4" />
            <span>Экспорт в PDF</span>
          </button>
          <button
            type="button"
            onClick={() => downloadServiceBookHtml(vehicle, serviceRecords)}
            className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-xl transition cursor-pointer hidden sm:flex items-center gap-1.5"
            title="Скачать файл сервисной книжки"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Скачать файл</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-neutral-200/90 hover:bg-neutral-200 rounded-xl transition cursor-pointer active:scale-95"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
);
};
