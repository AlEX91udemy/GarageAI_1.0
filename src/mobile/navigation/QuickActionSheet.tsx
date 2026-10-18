import React from "react";
import {
  Wrench,
  Flame,
  Fuel,
  CreditCard,
  Package,
  AlertTriangle,
  Camera,
  ScanLine,
  ScanBarcode,
  X,
} from "lucide-react";
import { QuickActionType } from "../types";
import { ThemeMode } from "../theme";
import { useModalFocus } from "../../components/useModalFocus";

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: QuickActionType) => void;
  carName: string;
  themeMode?: ThemeMode;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  carName,
  themeMode = "dark",
}) => {
  const sheetRef = useModalFocus(onClose, isOpen);
  if (!isOpen) return null;

  const isDark = themeMode === "dark";

  const actions: Array<{
    id: QuickActionType;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    accent: string;
  }> = [
    {
      id: "service",
      label: "Обслуживание",
      sublabel: "Плановое ТО, масло и фильтры",
      icon: <Wrench className="w-5 h-5 text-blue-500" />,
      accent: isDark ? "bg-blue-500/15 border-blue-500/25" : "bg-blue-50 border-blue-100",
    },
    {
      id: "repair",
      label: "Ремонт",
      sublabel: "Устранение неисправности и узлов",
      icon: <Flame className="w-5 h-5 text-red-500" />,
      accent: isDark ? "bg-red-500/15 border-red-500/25" : "bg-red-50 border-red-100",
    },
    {
      id: "fuel",
      label: "Заправка",
      sublabel: "Литры, стоимость, АЗС, расход",
      icon: <Fuel className="w-5 h-5 text-emerald-500" />,
      accent: isDark ? "bg-emerald-500/15 border-emerald-500/25" : "bg-emerald-50 border-emerald-100",
    },
    {
      id: "expense",
      label: "Расход",
      sublabel: "Мойка, парковка, ОСАГО, налог",
      icon: <CreditCard className="w-5 h-5 text-violet-500" />,
      accent: isDark ? "bg-violet-500/15 border-violet-500/25" : "bg-violet-50 border-violet-100",
    },
    {
      id: "part",
      label: "Запчасть",
      sublabel: "Добавить на склад гаража (SKU)",
      icon: <Package className="w-5 h-5 text-amber-500" />,
      accent: isDark ? "bg-amber-500/15 border-amber-500/25" : "bg-amber-50 border-amber-100",
    },
    {
      id: "problem",
      label: "Проблема (To-Fix)",
      sublabel: "Симптом, ошибка Check или стук",
      icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
      accent: isDark ? "bg-orange-500/15 border-orange-500/25" : "bg-orange-50 border-orange-100",
    },
    {
      id: "scan_receipt",
      label: "Сканировать чек",
      sublabel: "AI OCR распознавание заказ-наряда",
      icon: <ScanLine className="w-5 h-5 text-rose-500" />,
      accent: isDark ? "bg-rose-500/15 border-rose-500/25" : "bg-rose-50 border-rose-100",
    },
    {
      id: "scan_barcode",
      label: "Сканер деталей / VIN",
      sublabel: "Камера: штрихкод запчасти или VIN",
      icon: <ScanBarcode className="w-5 h-5 text-red-500" />,
      accent: isDark ? "bg-red-500/15 border-red-500/25" : "bg-red-50 border-red-100",
    },
    {
      id: "photo",
      label: "Фото (До / После)",
      sublabel: "Фиксация состояния или тюнинга",
      icon: <Camera className="w-5 h-5 text-cyan-500" />,
      accent: isDark ? "bg-cyan-500/15 border-cyan-500/25" : "bg-cyan-50 border-cyan-100",
    },
  ];

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label="Быстрое действие"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-sm animate-fade-in select-none"
    >
      {/* Tap backdrop to close */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Закрыть меню быстрых действий"
        className="flex-1 w-full bg-transparent"
        onClick={onClose}
      />

      {/* Native-style bottom sheet */}
      <div
        className={`w-full max-w-[430px] mx-auto border-t rounded-t-3xl shadow-2xl p-4 pb-8 max-h-[85vh] overflow-y-auto animate-slide-up transition-colors ${
          isDark
            ? "bg-[#121a28] border-[#243044] text-white"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* Drag handle */}
        <div
          className={`w-10 h-1.5 rounded-full mx-auto mb-3 ${
            isDark ? "bg-slate-700" : "bg-neutral-300"
          }`}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-1 mb-4">
          <div>
            <h3 className="text-base font-black tracking-tight">
              Быстрое действие
            </h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-neutral-500"}`}>
              Автомобиль:{" "}
              <span className={`font-bold ${isDark ? "text-slate-200" : "text-neutral-800"}`}>
                {carName}
              </span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Закрыть меню быстрых действий"
            onClick={onClose}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
              isDark
                ? "bg-[#1a2436] hover:bg-[#222f46] text-slate-300"
                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid of actions */}
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className={`flex items-start gap-3 p-3 rounded-2xl border transition active:scale-[0.98] text-left cursor-pointer group ${
                isDark
                  ? "bg-[#17202e] hover:bg-[#1e2a3d] border-[#243044]"
                  : "bg-neutral-50 hover:bg-neutral-100/90 border-neutral-200/80"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl ${act.accent} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                {act.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold tracking-tight leading-tight">
                  {act.label}
                </div>
                <div
                  className={`text-[10px] line-clamp-2 mt-0.5 leading-snug ${
                    isDark ? "text-slate-400" : "text-neutral-500"
                  }`}
                >
                  {act.sublabel}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
