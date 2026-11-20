import React, { useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Loader2, ScanLine, Sparkles, Upload } from "lucide-react";
import { Vehicle, ServiceRecord, FuelRecord } from "../../types";
import { requestReceiptOcr } from "../../api";
import { MAX_RECEIPT_IMAGE_BYTES, normalizeReceiptAmount, normalizeReceiptDate, normalizeReceiptMerchant, RECEIPT_INCOME_MESSAGE, RECEIPT_REFUND_MESSAGE } from "../../receiptFields";

interface ScanReceiptScreenProps { vehicle: Vehicle; onBack: () => void; onConfirmRecord: (record: Omit<ServiceRecord, "id">) => void; onConfirmFuel?: (record: Omit<FuelRecord, "id">) => void; }
type ScanStep = "scanning" | "processing" | "confirm";

function normalizeResult(raw: any, image: string) {
  const parts = Array.isArray(raw?.parts) ? raw.parts.map((p: any, i: number) => ({
    id: `ocr-${Date.now()}-${i}`,
    name: typeof p?.name === "string" && p.name.trim() ? p.name.trim() : (typeof p?.description === "string" && p.description.trim() ? p.description.trim() : "Запчасть"),
    brand: typeof p?.brand === "string" ? p.brand.trim() : "",
    partNumber: typeof p?.partNumber === "string" ? p.partNumber.trim() : (typeof p?.sku === "string" ? p.sku.trim() : ""),
    quantity: Number.isFinite(Number(p?.quantity)) && Number(p.quantity) > 0 ? Number(p.quantity) : 1,
    unitPrice: Number.isFinite(Number(p?.price ?? p?.unitPrice)) && Number(p.price ?? p.unitPrice) >= 0 ? Number(p.price ?? p.unitPrice) : 0,
  })) : [];
  const works = Array.isArray(raw?.works) ? raw.works : [];
  const laborCost = Number.isFinite(Number(raw?.laborCost)) && Number(raw.laborCost) >= 0
    ? Number(raw.laborCost)
    : works.reduce((sum: number, w: any) => sum + (Number.isFinite(Number(w?.cost)) && Number(w.cost) >= 0 ? Number(w.cost) : 0), 0);
  return {
    title: typeof raw?.description === "string" && raw.description.trim() ? raw.description.trim() : "Расход по документу",
    serviceCenter: normalizeReceiptMerchant(raw?.merchantName) ?? normalizeReceiptMerchant(raw?.serviceCenter) ?? "",
    date: normalizeReceiptDate(raw?.date) ?? "",
    totalCost: normalizeReceiptAmount(raw?.totalAmount ?? raw?.totalCost) ?? "",
    liters: normalizeReceiptAmount(raw?.fuelDetails?.liters) ?? "",
    pricePerLiter: normalizeReceiptAmount(raw?.fuelDetails?.pricePerLiter) ?? "",
    fuelType: typeof raw?.fuelDetails?.fuelType === "string" ? raw.fuelDetails.fuelType : "",
    laborCost, parts, image, category: raw?.category,
  };
}

export const ScanReceiptScreen: React.FC<ScanReceiptScreenProps> = ({ vehicle, onBack, onConfirmRecord, onConfirmFuel }) => {
  const [step, setStep] = useState<ScanStep>("scanning"); const [image, setImage] = useState<string | null>(null); const [result, setResult] = useState<ReturnType<typeof normalizeResult> | null>(null); const [error, setError] = useState<string | null>(null);
  const photoFileRef = useRef<HTMLInputElement>(null); const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Выберите файл изображения (JPG, PNG или WebP).");
      return;
    }
    if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
      setError("Фото слишком большое. Максимальный размер — 6,7 МБ.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) {
        setError("Не удалось прочитать изображение. Попробуйте выбрать фото ещё раз.");
        return;
      }
      setImage(value);
    };
    reader.onerror = () => setError("Не удалось прочитать файл. Попробуйте другое фото.");
    reader.onabort = () => setError("Чтение фотографии было прервано. Попробуйте ещё раз.");
    reader.readAsDataURL(file);
  };
  const scan = async () => {
    if (!image) return;
    setStep("processing");
    setError(null);
    try {
      const mime = image.match(/^data:([^;]+);/)?.[1] || "image/jpeg";
      const raw = await requestReceiptOcr(image, mime);
      if (raw.operation === "refund") throw new Error(RECEIPT_REFUND_MESSAGE);
      if (raw.operation === "income") throw new Error(RECEIPT_INCOME_MESSAGE);
      setResult(normalizeResult(raw, image));
      setStep("confirm");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось распознать документ. Проверьте фото.");
      setStep("scanning");
    }
  };
  const save = () => {
    if (!result) return;
    const date = normalizeReceiptDate(result.date);
    const totalCost = normalizeReceiptAmount(result.totalCost);
    if (!date || totalCost === null || totalCost <= 0 || !result.title.trim()) {
      setError("Укажите название, дату операции и сумму больше нуля.");
      return;
    }
    if (result.category === "fuel" && onConfirmFuel) {
      const liters = normalizeReceiptAmount(result.liters);
      const pricePerLiter = normalizeReceiptAmount(result.pricePerLiter);
      if (!liters || !pricePerLiter || !result.fuelType.trim()) {
        setError("Укажите тип топлива, объём и цену за литр.");
        return;
      }
      onConfirmFuel({ vehicleId: vehicle.id, date, mileage: vehicle.currentMileage, liters, pricePerLiter, totalCost, fuelType: result.fuelType.trim(), isFullTank: false, station: result.serviceCenter.trim() });
    } else {
      onConfirmRecord({ vehicleId: vehicle.id, title: result.title.trim(), category: result.category === "tires" ? "Шины и диски" : "Другое", date, mileage: vehicle.currentMileage, totalCost, laborCost: result.laborCost, serviceCenter: result.serviceCenter.trim(), description: result.title.trim(), parts: result.parts, receiptImages: [result.image] });
    }
    onBack();
  };
  return <div className="flex flex-col h-full w-full bg-[#F4F5F8] text-neutral-900"><header className="px-4 py-3 flex items-center justify-between border-b border-neutral-200 bg-white"><button onClick={onBack} className="flex items-center gap-1 text-xs text-neutral-600"><ArrowLeft className="w-4 h-4"/>Назад</button><div className="flex items-center gap-1 text-xs font-bold text-brand-strong"><ScanLine className="w-4 h-4"/>Сканер документов</div><span className="w-12" aria-hidden="true"/></header>
    {step === "scanning" && <main className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto"><div className="text-center"><h2 className="text-lg font-black">Сфотографируйте чек или документ</h2><p className="text-xs text-neutral-500 mt-1">Разместите весь документ в рамке и обеспечьте хорошее освещение.</p></div><div className="relative w-full max-w-md mx-auto aspect-[4/3] rounded-2xl overflow-hidden border-2 border-brand/70 bg-neutral-200">{image ? <img src={image} alt="Предпросмотр документа" className="w-full h-full object-contain"/> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-500"><Camera className="w-10 h-10"/><span className="text-xs">Фото ещё не выбрано</span></div>}<div className="absolute inset-5 border-2 border-dashed border-white/80 rounded-xl pointer-events-none"/></div>{error && <p className="text-xs text-brand-strong text-center">{error}</p>}<div className="flex flex-wrap justify-center gap-2"><button onClick={() => photoFileRef.current?.click()} className="px-4 py-2 rounded-xl bg-brand-strong text-white text-xs font-bold flex items-center gap-2"><Camera className="w-4 h-4"/>Сделать фото</button><button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-xl bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-2 border border-neutral-300"><Upload className="w-4 h-4"/>Выбрать файл</button><input ref={photoFileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden"/><input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden"/></div><button disabled={!image} onClick={scan} className="w-full max-w-md mx-auto py-3 rounded-xl bg-neutral-900 text-white text-xs font-black disabled:opacity-40 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4"/>Распознать документ</button></main>}
    {step === "processing" && <main className="flex-1 flex flex-col items-center justify-center gap-3 text-center"><Loader2 className="w-10 h-10 text-brand-strong animate-spin"/><h2 className="font-bold">Распознаём документ...</h2><p className="text-xs text-neutral-500">Извлекаем организацию, дату, сумму и запчасти.</p></main>}
    {step === "confirm" && result && <main className="flex-1 overflow-y-auto p-4 space-y-3">
      <img src={result.image} alt="Скан документа" className="w-full max-h-48 object-contain rounded-xl bg-neutral-200"/>
      <div className="rounded-2xl bg-white border border-neutral-200 p-4 space-y-3">
        <p className="text-xs font-bold text-neutral-700">Проверьте данные перед сохранением</p>
        <label className="block text-xs text-neutral-600">Запись
          <select value={result.category === "fuel" ? "fuel" : "other"} onChange={e => setResult({ ...result, category: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200">
            <option value="other">Журнал обслуживания</option>
            {onConfirmFuel && <option value="fuel">Расходы на топливо</option>}
          </select>
        </label>
        {([
          ["Название", "title", "text"], ["Организация", "serviceCenter", "text"], ["Дата операции", "date", "date"], ["Сумма, ₽", "totalCost", "number"],
          ...(result.category === "fuel" ? [["Тип топлива", "fuelType", "text"], ["Объём, л", "liters", "number"], ["Цена за литр, ₽", "pricePerLiter", "number"]] as const : []),
        ] as const).map(([label, key, type]) => (
          <label key={key} className="block text-xs text-neutral-600">{label}
            <input type={type} step={type === "number" ? "any" : undefined} min={type === "number" ? 0 : undefined} value={result[key]} onChange={e => setResult({ ...result, [key]: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs"/>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-brand-strong">{error}</p>}
      <button onClick={save} className="w-full py-3 rounded-xl bg-brand-strong text-white text-xs font-bold flex items-center justify-center gap-2"><Check className="w-4 h-4"/>Сохранить запись</button>
      <button onClick={() => { setStep("scanning"); setError(null); }} className="w-full py-2 text-xs font-semibold">Выбрать другое фото</button>
    </main>}</div>;
};


