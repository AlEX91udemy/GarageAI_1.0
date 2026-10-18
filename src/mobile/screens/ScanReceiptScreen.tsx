import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  ScanLine,
  Sparkles,
  Check,
  Edit2,
  Calendar,
  DollarSign,
  Building2,
  Package,
} from "lucide-react";
import { Vehicle, ServiceRecord } from "../../types";

interface ScanReceiptScreenProps {
  vehicle: Vehicle;
  onBack: () => void;
  onConfirmRecord: (record: Partial<ServiceRecord>) => void;
}

export const ScanReceiptScreen: React.FC<ScanReceiptScreenProps> = ({
  vehicle,
  onBack,
  onConfirmRecord,
}) => {
  const [step, setStep] = useState<"scanning" | "processing" | "confirm">("scanning");

  // Recognized mock data
  const [recognizedData, setRecognizedData] = useState({
    title: "Плановое ТО: Замена моторного масла и фильтров",
    serviceCenter: "Автотехцентр «Юнит Северо-Запад»",
    date: new Date().toISOString().slice(0, 10),
    totalCost: 11400,
    laborCost: 3200,
    parts: [
      { name: "Моторное масло 5W-40 5L", brand: "Motul", sku: "102870", price: 6500 },
      { name: "Масляный фильтр", brand: "Mann-Filter", sku: "HU 816 x", price: 1100 },
      { name: "Воздушный фильтр", brand: "Filtron", sku: "AP 160/1", price: 600 },
    ],
  });

  const handleStartScan = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("confirm");
    }, 1800);
  };

  const handleSaveToGarage = () => {
    onConfirmRecord?.({
      vehicleId: vehicle.id,
      title: recognizedData.title,
      category: "ТО и замена жидкостей",
      date: recognizedData.date,
      mileage: vehicle.currentMileage,
      totalCost: recognizedData.totalCost,
      laborCost: recognizedData.laborCost,
      serviceCenter: recognizedData.serviceCenter,
      description: "Заказ-наряд распознан AI OCR камерой GarageHub.",
      parts: (recognizedData.parts || []).map((p, idx) => ({
        id: `ocr-${Date.now()}-${idx}`,
        name: p.name,
        brand: p.brand,
        partNumber: p.sku,
        quantity: 1,
        unitPrice: p.price,
      })),
    });
    onBack?.();
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-white select-none">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-800/80">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
          <ScanLine className="w-3.5 h-3.5" />
          <span>GarageHub AI OCR</span>
        </div>

        <span className="text-[10px] text-neutral-400 font-mono">
          {step === "confirm" ? "Шаг 2/2" : "Шаг 1/2"}
        </span>
      </div>

      {/* STEP 1: CAMERA SCANNER VIEWPORT */}
      {step === "scanning" && (
        <div className="flex-1 flex flex-col justify-between p-6">
          <div className="text-center">
            <h2 className="text-lg font-black text-white">
              Наведите камеру на заказ-наряд
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Распознавание позиций, цен и запчастей в 1 клик
            </p>
          </div>

          {/* Viewfinder frame */}
          <div className="relative w-full max-w-xs mx-auto aspect-[3/4] rounded-3xl border-2 border-dashed border-rose-500/60 bg-neutral-900/50 overflow-hidden flex items-center justify-center p-4 shadow-2xl shadow-rose-950/20">
            {/* Corner markers */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-rose-500" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-rose-500" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-rose-500" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-rose-500" />

            {/* Simulated Receipt document graphic */}
            <div className="w-44 h-56 bg-neutral-800/90 rounded-xl p-3 flex flex-col justify-between border border-neutral-700/60">
              <div className="space-y-1.5">
                <div className="w-16 h-2 bg-neutral-600 rounded" />
                <div className="w-28 h-1.5 bg-neutral-700 rounded" />
                <div className="w-20 h-1.5 bg-neutral-700 rounded" />
              </div>

              <div className="space-y-1">
                <div className="w-full h-1 bg-neutral-700 rounded" />
                <div className="w-full h-1 bg-neutral-700 rounded" />
                <div className="w-3/4 h-1 bg-neutral-700 rounded" />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-neutral-700">
                <div className="w-10 h-2 bg-neutral-600 rounded" />
                <div className="w-12 h-2 bg-rose-500/80 rounded" />
              </div>
            </div>

            {/* Scanning line animation */}
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse" />
          </div>

          {/* Capture Trigger */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleStartScan}
              className="w-18 h-18 rounded-full bg-rose-600 hover:bg-rose-500 border-4 border-neutral-900 shadow-xl shadow-rose-600/40 flex items-center justify-center text-white transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-7 h-7" />
            </button>
            <span className="text-[11px] text-neutral-400 font-medium">
              Нажмите для мгновенного сканирования
            </span>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING ANIMATION */}
      {step === "processing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 animate-bounce">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-base font-black text-white">
            Garage AI анализирует документ...
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Распознавание позиций, артикулов Mann/Motul и сумм заказ-наряда
          </p>
        </div>
      )}

      {/* STEP 3: CONFIRMATION & EDIT SCREEN (Screen 21) */}
      {step === "confirm" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">
                Документ успешно распознан (Точность 98%)
              </span>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase">
                Наименование работы
              </label>
              <input
                type="text"
                value={recognizedData.title}
                onChange={(e) =>
                  setRecognizedData({ ...recognizedData, title: e.target.value })
                }
                className="w-full mt-0.5 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase">
                Автосервис / Организация
              </label>
              <input
                type="text"
                value={recognizedData.serviceCenter}
                onChange={(e) =>
                  setRecognizedData({
                    ...recognizedData,
                    serviceCenter: e.target.value,
                  })
                }
                className="w-full mt-0.5 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-neutral-400 font-bold uppercase">
                  Дата
                </label>
                <input
                  type="date"
                  value={recognizedData.date}
                  onChange={(e) =>
                    setRecognizedData({ ...recognizedData, date: e.target.value })
                  }
                  className="w-full mt-0.5 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-bold uppercase">
                  Итоговая сумма
                </label>
                <input
                  type="number"
                  value={recognizedData.totalCost}
                  onChange={(e) =>
                    setRecognizedData({
                      ...recognizedData,
                      totalCost: Number(e.target.value),
                    })
                  }
                  className="w-full mt-0.5 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-rose-400 font-bold text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Recognized parts list */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wide">
              Распознанные запчасти ({recognizedData.parts.length})
            </h3>

            <div className="space-y-1.5">
              {recognizedData.parts.map((p, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold text-white">
                      {p.brand} {p.name}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      Арт: {p.sku}
                    </div>
                  </div>
                  <div className="font-mono text-white font-bold">
                    {p.price.toLocaleString("ru-RU")} ₽
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <button
              onClick={handleSaveToGarage}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-[0.98] transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Добавить в журнал обслуживания</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
