import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Wrench,
  Fuel,
  AlertTriangle,
  Layers,
  Calendar,
  Gauge,
  Building2,
  Camera,
  ScanBarcode,
  QrCode,
  Sparkles,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { Vehicle, ServiceRecord, FuelRecord, ToFixTask, GaragePart, MaintenanceCategory } from "../../types";
import { QuickActionType, PrefilledScanData } from "../types";
import { BarcodeScannerScreen } from "./BarcodeScannerScreen";
import { CURRENCY_SYMBOLS, formatGarageCurrency, getGarageCurrency } from "../currency";
import { searchServiceWorks } from "../serviceWorkCatalog";
import { AUTOMOTIVE_BARCODE_CATALOG } from "../barcodeScannerService";

const FUEL_TYPES = ["АИ-92", "АИ-95", "АИ-98", "АИ-100", "ДТ", "Газ", "Другое"];
const PETROL_FUEL_TYPES = ["АИ-92", "АИ-95", "АИ-98", "АИ-100"];
const DIESEL_FUEL_TYPES = ["ДТ"];
const FUEL_STATIONS = [
  "Газпромнефть", "Лукойл", "Роснефть", "Татнефть", "Башнефть",
  "ТРАССА", "Нефтьмагистраль", "ЕКА", "Сургутнефтегаз", "ТНК", "Другое",
];
const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  "ТО и замена жидкостей", "Двигатель", "Система охлаждения", "Ходовая часть",
  "Климатическая система", "Трансмиссия", "Трансмиссия и сцепление",
  "Подвеска и рулевое", "Тормозная система", "Электрика и датчики",
  "Выхлопная система", "Кузов и стекла", "Шины и диски", "Другое",
];

const PART_CATALOG = Object.values(AUTOMOTIVE_BARCODE_CATALOG).filter(
  (part, index, all) => all.findIndex((candidate) => candidate.partNumber === part.partNumber) === index
);

function searchParts(query: string, field: "name" | "brand" | "partNumber") {
  const normalized = query.trim().toLocaleLowerCase("ru");
  if (normalized.length < 2) return [];
  return PART_CATALOG.filter((part) =>
    part[field].toLocaleLowerCase("ru").includes(normalized)
  ).slice(0, 6);
}

function getAvailableFuelTypes(vehicleFuelType?: string) {
  const normalized = (vehicleFuelType || "").toLocaleLowerCase("ru");
  if (normalized.includes("дизел") || /(^|\s)дт($|\s)/.test(normalized)) return DIESEL_FUEL_TYPES;
  if (normalized.includes("бензин") || normalized.includes("гибрид") || /аи[- ]?\d{2,3}/.test(normalized)) {
    return PETROL_FUEL_TYPES;
  }
  return FUEL_TYPES;
}

function getDefaultFuelType(vehicleFuelType: string | undefined, availableFuelTypes: string[]) {
  const normalized = (vehicleFuelType || "").toLocaleLowerCase("ru");
  const octane = normalized.match(/аи[- ]?(92|95|98|100)/)?.[1];
  const requestedType = octane ? "АИ-" + octane : normalized.includes("дизел") ? "ДТ" : "АИ-95";
  return availableFuelTypes.includes(requestedType) ? requestedType : availableFuelTypes[0];
}

interface AddEventScreenProps {
  vehicle: Vehicle;
  allVehicles?: Vehicle[];
  garageParts?: GaragePart[];
  initialType?: QuickActionType;
  initialPrefilledData?: PrefilledScanData;
  onBack: () => void;
  onSaveService: (record: Partial<ServiceRecord>) => void;
  onSaveFuel: (fuel: Partial<FuelRecord>) => void;
  onSaveProblem: (task: Partial<ToFixTask>) => void;
  onSavePart: (part: Partial<GaragePart>) => void;
}

export const AddEventScreen: React.FC<AddEventScreenProps> = ({
  vehicle,
  allVehicles = [],
  garageParts = [],
  initialType = "service",
  initialPrefilledData,
  onBack,
  onSaveService,
  onSaveFuel,
  onSaveProblem,
  onSavePart,
}) => {
  const [eventType, setEventType] = useState<QuickActionType>(
    initialPrefilledData?.targetType || (initialType === "repair" ? "service" : initialType)
  );

  // Common inputs
  const [title, setTitle] = useState(initialPrefilledData?.title || "");
  const [isWorkSuggestionsOpen, setIsWorkSuggestionsOpen] = useState(false);
  const [activeWorkSuggestion, setActiveWorkSuggestion] = useState(0);
  const [category, setCategory] = useState<MaintenanceCategory>(
    initialPrefilledData?.category || "ТО и замена жидкостей"
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState(String(vehicle.currentMileage));
  const [cost, setCost] = useState(
    initialPrefilledData?.totalCost ? String(initialPrefilledData.totalCost) : ""
  );
  const [laborCost, setLaborCost] = useState(
    initialPrefilledData?.laborCost ? String(initialPrefilledData.laborCost) : ""
  );
  const [location, setLocation] = useState(
    initialPrefilledData?.serviceCenter || "Гараж / Автосервис"
  );
  const currencySymbol = CURRENCY_SYMBOLS[getGarageCurrency()];
  const prefilledCenter = initialPrefilledData?.serviceCenter || "";
  const [customLocation, setCustomLocation] = useState(
    ["Гараж / Автосервис", "Гараж", "Автосервис", "Газпромнефть", "Лукойл", "Роснефть", "Татнефть"].includes(prefilledCenter) ? "" : prefilledCenter
  );
  const [notes, setNotes] = useState(initialPrefilledData?.description || "");

  // Part-specific inputs for "Добавить запчасть"
  const [partName, setPartName] = useState(initialPrefilledData?.name || "");
  const [partBrand, setPartBrand] = useState(initialPrefilledData?.brand || "");
  const [partNumber, setPartNumber] = useState(initialPrefilledData?.partNumber || "");
  const [partPrice, setPartPrice] = useState(
    initialPrefilledData?.price ? String(initialPrefilledData.price) : ""
  );
  const [partQuantity, setPartQuantity] = useState(
    initialPrefilledData?.quantity ? String(initialPrefilledData.quantity) : "1"
  );
  const [partSuggestionField, setPartSuggestionField] = useState<"name" | "brand" | "partNumber" | null>(null);
  const [activePartSuggestion, setActivePartSuggestion] = useState(0);

  // Scanned badge info
  const [scannedBadge, setScannedBadge] = useState<string | null>(
    initialPrefilledData?.barcode
      ? `Штрихкод: ${initialPrefilledData.barcode}`
      : initialPrefilledData?.vin
      ? `VIN: ${initialPrefilledData.vin}`
      : null
  );

  // Fuel specific
  const availableFuelTypes = useMemo(
    () => getAvailableFuelTypes(vehicle.fuelType),
    [vehicle.fuelType]
  );
  const [liters, setLiters] = useState("45");
  const [fuelCostMode, setFuelCostMode] = useState<"total" | "per_liter">("total");
  const [pricePerLiterInput, setPricePerLiterInput] = useState("");
  const [fuelType, setFuelType] = useState(() => getDefaultFuelType(vehicle.fuelType, availableFuelTypes));
  const [customFuelType, setCustomFuelType] = useState("");

  useEffect(() => {
    setFuelType(getDefaultFuelType(vehicle.fuelType, availableFuelTypes));
    setCustomFuelType("");
  }, [vehicle.id, vehicle.fuelType, availableFuelTypes]);

  // Problem specific
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const fuelSuggestions = availableFuelTypes.map((type) => ({
    title: `Заправка ${type}`,
    category: "Другое" as MaintenanceCategory,
    aliases: ["заправка", type.toLocaleLowerCase("ru")],
  }));
  const workSuggestions = eventType === "fuel"
    ? (title.trim()
      ? fuelSuggestions.filter((work) =>
          `${work.title} ${work.aliases.join(" ")}`.toLocaleLowerCase("ru").includes(title.trim().toLocaleLowerCase("ru"))
        )
      : fuelSuggestions)
    : eventType === "service"
    ? searchServiceWorks(title)
    : [];
  const partSuggestions = partSuggestionField === "name"
    ? searchParts(partName, "name")
    : partSuggestionField === "brand"
    ? searchParts(partBrand, "brand")
    : partSuggestionField === "partNumber"
    ? searchParts(partNumber, "partNumber")
    : [];

  const selectPartSuggestion = (part: (typeof PART_CATALOG)[number]) => {
    setPartName(part.name);
    setPartBrand(part.brand);
    setPartNumber(part.partNumber);
    setCategory(part.category);
    setPartPrice(String(part.estimatedPrice));
    setNotes(part.description);
    setPartSuggestionField(null);
    setActivePartSuggestion(0);
  };

  const selectWorkSuggestion = (work: (typeof workSuggestions)[number]) => {
    setTitle(work.title);
    setCategory(work.category);
    setIsWorkSuggestionsOpen(false);
    setActiveWorkSuggestion(0);
  };

  // Camera scanner modal state
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerTargetMode, setScannerTargetMode] = useState<"part" | "service">("part");

  // Update when initialPrefilledData changes
  useEffect(() => {
    if (initialPrefilledData) {
      if (initialPrefilledData.targetType) {
        setEventType(initialPrefilledData.targetType);
      }
      if (initialPrefilledData.title) setTitle(initialPrefilledData.title);
      if (initialPrefilledData.category) setCategory(initialPrefilledData.category);
      if (initialPrefilledData.totalCost) setCost(String(initialPrefilledData.totalCost));
      if (initialPrefilledData.laborCost) setLaborCost(String(initialPrefilledData.laborCost));
      if (initialPrefilledData.name) setPartName(initialPrefilledData.name);
      if (initialPrefilledData.brand) setPartBrand(initialPrefilledData.brand);
      if (initialPrefilledData.partNumber) setPartNumber(initialPrefilledData.partNumber);
      if (initialPrefilledData.price) setPartPrice(String(initialPrefilledData.price));
      if (initialPrefilledData.description) setNotes(initialPrefilledData.description);
      if (initialPrefilledData.barcode) setScannedBadge(`Штрихкод: ${initialPrefilledData.barcode}`);
      else if (initialPrefilledData.vin) setScannedBadge(`VIN: ${initialPrefilledData.vin}`);
    }
  }, [initialPrefilledData]);

  // Handle applied scan result from embedded camera scanner
  const handleApplyScanResult = (scanned: PrefilledScanData) => {
    setIsScannerModalOpen(false);

    if (scanned.barcode) {
      setScannedBadge(`Штрихкод: ${scanned.barcode}`);
    } else if (scanned.vin) {
      setScannedBadge(`VIN: ${scanned.vin}`);
    }

    if (scannerTargetMode === "part" || eventType === "part") {
      setEventType("part");
      if (scanned.name) setPartName(scanned.name);
      if (scanned.brand) setPartBrand(scanned.brand);
      if (scanned.partNumber) setPartNumber(scanned.partNumber);
      if (scanned.category) setCategory(scanned.category);
      if (scanned.price) setPartPrice(String(scanned.price));
      if (scanned.description) setNotes(scanned.description);
    } else {
      // Service or Repair
      setEventType("service");
      if (scanned.title) setTitle(scanned.title);
      if (scanned.category) setCategory(scanned.category);
      if (scanned.laborCost) setLaborCost(String(scanned.laborCost));
      if (scanned.totalCost) setCost(String(scanned.totalCost));
      if (scanned.description) setNotes(scanned.description);

    }
  };

  const handleOpenScanner = (target: "part" | "service") => {
    setScannerTargetMode(target);
    setIsScannerModalOpen(true);
  };

  const handleSave = () => {
    const numMileage = parseInt(mileage, 10) || vehicle.currentMileage;
    const numCost = parseFloat(cost) || 0;
    const enteredPricePerLiter = parseFloat(pricePerLiterInput);
    const numLabor = parseFloat(laborCost) || Math.round(numCost * 0.4);

    if (eventType === "fuel") {
      const parsedLiters = parseFloat(liters);
      const numLiters = Number.isFinite(parsedLiters) && parsedLiters > 0 ? parsedLiters : 0;
      const totalCost = fuelCostMode === "per_liter"
        ? (Number.isFinite(enteredPricePerLiter) && enteredPricePerLiter >= 0
          ? enteredPricePerLiter * numLiters
          : 0)
        : numCost;
      const calculatedPricePerLiter = fuelCostMode === "per_liter"
        ? (Number.isFinite(enteredPricePerLiter) && enteredPricePerLiter >= 0 ? enteredPricePerLiter : 0)
        : (numLiters > 0 ? numCost / numLiters : 0);
      onSaveFuel?.({
        vehicleId: vehicle.id,
        date,
        mileage: numMileage,
        liters: numLiters,
        pricePerLiter: Math.round(calculatedPricePerLiter * 100) / 100,
        totalCost,
        fuelType: fuelType === "Другое" ? customFuelType.trim() || "Другое" : fuelType,
        station: location || "Газпромнефть",
      });
    } else if (eventType === "problem") {
      onSaveProblem?.({
        vehicleId: vehicle.id,
        title: title || "Новая неисправность",
        category,
        priority,
        estimatedCost: numCost,
        description: notes,
        status: "pending",
      });
    } else if (eventType === "part") {
      const pPrice = parseFloat(partPrice) || 1200;
      const pQty = parseInt(partQuantity, 10) || 1;
      onSavePart?.({
        vehicleId: vehicle.id,
        name: partName || "Запасная деталь",
        brand: partBrand || "Оригинал OEM",
        partNumber: partNumber || "SKU-AUTO",
        category,
        quantity: pQty,
        purchasePrice: pPrice,
        purchaseDate: date,
        status: "in_stock",
      });
    } else {
      // Default: Service or Repair
      const finalTitle = title || (eventType === "expense" ? "Прочий расход" : "Плановое ТО");

      onSaveService?.({
        vehicleId: vehicle.id,
        title: finalTitle,
        category,
        date,
        mileage: numMileage,
        totalCost: numCost,
        laborCost: numLabor,
        description:
          notes ||
          (scannedBadge
            ? `Зафиксировано по ${scannedBadge}`
            : "Работы внесены через мобильный Garage AI"),
        serviceCenter: location || "Автосервис",
      });
    }

    onBack?.();
  };

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none relative min-h-full">
      {/* FULLSCREEN CAMERA SCANNER OVERLAY MODAL */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-white text-neutral-900 flex flex-col">
          <BarcodeScannerScreen
            vehicle={vehicle}
            allVehicles={allVehicles}
            garageParts={garageParts}
            defaultTarget={scannerTargetMode}
            onBack={() => setIsScannerModalOpen(false)}
            onApplyResult={handleApplyScanResult}
          />
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-200/80 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Отмена</span>
        </button>

        <span className="text-xs font-bold text-neutral-900">
          {eventType === "part"
            ? "Добавить деталь"
            : eventType === "service"
            ? "Добавить услугу (ТО)"
            : "Добавить событие"}
        </span>

        <button
          onClick={handleSave}
          className="px-3.5 py-1.5 rounded-xl bg-brand-strong hover:bg-brand text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-md shadow-brand-strong/30"
        >
          Сохранить
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Scanned Badge Notification */}
        {scannedBadge && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Поля заполнены сканером: </span>
                <span className="font-mono text-[11px] font-semibold">{scannedBadge}</span>
              </div>
            </div>
            <button
              onClick={() => setScannedBadge(null)}
              className="text-[10px] text-emerald-600 hover:text-emerald-900 font-bold ml-2 underline cursor-pointer"
            >
              Скрыть
            </button>
          </div>
        )}

        {/* PROMINENT CAMERA BARCODE / QR SCAN TRIGGER BANNER */}
        <div className="p-3.5 rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-800 text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-strong/30 border border-brand/40 text-brand-on-dark flex items-center justify-center shrink-0">
              <ScanBarcode className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Камера-сканер штрихкодов</span>
                <span className="text-[9px] bg-brand-strong text-white px-1.5 py-0.2 rounded font-mono font-bold">
                  AI OCR
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {eventType === "part"
                  ? "Сканировать EAN/QR коробки детали для автозаполнения"
                  : "Сканировать VIN кузова или штрихкод детали для ТО"}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenScanner(eventType === "part" ? "part" : "service")}
            className="px-3 py-2 rounded-xl bg-brand-strong hover:bg-brand text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-strong/30 shrink-0 cursor-pointer active:scale-95 transition"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Сканировать</span>
          </button>
        </div>

        {/* -------------------- FORM 1: ADD PART (Запчасть на склад) -------------------- */}
        {eventType === "part" ? (
          <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-3.5">
            {/* Part Name */}
            <div className="relative">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                Наименование детали
              </label>
              <input
                role="combobox"
                aria-label="Наименование детали"
                aria-autocomplete="list"
                aria-expanded={partSuggestionField === "name" && partSuggestions.length > 0}
                type="text"
                placeholder="Например: Масляный фильтр двигателя"
                value={partName}
                onFocus={() => { setPartSuggestionField("name"); setActivePartSuggestion(0); }}
                onBlur={() => window.setTimeout(() => setPartSuggestionField(null), 120)}
                onChange={(e) => { setPartName(e.target.value); setPartSuggestionField("name"); setActivePartSuggestion(0); }}
                onKeyDown={(e) => {
                  if (!partSuggestions.length) return;
                  if (e.key === "ArrowDown") { e.preventDefault(); setActivePartSuggestion((index) => (index + 1) % partSuggestions.length); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setActivePartSuggestion((index) => (index - 1 + partSuggestions.length) % partSuggestions.length); }
                  else if (e.key === "Enter") { e.preventDefault(); selectPartSuggestion(partSuggestions[activePartSuggestion]); }
                  else if (e.key === "Escape") setPartSuggestionField(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-bold"
              />
              {partSuggestionField === "name" && partSuggestions.length > 0 && (
                <div role="listbox" aria-label="Варианты деталей" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1 shadow-lg">
                  {partSuggestions.map((part, index) => (
                    <button key={part.partNumber} type="button" role="option" aria-selected={activePartSuggestion === index} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPartSuggestion(part)} className={`w-full rounded-xl px-3 py-2 text-left ${activePartSuggestion === index ? "bg-brand-soft text-brand-hover" : "text-neutral-800 hover:bg-neutral-50"}`}>
                      <span className="block text-xs font-semibold">{part.name}</span>
                      <span className="mt-0.5 block text-[10px] text-neutral-500">{part.brand} · {part.partNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Brand & Part Number / SKU with Scan button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className="h-7 flex items-start text-[11px] font-bold text-neutral-500 uppercase tracking-wide leading-tight">
                  Производитель / Бренд
                </label>
                <input
                  role="combobox"
                  aria-label="Производитель / Бренд"
                  aria-autocomplete="list"
                  aria-expanded={partSuggestionField === "brand" && partSuggestions.length > 0}
                  type="text"
                  placeholder="Mann-Filter, Brembo, OEM..."
                  value={partBrand}
                  onFocus={() => { setPartSuggestionField("brand"); setActivePartSuggestion(0); }}
                  onBlur={() => window.setTimeout(() => setPartSuggestionField(null), 120)}
                  onChange={(e) => { setPartBrand(e.target.value); setPartSuggestionField("brand"); setActivePartSuggestion(0); }}
                  onKeyDown={(e) => {
                    if (!partSuggestions.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActivePartSuggestion((index) => (index + 1) % partSuggestions.length); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActivePartSuggestion((index) => (index - 1 + partSuggestions.length) % partSuggestions.length); }
                    else if (e.key === "Enter") { e.preventDefault(); selectPartSuggestion(partSuggestions[activePartSuggestion]); }
                    else if (e.key === "Escape") setPartSuggestionField(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand"
                />
                {partSuggestionField === "brand" && partSuggestions.length > 0 && (
                  <div role="listbox" aria-label="Варианты производителя" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1 shadow-lg">
                    {partSuggestions.map((part, index) => <button key={part.partNumber} type="button" role="option" aria-selected={activePartSuggestion === index} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPartSuggestion(part)} className={`w-full rounded-xl px-3 py-2 text-left text-xs ${activePartSuggestion === index ? "bg-brand-soft text-brand-hover" : "text-neutral-800 hover:bg-neutral-50"}`}>{part.brand} · {part.name}</button>)}
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="h-7 flex items-start">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide leading-tight">
                    Артикул / SKU
                  </label>
                </div>
                <input
                  role="combobox"
                  aria-label="Артикул / SKU"
                  aria-autocomplete="list"
                  aria-expanded={partSuggestionField === "partNumber" && partSuggestions.length > 0}
                  type="text"
                  placeholder="W67/1 или 15208-9F60A"
                  value={partNumber}
                  onFocus={() => { setPartSuggestionField("partNumber"); setActivePartSuggestion(0); }}
                  onBlur={() => window.setTimeout(() => setPartSuggestionField(null), 120)}
                  onChange={(e) => { setPartNumber(e.target.value); setPartSuggestionField("partNumber"); setActivePartSuggestion(0); }}
                  onKeyDown={(e) => {
                    if (!partSuggestions.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActivePartSuggestion((index) => (index + 1) % partSuggestions.length); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActivePartSuggestion((index) => (index - 1 + partSuggestions.length) % partSuggestions.length); }
                    else if (e.key === "Enter") { e.preventDefault(); selectPartSuggestion(partSuggestions[activePartSuggestion]); }
                    else if (e.key === "Escape") setPartSuggestionField(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-mono font-bold"
                />
                {partSuggestionField === "partNumber" && partSuggestions.length > 0 && (
                  <div role="listbox" aria-label="Варианты артикула" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1 shadow-lg">
                    {partSuggestions.map((part, index) => <button key={part.partNumber} type="button" role="option" aria-selected={activePartSuggestion === index} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPartSuggestion(part)} className={`w-full rounded-xl px-3 py-2 text-left text-xs ${activePartSuggestion === index ? "bg-brand-soft text-brand-hover" : "text-neutral-800 hover:bg-neutral-50"}`}>{part.partNumber} · {part.name}</button>)}
                  </div>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                Категория узла
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand"
              >
                {MAINTENANCE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            {/* Price & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Цена покупки ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="text-xs text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{currencySymbol}</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={partPrice}
                    onChange={(e) => setPartPrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Количество (шт)
                </label>
                <input
                  type="number"
                  min="1"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-mono font-bold text-center"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                Заметки / Описание
              </label>
              <textarea
                rows={2}
                placeholder="Совместимость, дата покупки, поставщик..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand resize-none"
              />
            </div>
          </div>
        ) : (
          /* -------------------- FORM 2: SERVICE / REPAIR / EXPENSE -------------------- */
          <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-3.5">
            {/* Title with scan shortcut */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide block">
                  Название события / Работы
                </label>
                {eventType === "service" && (
                  <button
                    type="button"
                    onClick={() => handleOpenScanner("service")}
                    className="text-[10px] text-brand-strong hover:text-brand-hover font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Сканировать VIN/Деталь</span>
                  </button>
                )}
              </div>
              <input
                id="service-work-title"
                role="combobox"
                aria-label="Название события / Работы"
                aria-autocomplete="list"
                aria-expanded={isWorkSuggestionsOpen && workSuggestions.length > 0}
                aria-controls="service-work-suggestions"
                aria-activedescendant={isWorkSuggestionsOpen && workSuggestions[activeWorkSuggestion] ? `service-work-option-${activeWorkSuggestion}` : undefined}
                type="text"
                placeholder={
                  eventType === "fuel"
                    ? "Заправка АИ-95"
                    : eventType === "expense"
                    ? "Мойка, шиномонтаж или парковка"
                    : eventType === "problem"
                    ? "Стук в передней подвеске"
                    : "Плановое ТО: Замена масла и фильтров"
                }
                value={title}
                onFocus={() => setIsWorkSuggestionsOpen(true)}
                onBlur={() => window.setTimeout(() => setIsWorkSuggestionsOpen(false), 120)}
                onChange={(e) => { setTitle(e.target.value); setActiveWorkSuggestion(0); setIsWorkSuggestionsOpen(true); }}
                onKeyDown={(e) => {
                  if (!workSuggestions.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIsWorkSuggestionsOpen(true);
                    setActiveWorkSuggestion((index) => (index + 1) % workSuggestions.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveWorkSuggestion((index) => (index - 1 + workSuggestions.length) % workSuggestions.length);
                  } else if (e.key === "Enter" && isWorkSuggestionsOpen) {
                    e.preventDefault();
                    selectWorkSuggestion(workSuggestions[activeWorkSuggestion]);
                  } else if (e.key === "Escape") {
                    setIsWorkSuggestionsOpen(false);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-bold"
              />
              {isWorkSuggestionsOpen && workSuggestions.length > 0 && (
                <div id="service-work-suggestions" role="listbox" aria-label="Варианты видов работ" className="mt-1 max-h-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1 shadow-lg">
                  {workSuggestions.map((work, index) => (
                    <button
                      key={work.title}
                      id={`service-work-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={activeWorkSuggestion === index}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectWorkSuggestion(work)}
                      className={`w-full rounded-xl px-3 py-2 text-left transition ${activeWorkSuggestion === index ? "bg-brand-soft text-brand-hover" : "text-neutral-800 hover:bg-neutral-50"}`}
                    >
                      <span className="block text-xs font-semibold">{work.title}</span>
                      <span className="mt-0.5 block text-[10px] text-neutral-500">{work.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category for service/repair */}
            {eventType === "service" && (
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Категория работ
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand"
                >
                  {MAINTENANCE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            )}

            {/* Date */}
            <div className={eventType === "fuel" ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Дата
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-mono"
                  />
                </div>
              </div>

              {eventType !== "fuel" && <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Пробег (км)
                </label>
                <div className="relative">
                  <Gauge className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-mono font-bold"
                  />
                </div>
              </div>}
            </div>

            {/* Cost, volume & location */}
            <div className={eventType === "fuel" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  {eventType === "fuel" && fuelCostMode === "per_liter"
                    ? "Цена за литр (" + currencySymbol + ")"
                    : "Итоговая стоимость (" + currencySymbol + ")"}
                </label>
                <div className="relative">
                  <span className="text-xs text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={eventType === "fuel" && fuelCostMode === "per_liter" ? "0.00" : "0"}
                    value={eventType === "fuel" && fuelCostMode === "per_liter" ? pricePerLiterInput : cost}
                    onChange={(e) => eventType === "fuel" && fuelCostMode === "per_liter"
                      ? setPricePerLiterInput(e.target.value)
                      : setCost(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-mono font-bold text-emerald-600"
                  />
                </div>
                {eventType === "fuel" && (
                  <div className="mt-2 grid grid-cols-2 gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setFuelCostMode("total")}
                      className={`py-1.5 rounded-lg text-[10px] font-bold ${fuelCostMode === "total" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}
                    >
                      Общая сумма
                    </button>
                    <button
                      type="button"
                      onClick={() => setFuelCostMode("per_liter")}
                      className={`py-1.5 rounded-lg text-[10px] font-bold ${fuelCostMode === "per_liter" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}
                    >
                      Цена за литр
                    </button>
                  </div>
                )}
              </div>

              {eventType === "fuel" && fuelCostMode === "per_liter" && (
                <div>
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                    Объем (л)
                  </label>
                  <div className="relative">
                    <input
                      aria-label="Объем заправки в литрах"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      className="w-full px-3 pr-9 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-mono font-bold"
                    />
                    <span className="text-xs text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">л</span>
                  </div>
                </div>
              )}

              <div className={eventType === "fuel" ? "sm:col-span-2" : ""}>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  {eventType === "fuel" ? "АЗС" : "Автосервис / Место"}
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={eventType === "fuel"
                      ? (FUEL_STATIONS.includes(location) ? location : "Другое")
                      : (["Гараж / Автосервис", "Гараж", "Автосервис"].includes(location) ? location : "Другое")}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocation(value === "Другое" ? (customLocation || "Другое") : value);
                      if (value !== "Другое") setCustomLocation("");
                    }}
                    className="w-full appearance-none pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand"
                  >
                    {eventType === "fuel" ? (
                      <>
                        {FUEL_STATIONS.map((station) => <option key={station}>{station}</option>)}
                      </>
                    ) : (
                      <>
                        <option>Гараж / Автосервис</option>
                        <option>Гараж</option>
                        <option>Автосервис</option>
                        <option>Другое</option>
                      </>
                    )}
                  </select>
                </div>
                {(location === "Другое" || customLocation) && (
                  <input
                    type="text"
                    placeholder={eventType === "fuel" ? "Название АЗС" : "Название автосервиса / места"}
                    value={customLocation}
                    onChange={(e) => { setCustomLocation(e.target.value); setLocation(e.target.value); }}
                    className="mt-2 w-full px-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand"
                  />
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                Заметки и описание
              </label>
              <textarea
                rows={2}
                placeholder="Дополнительные детали, артикулы, рекомендации..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand resize-none"
              />
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
