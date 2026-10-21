import React, { useState } from "react";
import {
  Wrench,
  Search,
  Filter,
  Plus,
  Camera,
  Calendar,
  Gauge,
  Tag,
  Package,
  FileImage,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  CheckCircle,
  RotateCcw,
  History,
  FileDown,
} from "lucide-react";
import { ServiceRecord, Vehicle, MaintenanceCategory } from "../types";
import { exportServiceBookToPdf } from "../utils/serviceBookPdfExport";

interface ServiceLogViewProps {
  vehicle: Vehicle;
  records: ServiceRecord[];
  onAddRecord: () => void;
  onScanReceipt: () => void;
  onDeleteRecord: (id: string) => void;
  onExportPdf?: () => void;
}

export const ServiceLogView: React.FC<ServiceLogViewProps> = ({
  vehicle,
  records,
  onAddRecord,
  onScanReceipt,
  onDeleteRecord,
  onExportPdf,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isHistoryListCollapsed, setIsHistoryListCollapsed] = useState(false);

  const vehicleRecords = records.filter((r) => r.vehicleId === vehicle.id);

  const handleExportPdf = () => {
    if (onExportPdf) {
      onExportPdf();
    } else {
      exportServiceBookToPdf(vehicle, vehicleRecords);
    }
  };

  // Filter records
  const filteredRecords = vehicleRecords.filter((record) => {
    const matchesCategory =
      selectedCategory === "all" || record.category === selectedCategory;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesTitle = (record.title || "").toLowerCase().includes(query);
    const matchesDesc = (record.description || "").toLowerCase().includes(query);
    const matchesCenter = (record.serviceCenter || "").toLowerCase().includes(query);
    const matchesParts = Array.isArray(record.parts) && record.parts.some(
      (p) =>
        (p?.name || "").toLowerCase().includes(query) ||
        (p?.brand || "").toLowerCase().includes(query) ||
        (p?.partNumber || "").toLowerCase().includes(query)
    );

    return matchesCategory && (matchesTitle || matchesDesc || matchesCenter || matchesParts);
  });

  const totalCost = filteredRecords.reduce((sum, r) => sum + r.totalCost, 0);

  const categories: MaintenanceCategory[] = [
    "ТО и замена жидкостей",
    "Двигатель",
    "Трансмиссия и сцепление",
    "Подвеска и рулевое",
    "Тормозная система",
    "Электрика и датчики",
    "Выхлопная система",
    "Кузов и стекла",
    "Шины и диски",
    "Другое",
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-brand-strong uppercase tracking-wider">
            Журнал обслуживания
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Дневник ТО и ремонта
          </h2>
          <p className="text-xs text-neutral-500">
            Суммарно: <strong className="text-neutral-900 font-mono">{totalCost.toLocaleString("ru-RU")} ₽</strong> для {vehicle.make} {vehicle.model}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportPdf}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 dark:bg-[#17202E] dark:hover:bg-[#1E293B] dark:border-[#243044] dark:text-neutral-100 text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95"
            title="Выгрузить сервисную книжку и историю автомобиля в PDF"
          >
            <FileDown className="w-4 h-4 text-brand-strong" />
            <span>Экспорт в PDF</span>
          </button>
          <button
            onClick={onScanReceipt}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <Camera className="w-4 h-4 text-brand-on-dark" />
            <span>Чек / OCR</span>
          </button>
          <button
            onClick={onAddRecord}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-brand-strong hover:bg-brand text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-brand-strong/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить запись</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white rounded-3xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Поиск по работам, сервису, запчастям или артикулу (например Mann, Brembo, NS-2)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-neutral-900 focus:outline-none focus:border-brand"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === "all"
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
            }`}
          >
            Все категории ({vehicleRecords.length})
          </button>
          {categories.map((cat) => {
            const count = vehicleRecords.filter((r) => r.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-brand-strong text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified Monolithic History Block (Matching To-Fix Design System) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-brand-border/80 shadow-sm transition-all duration-200">
        <div
          onClick={() => setIsHistoryListCollapsed((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHistoryListCollapsed((prev) => !prev);
              }}
              className="w-8 h-8 rounded-xl bg-brand-soft hover:bg-brand-soft-strong text-brand-strong border border-brand-border/60 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 shrink-0"
              title={!isHistoryListCollapsed ? "Свернуть историю" : "Развернуть историю"}
            >
              <History className="w-4 h-4 text-brand-strong stroke-[2.2]" />
            </button>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <span>История ремонтов</span>
                <span className="text-[10px] bg-brand-soft-strong text-brand-hover font-bold px-2 py-0.5 rounded-full font-mono">
                  {filteredRecords.length}
                </span>
              </h4>
              <p className="text-[11px] text-neutral-500">
                {isHistoryListCollapsed
                  ? "Список записей свернут (нажмите, чтобы развернуть)"
                  : "Хронология выполненных ремонтов, ТО и заказ-нарядов"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(selectedCategory !== "all" || searchQuery.trim() !== "") && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="text-xs font-semibold px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="w-3 h-3 text-neutral-500" />
                <span className="hidden sm:inline">Сбросить фильтр</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleExportPdf();
              }}
              className="text-xs font-semibold px-2.5 py-1.5 bg-brand-soft hover:bg-brand-soft-strong text-brand-hover border border-brand-border/60 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
              title="Экспорт истории обслуживания в PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-brand-strong" />
              <span className="hidden sm:inline">Экспорт в PDF</span>
            </button>

            <span className="text-xs font-semibold px-3 py-1.5 bg-brand-soft hover:bg-brand-soft-strong text-brand-hover rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm border border-brand-border/60">
              {!isHistoryListCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Свернуть</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Развернуть ({filteredRecords.length})</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Content list within the monolithic block (identical to To-Fix and OEM tasks layout) */}
        {!isHistoryListCollapsed && (
          <div className="space-y-3 pt-3 mt-3 border-t border-brand-soft-strong">
            {filteredRecords.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200/80 shadow-sm space-y-2">
                <Wrench className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-neutral-800">Записей не найдено</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Попробуйте изменить поисковый запрос или добавьте новую запись о техобслуживании.
                </p>
              </div>
            ) : (
              filteredRecords.map((record) => {
                const isExpanded = expandedRecordId === record.id;

                return (
                  <div
                    key={record.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200/80 hover:border-neutral-300 transition-all duration-200 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-full">
                            {record.date}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-brand-hover bg-brand-soft px-2 py-0.5 rounded-md">
                            {record.mileage.toLocaleString("ru-RU")} км
                          </span>
                          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-medium">
                            {record.category}
                          </span>
                          {record.receiptImages && record.receiptImages.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                              <CheckCircle className="w-3 h-3" /> Чек прикреплен
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-neutral-900 mt-1">
                          {record.title}
                        </h4>

                        {record.serviceCenter && (
                          <p className="text-xs text-neutral-600 mt-0.5">
                            Сервис: <span className="font-medium text-neutral-800">{record.serviceCenter}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                        <div className="text-left sm:text-right font-mono">
                          <div className="text-[10px] text-neutral-400">Сумма</div>
                          <div className="text-sm sm:text-base font-extrabold text-neutral-900">
                            {record.totalCost.toLocaleString("ru-RU")} ₽
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRecordId(isExpanded ? null : record.id)
                          }
                          className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                        >
                          <span>{isExpanded ? "Свернуть" : "Детали"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details Section */}
                    {isExpanded && (
                      <div className="mt-1 pt-2.5 border-t border-neutral-100/90 space-y-3">
                        {/* Description */}
                        {record.description && (
                          <div>
                            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                              Описание выполненных работ
                            </div>
                            <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-2xl border border-neutral-200/80">
                              {record.description}
                            </p>
                          </div>
                        )}

                        {/* Parts with Brands & SKUs */}
                        {record.parts.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" />
                              <span>Использованные запчасти и расходники ({record.parts.length})</span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left bg-white rounded-2xl border border-neutral-200/80 overflow-hidden">
                                <thead className="bg-neutral-100 text-neutral-600 font-semibold text-[11px] uppercase">
                                  <tr>
                                    <th className="py-2.5 px-3">Наименование</th>
                                    <th className="py-2.5 px-3">Бренд</th>
                                    <th className="py-2.5 px-3">Артикул (SKU)</th>
                                    <th className="py-2.5 px-3 text-center">Кол-во</th>
                                    <th className="py-2.5 px-3 text-right">Цена</th>
                                    <th className="py-2.5 px-3 text-right">Сумма</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                                  {record.parts.map((p) => (
                                    <tr key={p.id} className="hover:bg-neutral-50/80">
                                      <td className="py-2 px-3 font-medium">{p.name}</td>
                                      <td className="py-2 px-3 text-neutral-600">{p.brand || "—"}</td>
                                      <td className="py-2 px-3 font-mono font-bold text-neutral-900">
                                        {p.partNumber || "—"}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono">{p.quantity}</td>
                                      <td className="py-2 px-3 text-right font-mono text-neutral-600">
                                        {p.unitPrice.toLocaleString("ru-RU")} ₽
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-semibold text-neutral-900">
                                        {(p.quantity * p.unitPrice).toLocaleString("ru-RU")} ₽
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Cost Breakdown & Receipt preview */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80">
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div>
                              <span className="text-neutral-400">Работа:</span>{" "}
                              <strong className="text-neutral-900">
                                {record.laborCost.toLocaleString("ru-RU")} ₽
                              </strong>
                            </div>
                            <div>
                              <span className="text-neutral-400">Детали:</span>{" "}
                              <strong className="text-neutral-900">
                                {(record.totalCost - record.laborCost).toLocaleString("ru-RU")} ₽
                              </strong>
                            </div>
                            <div>
                              <span className="text-neutral-400">Итого:</span>{" "}
                              <strong className="text-brand-strong font-bold">
                                {record.totalCost.toLocaleString("ru-RU")} ₽
                              </strong>
                            </div>
                          </div>

                          {/* Receipt Image Button */}
                          {record.receiptImages && record.receiptImages.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReceiptUrl(record.receiptImages![0]);
                              }}
                              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileImage className="w-3.5 h-3.5 text-brand-on-dark" />
                              <span>Посмотреть чек</span>
                            </button>
                          )}
                        </div>

                        {/* Notes & Delete button */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[11px] text-neutral-500 italic">
                            {record.notes || "Гарантия на работы согласно заказ-наряду."}
                          </div>

                          {confirmDeleteId === record.id ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <span className="text-xs text-neutral-500 font-medium">Точно удалить?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteRecord(record.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-xs font-bold text-white bg-brand-strong hover:bg-brand-hover px-2.5 py-1 rounded-lg cursor-pointer transition shadow-xs"
                              >
                                Да
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded-lg cursor-pointer transition"
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(record.id);
                              }}
                              className="text-xs text-brand-strong hover:text-brand-hover flex items-center gap-1 p-1 cursor-pointer transition font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Удалить</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal to view attached receipt */}
      {selectedReceiptUrl && (
        <div
          onClick={() => setSelectedReceiptUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">
                Прикреплённый документ / Чек
              </h3>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="text-xs font-bold text-neutral-400 hover:text-neutral-700"
              >
                ✕ Закрыть
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center p-2">
              <img
                width={640}
                height={480}
                src={selectedReceiptUrl}
                alt="Чек"
                className="max-h-[480px] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="text-center">
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="w-full py-2.5 bg-neutral-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
