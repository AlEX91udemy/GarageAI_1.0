import React from "react";
import {
  ArrowLeft,
  Calendar,
  Gauge,
  Wrench,
  Package,
  FileText,
  DollarSign,
  Building2,
  Trash2,
} from "lucide-react";
import { ServiceRecord, Vehicle } from "../../types";
import { formatGarageCurrency } from "../currency";
import { formatDistance } from "../units";

interface ServiceDetailScreenProps {
  record: ServiceRecord;
  vehicle: Vehicle;
  onBack: () => void;
  onDelete?: (recordId: string) => void;
}

export const ServiceDetailScreen: React.FC<ServiceDetailScreenProps> = ({
  record,
  vehicle,
  onBack,
  onDelete,
}) => {
  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-200/80 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к списку</span>
        </button>

        <span className="text-xs font-bold text-neutral-800">Детали ТО</span>

        {onDelete ? (
          <button
            onClick={() => {
              onDelete?.(record.id);
              onBack?.();
            }}
            className="w-8 h-8 rounded-full bg-brand-soft hover:bg-brand-soft-strong text-brand-strong flex items-center justify-center cursor-pointer transition border border-brand-border"
            title="Удалить запись"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Main summary card */}
      <div className="p-4 space-y-3.5">
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs">
          <span className="text-[10px] font-mono text-brand-strong font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-soft border border-brand-border inline-block mb-1.5">
            {record.category}
          </span>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight leading-snug">
            {record.title}
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span>{record.date}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Gauge className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-mono">{formatDistance(record.mileage)}</span>
            </div>
          </div>

          <div className="mt-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-baseline justify-between">
            <span className="text-xs text-neutral-500 font-medium">Итоговая стоимость:</span>
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {formatGarageCurrency(record.totalCost)}
            </span>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
            Структура расходов
          </h3>
          <div className="flex justify-between text-xs py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Работы сервиса (Labor):</span>
            <span className="font-mono text-neutral-900 font-semibold">
              {formatGarageCurrency(record.laborCost || 0)}
            </span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-neutral-500">Запчасти и расходники:</span>
            <span className="font-mono text-neutral-900 font-semibold">
              {formatGarageCurrency(record.totalCost - (record.laborCost || 0))}
            </span>
          </div>
        </div>

        {/* Description & Notes */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-2">
          <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
            Описание выполненных работ
          </h3>
          <p className="text-xs text-neutral-700 leading-relaxed">
            {record.description || "Плановое техническое обслуживание автомобиля согласно регламенту."}
          </p>
          {record.notes && (
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 mt-2">
              📌 <span className="font-medium">Заметки механика:</span> {record.notes}
            </div>
          )}
          {record.serviceCenter && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2 border-t border-neutral-100">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>{record.serviceCenter}</span>
            </div>
          )}
        </div>

        {/* Parts used */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
            Установленные запчасти ({record.parts?.length || 0})
          </h3>

          {(!record.parts || record.parts.length === 0) ? (
            <div className="text-xs text-neutral-400 py-2">
              Запчасти отдельно не детализированы
            </div>
          ) : (
            <div className="space-y-2">
              {record.parts.map((part) => (
                <div
                  key={part.id}
                  className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-neutral-900">
                      {part.brand} {part.name}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      SKU: {part.partNumber} • {part.quantity} шт.
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-neutral-900">
                    {formatGarageCurrency(part.quantity * part.unitPrice)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipt / Invoice visual */}
        {record.receiptImages && record.receiptImages.length > 0 && (
          <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">
              Электронный заказ-наряд / чек
            </h3>
            <div className="w-full rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50 p-2">
              <img
                width={640}
                height={480}
                src={record.receiptImages[0]}
                alt="Заказ наряд"
                className="w-full rounded-xl max-h-72 object-contain mx-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
