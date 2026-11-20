import { useModalFocus } from "./useModalFocus";
import React, { useState } from "react";
import {
  X,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Fuel,
  Wrench,
  Loader2,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Vehicle, ServiceRecord, FuelRecord } from "../types";
import { SAMPLE_RECEIPT_IMAGE } from "../mockData";
import { fetchVehicleRecommendations, requestReceiptOcr } from "../api";
import { MAX_RECEIPT_IMAGE_BYTES, normalizeReceiptAmount, normalizeReceiptDate, normalizeReceiptMerchant, RECEIPT_INCOME_MESSAGE, RECEIPT_REFUND_MESSAGE } from "../receiptFields";

interface ReceiptScannerModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onApplyService: (data: Partial<ServiceRecord>) => void;
  onApplyFuel: (data: Omit<FuelRecord, "id" | "vehicleId">) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  vehicle,
  onClose,
  onApplyService,
  onApplyFuel,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [sampleFallbackResult, setSampleFallbackResult] = useState<any>(null);

  // Ready-made sample checks for instant testing
  const samplePresets = [
    {
      title: "Заказ-наряд СТО Fit Service",
      sub: "ТО: Масло Motul, колодки Brembo, фильтр",
      dataUrl: SAMPLE_RECEIPT_IMAGE,
      fallbackResult: {
        merchantName: "Fit Service • Автоцентр",
        date: "2026-05-14",
        totalAmount: 14900,
        category: "repair",
        description: "Замена масла ДВС + фильтр и замена передних колодок",
        works: [
          { description: "Замена масла ДВС + фильтр", cost: 1800 },
          { description: "Замена передних колодок", cost: 2200 },
        ],
        parts: [
          { name: "Моторное масло Motul 8100 X-cess 5W-40 (4.5л)", brand: "Motul", partNumber: "102784", quantity: 1, price: 6200 },
          { name: "Фильтр масляный", brand: "Mann-Filter", partNumber: "W 67/1", quantity: 1, price: 750 },
          { name: "Колодки передние тормозные", brand: "Brembo", partNumber: "P 56 062", quantity: 1, price: 3950 },
        ],
        notes: "Гарантия на работы и запчасти: 12 мес. / 20 000 км",
      },
    },
    {
      title: "Чек АЗС Лукойл",
      sub: "Топливо: 55.4 л АИ-95 ЭКТО на 3 313 ₽",
      dataUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="380" height="420" viewBox="0 0 380 420">
          <rect width="380" height="420" fill="#FFFFFF" rx="6" stroke="#e2e8f0"/>
          <text x="190" y="45" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="16" fill="#EF3038">АЗС ЛУКОЙЛ № 512</text>
          <text x="190" y="70" text-anchor="middle" font-family="monospace" font-size="11" fill="#64748b">ООО "ЛУКОЙЛ-Центрнефтепродукт"</text>
          <line x1="30" y1="90" x2="350" y2="90" stroke="#E2E8F0" stroke-dasharray="3"/>
          <text x="30" y="120" font-family="monospace" font-size="12" fill="#0F172A">Дата: 05.06.2026  14:32</text>
          <text x="30" y="145" font-family="monospace" font-size="12" fill="#0F172A">Колонка № 4</text>
          <line x1="30" y1="165" x2="350" y2="165" stroke="#E2E8F0"/>
          <text x="30" y="195" font-family="monospace" font-weight="bold" font-size="13" fill="#0f172a">Топливо: АИ-95-К5 ЭКТО</text>
          <text x="30" y="225" font-family="monospace" font-size="12" fill="#0F172A">Объем: 55.40 л</text>
          <text x="30" y="250" font-family="monospace" font-size="12" fill="#0F172A">Цена за литр: 59.80 ₽</text>
          <line x1="30" y1="280" x2="350" y2="280" stroke="#0f172a" stroke-width="1.5"/>
          <text x="30" y="315" font-family="monospace" font-weight="bold" font-size="16" fill="#0f172a">ИТОГ: 3 312.92 ₽</text>
          <text x="190" y="360" text-anchor="middle" font-family="monospace" font-size="11" fill="#047857">✓ ОПЛАЧЕНО БЕЗНАЛИЧНО</text>
          <text x="190" y="385" text-anchor="middle" font-family="monospace" font-size="10" fill="#94a3b8">ФП: 9812401824 • СПАСИБО ЗА ПОКУПКУ!</text>
        </svg>
      `),
      fallbackResult: {
        merchantName: "АЗС Лукойл № 512",
        date: "2026-06-05",
        totalAmount: 3313,
        category: "fuel",
        description: "Заправка топливом АИ-95-К5 ЭКТО",
        fuelDetails: { fuelType: "АИ-95", liters: 55.4, pricePerLiter: 59.8 },
        works: [],
        parts: [],
        notes: "Оплачено безналично",
      },
    },
  ];

  const handleScan = async (imageToScan: string | null = imagePreview, fallbackResult: any = sampleFallbackResult) => {
    if (!imageToScan) return;

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      let detectedMime = "image/jpeg";
      if (imageToScan.startsWith("data:")) {
        const match = imageToScan.match(/^data:([^;]+);/);
        if (match) detectedMime = match[1];
      }

      // Fetch the reviewed instruction guidance in parallel with OCR.
      const recommendationsPromise = fetchVehicleRecommendations(vehicle).catch(() => null);
      const data = await requestReceiptOcr(imageToScan, detectedMime);
      if (data.operation === "refund" || data.operation === "income") {
        setScanResult(null);
        setScanError(data.operation === "refund" ? RECEIPT_REFUND_MESSAGE : RECEIPT_INCOME_MESSAGE);
        return;
      }
      setScanResult({
        ...data,
        merchantName: normalizeReceiptMerchant(data.merchantName) ?? "",
        date: normalizeReceiptDate(data.date) ?? "",
        totalAmount: normalizeReceiptAmount(data.totalAmount) ?? "",
        recommendations: [],
      });
      void recommendationsPromise.then((recommendations) => {
        if (!recommendations) return;
        setScanResult((current: any) => current ? { ...current, recommendations: recommendations.recommendations.slice(0, 3) } : current);
      });
    } catch (error) {
      // Demo presets may use a local fallback when the AI service is unavailable.
      // Never infer a receipt type by searching inside an encoded image data URL.
      if (fallbackResult) {
        setScanResult({ ...fallbackResult, recommendations: [] });
        void fetchVehicleRecommendations(vehicle).then((recommendations) => {
          setScanResult((current: any) => current ? { ...current, recommendations: recommendations.recommendations.slice(0, 3) } : current);
        }).catch(() => undefined);
      } else {
        setScanError(error instanceof Error ? error.message : "Не удалось разобрать изображение. Проверьте качество фото.");
      }
    } finally {
      setIsScanning(false);
    }
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    // Allow choosing the same file again after an error.
    input.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setScanError("Выберите файл изображения (JPG, PNG или WebP).");
      return;
    }
    if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
      setScanError("Фото слишком большое. Максимальный размер — 6,7 МБ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === "string" ? reader.result : null;
      if (!image) {
        setScanError("Не удалось прочитать изображение. Попробуйте выбрать фото ещё раз.");
        return;
      }
      setImagePreview(image);
      setSampleFallbackResult(null);
      setScanResult(null);
      setScanError(null);
      void handleScan(image, null);
    };
    reader.onerror = () => {
      setScanError("Не удалось прочитать файл. Попробуйте другое фото.");
    };
    reader.onabort = () => {
      setScanError("Чтение фотографии было прервано. Попробуйте ещё раз.");
    };
    reader.readAsDataURL(file);
  };

  const handleApplyToService = () => {
    if (!scanResult) return;

    const parts = (Array.isArray(scanResult.parts) ? scanResult.parts : []).map((p: any, idx: number) => ({
      id: "scan-p-" + idx + "-" + Date.now(),
      name: typeof p?.name === "string" && p.name.trim() ? p.name.trim() : "Деталь",
      brand: typeof p?.brand === "string" ? p.brand.trim() : "",
      partNumber: typeof p?.partNumber === "string" ? p.partNumber.trim() : "",
      quantity: Number.isFinite(Number(p?.quantity)) && Number(p.quantity) > 0 ? Number(p.quantity) : 1,
      unitPrice: Number.isFinite(Number(p?.price)) && Number(p.price) >= 0 ? Number(p.price) : 0,
    }));

    const laborCost = (Array.isArray(scanResult.works) ? scanResult.works : []).reduce(
      (sum: number, w: any) => sum + (Number.isFinite(Number(w?.cost)) && Number(w.cost) >= 0 ? Number(w.cost) : 0),
      0
    );
    const totalCost = normalizeReceiptAmount(scanResult.totalAmount);
    const date = normalizeReceiptDate(scanResult.date);
    if (!date || !totalCost) {
      setScanError("Укажите дату операции и сумму больше нуля.");
      return;
    }

    const recordData: Partial<ServiceRecord> = {
      date,
      mileage: vehicle.currentMileage,
      category: scanResult.category === "tires" ? "Шины и диски" : "Другое",
      title: scanResult.description || "Расход по документу",
      description:
        (Array.isArray(scanResult.works) ? scanResult.works.map((w: any) => typeof w?.description === "string" ? w.description.trim() : "").filter(Boolean).join(", ") : ""),
      laborCost: laborCost,
      parts: parts,
      totalCost,
      serviceCenter: scanResult.merchantName.trim(),
      receiptImages: imagePreview ? [imagePreview] : [],
      notes: scanResult.notes || "Распознано через AI-сканер чеков Garage AI.",
    };

    onApplyService(recordData);
    onClose();
  };

  const handleApplyToFuel = () => {
    if (!scanResult) return;

    const liters = normalizeReceiptAmount(scanResult.fuelDetails?.liters);
    const pricePerLiter = normalizeReceiptAmount(scanResult.fuelDetails?.pricePerLiter);
    const totalCost = normalizeReceiptAmount(scanResult.totalAmount);
    const date = normalizeReceiptDate(scanResult.date);
    const fuelType = typeof scanResult.fuelDetails?.fuelType === "string" ? scanResult.fuelDetails.fuelType.trim() : "";
    if (!date || !liters || !pricePerLiter || !totalCost || !fuelType) {
      setScanError("Укажите дату, сумму, тип топлива, объём и цену за литр.");
      return;
    }
    const fuelData: Omit<FuelRecord, "id" | "vehicleId"> = {
      date,
      mileage: vehicle.currentMileage,
      liters,
      pricePerLiter,
      totalCost,
      fuelType,
      isFullTank: false,
      station: scanResult.merchantName.trim(),
    };

    onApplyFuel(fuelData);
    onClose();
  };

  const dialogRef = useModalFocus(onClose);

  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-label="Сканер чеков" tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-neutral-100 shrink-0 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-strong/10 text-brand-strong flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-brand-strong uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gemini 3.8 Flash OCR
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
                Умный сканер чеков и заказ-нарядов
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          {/* Quick preset selector */}
          <div>
            <div className="text-xs font-semibold text-neutral-700 mb-1.5">
              Использовать образец чека для демонстрации:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePresets.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isScanning}
                  onClick={() => {
                    setImagePreview(preset.dataUrl);
                    setSampleFallbackResult(preset.fallbackResult);
                    setScanResult(null);
                    setScanError(null);
                  }}
                  className={`p-2.5 rounded-2xl border text-left text-xs transition cursor-pointer ${
                    imagePreview === preset.dataUrl
                      ? "border-brand bg-brand-soft/50 text-neutral-900"
                      : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-600"
                  }`}
                >
                  <div className="font-bold text-neutral-900">{preset.title}</div>
                  <div className="text-[11px] text-neutral-500 truncate">{preset.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload or Drop */}
          <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-4 text-center hover:border-brand-light transition bg-neutral-50/50">
            {imagePreview ? (
              <div className="space-y-3">
                <div className="max-h-56 overflow-hidden rounded-xl border border-neutral-200 bg-white flex items-center justify-center p-2">
                  <img
                    width={640}
                    height={480}
                    src={imagePreview}
                    alt="Предпросмотр чека"
                    className="max-h-52 w-auto object-contain"
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <label className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 rounded-xl cursor-pointer transition">
                    Загрузить другое фото
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={isScanning}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleScan()}
                    disabled={isScanning}
                    className="px-5 py-1.5 bg-brand-strong hover:bg-brand text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Распознаём чек...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Распознать через AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6">
                <Camera className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-neutral-700">
                  Перетащите изображение чека или выберите файл
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Поддерживаются фото чеков СТО, квитанции, накладные, чеки АЗС
                </p>
                <label className="mt-3 inline-block px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-neutral-800 transition">
                  Сканировать чек / открыть камеру
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={isScanning}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Scan Error */}
          {scanError && (
            <div role="alert" className="p-3 bg-brand-soft border border-brand-border rounded-2xl flex items-center gap-2 text-xs text-brand-hover">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Parsed Result Box */}
          {scanResult && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{scanResult._source === "local-tesseract" ? "Распознано локально, проверьте поля" : "Чек успешно распознан"}</span>
                </div>
                {Number.isFinite(Number(scanResult.totalAmount)) && Number(scanResult.totalAmount) > 0 && (
                  <span className="text-sm font-extrabold font-mono text-emerald-900">
                    {Number(scanResult.totalAmount).toLocaleString("ru-RU")} {scanResult.currency || "₽"}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {([["Организация", "merchantName", "text"], ["Дата операции", "date", "date"], ["Сумма, ₽", "totalAmount", "number"]] as const).map(([label, key, type]) => (
                  <label key={key} className="block text-neutral-600">{label}
                    <input type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} value={scanResult[key]} onChange={e => setScanResult({ ...scanResult, [key]: e.target.value })} className="w-full mt-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-neutral-900" />
                  </label>
                ))}
                <label className="block text-neutral-600">Запись
                  <select value={scanResult.category === "fuel" ? "fuel" : "other"} onChange={e => setScanResult({ ...scanResult, category: e.target.value })} className="w-full mt-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-neutral-900">
                    <option value="other">Журнал обслуживания</option>
                    <option value="fuel">Расходы на топливо</option>
                  </select>
                </label>
                <div className="col-span-2">
                  <span className="text-neutral-500">Назначение:</span>{" "}
                  <strong className="text-neutral-900">
                    {scanResult.description}
                  </strong>
                </div>
              </div>

              {/* Parsed parts table */}
              {scanResult.parts && scanResult.parts.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Извлеченные запчасти ({scanResult.parts.length}):
                  </div>
                  <div className="space-y-1 bg-white p-2.5 rounded-xl border border-emerald-100 text-xs">
                    {scanResult.parts.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="font-medium text-neutral-800">
                          {p.name} {p.brand && `(${p.brand})`}
                          {p.partNumber && (
                            <span className="font-mono text-brand-strong font-bold ml-1">
                              [{p.partNumber}]
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-bold text-neutral-900">
                          {p.price} ₽
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Fuel details */}
              {scanResult.category === "fuel" && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {([["Тип топлива", "fuelType", "text"], ["Объём, л", "liters", "number"], ["Цена за литр, ₽", "pricePerLiter", "number"]] as const).map(([label, key, type]) => (
                    <label key={key} className="block text-neutral-600">{label}
                      <input type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} value={scanResult.fuelDetails?.[key] ?? ""} onChange={e => setScanResult({ ...scanResult, fuelDetails: { ...scanResult.fuelDetails, [key]: e.target.value } })} className="w-full mt-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-neutral-900" />
                    </label>
                  ))}
                </div>
              )}

              {Array.isArray(scanResult.recommendations) && scanResult.recommendations.length > 0 && (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-brand-strong">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Рекомендации по инструкции
                  </div>
                  <div className="space-y-2">
                    {scanResult.recommendations.map((item: any) => (
                      <div key={item.id} className="text-xs leading-relaxed text-neutral-700">
                        <strong>{item.title}:</strong> {item.text}
                        <span className="ml-1 text-[10px] text-neutral-500">({item.confidence === "high" ? "подтверждено руководством" : "сверьте с руководством"})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action: Import buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                {scanResult.category === "fuel" ? (
                  <button
                    type="button"
                    onClick={handleApplyToFuel}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Fuel className="w-4 h-4" />
                    <span>Записать в журнал заправок</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyToService}
                    className="w-full py-2.5 bg-brand-strong hover:bg-brand text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Перенести в журнал обслуживания</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Fixed Footer */}
      <div className="flex justify-end p-3.5 sm:px-6 border-t border-neutral-100 shrink-0 bg-neutral-50/80">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-200/80 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
);
};
