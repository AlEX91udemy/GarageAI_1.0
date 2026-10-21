import React, { useState } from "react";
import {
  Plus,
  Search,
  MapPin,
  ScanBarcode,
} from "lucide-react";
import { GaragePart, Vehicle } from "../../types";
import { formatGarageCurrency } from "../currency";

interface PartsScreenProps {
  parts: GaragePart[];
  vehicles: Vehicle[];
  currentVehicle: Vehicle;
  onSelectPart: (part: GaragePart) => void;
  onAddPart: () => void;
  onOpenScanBarcode?: () => void;
}

export const PartsScreen: React.FC<PartsScreenProps> = ({
  parts,
  onSelectPart,
  onAddPart,
  onOpenScanBarcode,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParts = parts.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.partNumber.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: GaragePart["status"]) => {
    switch (status) {
      case "in_stock":
        return {
          label: "В наличии",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "ordered":
        return {
          label: "Заказано",
          color: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "installed":
        return {
          label: "Установлено",
          color: "bg-neutral-100 text-neutral-600 border-neutral-200",
        };
      default:
        return {
          label: status,
          color: "bg-neutral-100 text-neutral-600 border-neutral-200",
        };
    }
  };

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-20 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">
            Склад запчастей
          </h2>
          <p className="text-xs text-neutral-500">
            {parts.length} позиций на хранении и в заказе
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenScanBarcode && (
            <button
              onClick={onOpenScanBarcode}
              className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition cursor-pointer"
              title="Сканировать штрихкод детали"
            >
              <ScanBarcode className="w-4 h-4 text-brand-strong" />
            </button>
          )}
          <button
            onClick={onAddPart}
            className="px-3.5 py-1.5 rounded-xl bg-brand-strong hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-brand-strong/20 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Деталь</span>
          </button>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="p-4 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по названию, артикулу или бренду..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-neutral-200/90 text-neutral-900 placeholder:text-neutral-400 text-xs focus:outline-none focus:border-brand shadow-xs"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Все" },
            { id: "in_stock", label: "В наличии" },
            { id: "ordered", label: "Заказано" },
            { id: "installed", label: "Установлено" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                filterStatus === f.id
                  ? "bg-neutral-900 text-white shadow-xs font-bold"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parts list */}
      <div className="px-4 space-y-2.5">
        {filteredParts.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-neutral-200/90 text-center text-xs text-neutral-400 shadow-xs">
            Запчастей по фильтру не найдено
          </div>
        ) : (
          filteredParts.map((part) => {
            const badge = getStatusBadge(part.status);

            return (
              <div
                key={part.id}
                onClick={() => onSelectPart(part)}
                className="p-3.5 rounded-2xl bg-white border border-neutral-200/90 hover:border-neutral-300 shadow-xs transition active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {part.brand}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-neutral-900 mt-1 truncate">
                      {part.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-neutral-900">
                      {formatGarageCurrency(part.purchasePrice * part.quantity)}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {part.quantity} шт.
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-neutral-600 bg-neutral-50 p-2 rounded-xl border border-neutral-200/60 flex items-center justify-between mt-2">
                  <span>SKU: {part.partNumber}</span>
                  {part.location && (
                    <span className="flex items-center gap-1 text-neutral-700">
                      <MapPin className="w-3 h-3 text-brand-strong" />
                      {part.location}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
