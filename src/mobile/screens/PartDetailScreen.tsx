import React from "react";
import {
  ArrowLeft,
  Package,
  MapPin,
  Car,
  DollarSign,
  Tag,
  CheckCircle2,
  Trash2,
  Wrench,
} from "lucide-react";
import { GaragePart, Vehicle } from "../../types";
import { formatGarageCurrency } from "../currency";

interface PartDetailScreenProps {
  part: GaragePart;
  vehicle?: Vehicle;
  onBack: () => void;
  onInstall: (part: GaragePart) => void;
  onDelete: (partId: string) => void;
}

export const PartDetailScreen: React.FC<PartDetailScreenProps> = ({
  part,
  vehicle,
  onBack,
  onInstall,
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
          <span>Назад к складу</span>
        </button>

        <span className="text-xs font-bold text-neutral-800">Карточка запчасти</span>

        <button
          onClick={() => {
            onDelete?.(part.id);
            onBack?.();
          }}
          className="w-8 h-8 rounded-full bg-brand-soft hover:bg-brand-soft-strong text-brand-strong flex items-center justify-center cursor-pointer transition border border-brand-border"
          title="Удалить деталь"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Main Part Card */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
              {part.category}
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              Бренд: <strong className="text-neutral-800">{part.brand}</strong>
            </span>
          </div>

          <h2 className="text-xl font-black text-neutral-900 tracking-tight leading-snug">
            {part.name}
          </h2>

          <div className="mt-2 text-xs font-mono text-neutral-500">
            Каталожный номер (SKU): <span className="text-neutral-900 font-bold">{part.partNumber}</span>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-baseline justify-between">
            <span className="text-xs text-neutral-500 font-medium">Стоимость позиции:</span>
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {formatGarageCurrency(part.purchasePrice * part.quantity)}
            </span>
          </div>
        </div>

        {/* Location & Quantity info */}
        <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-3 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Количество в наличии:</span>
            <span className="font-bold text-neutral-900 font-mono text-sm">
              {part.quantity} шт.
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-neutral-100">
            <span className="text-neutral-500">Цена за 1 единицу:</span>
            <span className="font-bold text-neutral-900 font-mono">
              {formatGarageCurrency(part.purchasePrice)}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-neutral-500">Место хранения:</span>
            <span className="flex items-center gap-1 font-semibold text-neutral-800">
              <MapPin className="w-3.5 h-3.5 text-brand-strong" />
              {part.location || "Гараж (Основной бокс)"}
            </span>
          </div>
        </div>

        {/* Category badge */}
        {part.category && (
          <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-1">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
              Категория узла
            </h3>
            <p className="text-xs text-neutral-800 font-semibold">
              {part.category}
            </p>
          </div>
        )}

        {/* Action button: Install */}
        <div className="pt-2">
          <button
            onClick={() => {
              onInstall?.(part);
              onBack?.();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-brand-strong hover:bg-brand text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-strong/30 active:scale-[0.98] transition cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Установить на автомобиль (Внести в ТО)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
