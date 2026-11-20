import React, { useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Loader2, ScanLine, Sparkles, Upload } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Vehicle, ServiceRecord, FuelRecord, MaintenanceCategory } from "../../types";
import { requestReceiptOcr } from "../../api";
import { SERVICE_WORK_CATALOG } from "../serviceWorkCatalog";
import { MAX_RECEIPT_DOCUMENT_BYTES, MAX_RECEIPT_DOCUMENT_PAGES, MAX_RECEIPT_IMAGE_BYTES, normalizeReceiptAmount, normalizeReceiptDate, normalizeReceiptMerchant, RECEIPT_INCOME_MESSAGE, RECEIPT_REFUND_MESSAGE } from "../../receiptFields";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ScanReceiptScreenProps { vehicle: Vehicle; onBack: () => void; onConfirmRecord: (record: Omit<ServiceRecord, "id">) => void; onConfirmFuel?: (record: Omit<FuelRecord, "id">) => void; }
type ScanStep = "scanning" | "processing" | "confirm";
type ReceiptImage = { dataUrl: string; mimeType: string; name: string };
export type ParsedReceiptPdf = { text: string; imagePages: ReceiptImage[]; previewImage: string; pageCount: number; name: string };

export async function convertReceiptPdf(file: File): Promise<ParsedReceiptPdf> {
  if (file.size > MAX_RECEIPT_DOCUMENT_BYTES) {
    throw new Error("PDF слишком большой. Максимальный размер — 6,7 МБ.");
  }
  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  } catch {
    throw new Error("Не удалось открыть PDF. Выберите обычный, незащищённый PDF-файл.");
  }
  if (pdf.numPages > MAX_RECEIPT_DOCUMENT_PAGES) {
    await pdf.destroy();
    throw new Error(`В PDF слишком много страниц. Максимум — ${MAX_RECEIPT_DOCUMENT_PAGES}.`);
  }
  const imagePages: ReceiptImage[] = [];
  const pageText: string[] = [];
  let previewImage = "";
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines = new Map<number, Array<{ x: number; text: string }>>();
      for (const item of textContent.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        const row = lines.get(y) ?? [];
        row.push({ x: item.transform[4], text: item.str });
        lines.set(y, row);
      }
      const text = [...lines.entries()]
        .sort(([left], [right]) => right - left)
        .map(([, row]) => row.sort((left, right) => left.x - right.x).map((part) => part.text).join(" "))
        .join("\n")
        .trim();
      pageText.push(text);
      if (pageNumber === 1 || !text) {
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 2400 / Math.max(base.width, base.height)) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Не удалось подготовить страницу PDF. Загрузите фото документа.");
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
        if (pageNumber === 1) previewImage = dataUrl;
        if (!text) imagePages.push({ dataUrl, mimeType: "image/jpeg", name: file.name });
      }
      if (!text) {
        pageText[pageNumber - 1] = "";
      }
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
  return { text: pageText.join("\n\n").slice(0, 12000), imagePages, previewImage, pageCount: pageText.length, name: file.name };
}

export function inferMaintenanceCategory(raw: any): MaintenanceCategory {
  if (raw?.category === "tires") return "Шины и диски";
  if (raw?.category === "fuel") return "Другое";
  const workDescriptions = Array.isArray(raw?.works)
    ? raw.works.map((work: any) => work?.description)
    : [];
  const partDescriptions = Array.isArray(raw?.parts)
    ? raw.parts.map((part: any) => part?.name ?? part?.description)
    : [];
  for (const description of [...workDescriptions, ...partDescriptions, raw?.description]) {
    if (typeof description !== "string" || !description.trim()) continue;
    if (/(тормоз|колодк|диск)/i.test(description)) return "Тормозная система";
    if (/(масл|фильтр|техническ|регламент)/i.test(description)) return "ТО и замена жидкостей";
    if (/(двигател|мотор|свеч|грм)/i.test(description)) return "Двигатель";
    if (/(подвес|амортиз|шаровой|ступичн|развал)/i.test(description)) return "Подвеска и рулевое";
    if (/(сцеплен|коробк|трансмисс)/i.test(description)) return "Трансмиссия";
    const words = new Set(description.toLocaleLowerCase("ru").match(/[а-яё]{4,}/g) ?? []);
    const matchingWork = SERVICE_WORK_CATALOG
      .filter((work) => work.category !== "Другое")
      .sort((left, right) =>
        Math.max(...right.aliases.map((alias) => alias.length), right.title.length) -
        Math.max(...left.aliases.map((alias) => alias.length), left.title.length)
      )
      .find((work) =>
      [...work.aliases, work.title].some((phrase) =>
        phrase.toLocaleLowerCase("ru").match(/[а-яё]{4,}/g)?.some((word) => words.has(word))
      )
      );
    if (matchingWork) return matchingWork.category;
  }
  return "Другое";
}

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
    laborCost, parts, image, category: raw?.category, maintenanceCategory: inferMaintenanceCategory(raw),
  };
}

export const ScanReceiptScreen: React.FC<ScanReceiptScreenProps> = ({ vehicle, onBack, onConfirmRecord, onConfirmFuel }) => {
  const [step, setStep] = useState<ScanStep>("scanning"); const [images, setImages] = useState<ReceiptImage[]>([]); const [pdfDocument, setPdfDocument] = useState<ParsedReceiptPdf | null>(null); const [result, setResult] = useState<ReturnType<typeof normalizeResult> | null>(null); const [error, setError] = useState<string | null>(null);
  const photoFileRef = useRef<HTMLInputElement>(null); const fileRef = useRef<HTMLInputElement>(null);
  const pdfFileRef = useRef<HTMLInputElement>(null);
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        setError(null);
        const parsedPdf = await convertReceiptPdf(file);
        if (!parsedPdf.text && !parsedPdf.imagePages.length) {
          setError("В PDF не найден текст или изображение страницы.");
          return;
        }
        setPdfDocument(parsedPdf);
        setImages([]);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Не удалось открыть PDF. Попробуйте выбрать другой файл.");
      }
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Выберите фото или документ PDF.");
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
      setImages([{ dataUrl: value, mimeType: file.type, name: file.name }]);
      setPdfDocument(null);
    };
    reader.onerror = () => setError("Не удалось прочитать файл. Попробуйте другое фото.");
    reader.onabort = () => setError("Чтение фотографии было прервано. Попробуйте ещё раз.");
    reader.readAsDataURL(file);
  };
  const scan = async () => {
    if (!images.length && !pdfDocument?.text && !pdfDocument?.imagePages.length) return;
    setStep("processing");
    setError(null);
    try {
      const pdfImages = pdfDocument?.imagePages ?? [];
      const imageResults = [];
      for (const image of [...images, ...pdfImages]) {
        const mime = image.mimeType || image.dataUrl.match(/^data:([^;]+);/)?.[1] || "image/jpeg";
        imageResults.push({ image, raw: await requestReceiptOcr(image.dataUrl, mime) });
      }
      const textResult = pdfDocument?.text
        ? [{ image: { dataUrl: "", mimeType: "text/plain", name: pdfDocument.name }, raw: await requestReceiptOcr("", "text/plain", pdfDocument.text) }]
        : [];
      const pageResults = [...imageResults, ...textResult];
      if (pageResults.some(({ raw }) => raw.operation === "refund")) throw new Error(RECEIPT_REFUND_MESSAGE);
      if (pageResults.some(({ raw }) => raw.operation === "income")) throw new Error(RECEIPT_INCOME_MESSAGE);
      const merged = pageResults.map(({ raw }) => raw).reduce((first, next) => ({
        ...next,
        merchantName: next.merchantName || first.merchantName,
        date: next.date || first.date,
        totalAmount: next.totalAmount ?? first.totalAmount,
        description: next.description || first.description,
        category: next.category === "other" ? first.category : next.category,
        fuelDetails: next.fuelDetails || first.fuelDetails,
        works: [...(first.works || []), ...(next.works || [])],
        parts: [...(first.parts || []), ...(next.parts || [])],
      }), {} as Record<string, any>);
      setResult(normalizeResult(merged, images[0]?.dataUrl || pdfDocument?.previewImage || ""));
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
      const receiptImages = images.length ? images.map((item) => item.dataUrl) : (pdfDocument?.previewImage ? [pdfDocument.previewImage] : []);
      onConfirmRecord({ vehicleId: vehicle.id, title: result.title.trim(), category: result.maintenanceCategory, date, mileage: vehicle.currentMileage, totalCost, laborCost: result.laborCost, serviceCenter: result.serviceCenter.trim(), description: result.title.trim(), parts: result.parts, receiptImages });
    }
    onBack();
  };
  return <div className="flex flex-col h-full w-full bg-[#F4F5F8] text-neutral-900"><header className="px-4 py-3 flex items-center justify-between border-b border-neutral-200 bg-white"><button onClick={onBack} className="flex items-center gap-1 text-xs text-neutral-600"><ArrowLeft className="w-4 h-4"/>Назад</button><div className="flex items-center gap-1 text-xs font-bold text-brand-strong"><ScanLine className="w-4 h-4"/>Сканер документов</div><span className="w-12" aria-hidden="true"/></header>
    {step === "scanning" && <main className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto"><div className="text-center"><h2 className="text-lg font-black">Сфотографируйте чек или документ</h2><p className="text-xs text-neutral-500 mt-1">Разместите весь документ в рамке и обеспечьте хорошее освещение.</p></div><div className="relative w-full max-w-md mx-auto aspect-[4/3] rounded-2xl overflow-hidden border-2 border-brand/70 bg-neutral-200">{images.length || pdfDocument?.previewImage ? <img src={images[0]?.dataUrl || pdfDocument?.previewImage} alt={images.length > 1 ? `Страница 1 из ${images.length}` : "Предпросмотр документа"} className="w-full h-full object-contain"/> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-500"><Camera className="w-10 h-10"/><span className="text-xs">Фото или PDF ещё не выбраны</span></div>}{pdfDocument && <p className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-center text-xs text-neutral-700">PDF, страниц: {pdfDocument.pageCount}</p>}<div className="absolute inset-5 border-2 border-dashed border-white/80 rounded-xl pointer-events-none"/></div>{error && <p role="alert" className="text-xs text-brand-strong text-center">{error}</p>}<div className="flex flex-wrap justify-center gap-2"><button onClick={() => photoFileRef.current?.click()} className="px-4 py-2 rounded-xl bg-brand-strong text-white text-xs font-bold flex items-center gap-2"><Camera className="w-4 h-4"/>Сделать фото</button><button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-xl bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-2 border border-neutral-300"><Upload className="w-4 h-4"/>Выбрать фото</button><button onClick={() => pdfFileRef.current?.click()} className="px-4 py-2 rounded-xl bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center gap-2 border border-neutral-300"><Upload className="w-4 h-4"/>Выбрать PDF</button><input ref={photoFileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden"/><input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden"/><input ref={pdfFileRef} type="file" accept="application/pdf,.pdf" onChange={handleFile} className="hidden"/></div><button disabled={!images.length && !pdfDocument?.text && !pdfDocument?.imagePages.length} onClick={scan} className="w-full max-w-md mx-auto py-3 rounded-xl bg-neutral-900 text-white text-xs font-black disabled:opacity-40 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4"/>Распознать документ</button></main>}
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
        {result.category !== "fuel" && <label className="block text-xs text-neutral-600">Категория обслуживания
          <select value={result.maintenanceCategory} onChange={e => setResult({ ...result, maintenanceCategory: e.target.value as MaintenanceCategory })} className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200">
            <option value="ТО и замена жидкостей">ТО и замена жидкостей</option>
            <option value="Двигатель">Двигатель</option>
            <option value="Система охлаждения">Система охлаждения</option>
            <option value="Ходовая часть">Ходовая часть</option>
            <option value="Климатическая система">Климатическая система</option>
            <option value="Трансмиссия">Трансмиссия</option>
            <option value="Трансмиссия и сцепление">Трансмиссия и сцепление</option>
            <option value="Подвеска и рулевое">Подвеска и рулевое</option>
            <option value="Тормозная система">Тормозная система</option>
            <option value="Электрика и датчики">Электрика и датчики</option>
            <option value="Выхлопная система">Выхлопная система</option>
            <option value="Кузов и стекла">Кузов и стекла</option>
            <option value="Шины и диски">Шины и диски</option>
            <option value="Другое">Другое</option>
          </select>
        </label>}
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
      <button onClick={() => { setStep("scanning"); setResult(null); setError(null); }} className="w-full py-2 text-xs font-semibold">Выбрать другое фото или PDF</button>
    </main>}</div>;
};


