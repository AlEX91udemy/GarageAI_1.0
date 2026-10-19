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
import { useModalFocus } from "../../components/useModalFocus";

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: QuickActionType) => void;
  carName: string;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  carName,
}) => {
  const sheetRef = useModalFocus(onClose, isOpen);
  if (!isOpen) return null;

  const actions: Array<{
    id: QuickActionType;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    bg: string;
    border: string;
  }> = [
    {
      id: "service",
      label: "Обслуживание",
      sublabel: "Плановое ТО, замена масла и фильтров",
      icon: <Wrench className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      id: "repair",
      label: "Ремонт",
      sublabel: "Устранение неисправности и замена узлов",
      icon: <Flame className="w-5 h-5 text-red-600" />,
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      id: "fuel",
      label: "Заправка",
      sublabel: "Литры, стоимость, АЗС, расчет расхода",
      icon: <Fuel className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      id: "expense",
      label: "Расход",
      sublabel: "Мойка, парковка, страховка, налог",
      icon: <CreditCard className="w-5 h-5 text-violet-600" />,
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      id: "part",
      label: "Запчасть",
      sublabel: "Добавить на склад гаража или в заказ",
      icon: <Package className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      id: "problem",
      label: "Проблема (To-Fix)",
      sublabel: "Симптом, ошибка Check Engine или стук",
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
      bg: "bg-orange-50",
      border: "border-orange-100",
    },
    {
      id: "photo",
      label: "Фото (До / После)",
      sublabel: "Фиксация состояния, тюнинг или ремонт",
      icon: <Camera className="w-5 h-5 text-cyan-600" />,
      bg: "bg-cyan-50",
      border: "border-cyan-100",
    },
    {
      id: "scan_barcode",
      label: "Сканер деталей / VIN",
      sublabel: "Камера: штрихкод запчасти, QR или VIN",
      icon: <ScanBarcode className="w-5 h-5 text-red-600" />,
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      id: "scan_receipt",
      label: "Сканировать чек",
      sublabel: "AI OCR распознавание заказ-наряда",
      icon: <ScanLine className="w-5 h-5 text-rose-600" />,
      bg: "bg-rose-50",
      border: "border-rose-100",
    },
  ];

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-label="Быстрое действие"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in select-none"
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
      <div className="w-full max-w-md mx-auto bg-white border-t border-neutral-200 rounded-t-3xl shadow-2xl p-4 pb-8 max-h-[85vh] overflow-y-auto animate-slide-up text-neutral-900">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-1 mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">
              Быстрое действие
            </h3>
            <p className="text-xs text-neutral-500">
              Автомобиль: <span className="text-neutral-800 font-semibold">{carName}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Закрыть меню быстрых действий"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition cursor-pointer"
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
              className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100/90 border border-neutral-200/80 transition active:scale-[0.98] text-left cursor-pointer group"
            >
              <div
                className={`w-10 h-10 rounded-xl ${act.bg} ${act.border} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                {act.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-900 tracking-tight leading-tight">
                  {act.label}
                </div>
                <div className="text-[10px] text-neutral-500 line-clamp-2 mt-0.5 leading-snug">
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
