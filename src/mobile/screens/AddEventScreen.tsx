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
import { getDistanceUnit, getVolumeUnit, toDisplayDistance, toKilometers, toDisplayVolume, toLiters, toPricePerLiter, volumeUnitLabel } from "../units";
import { GARAGE_SETTINGS_CHANGE_EVENT } from "../settings";
import { DatePicker } from "../components/DatePicker";

const FUEL_TYPES = ["АИ-92", "АИ-95", "АИ-98", "АИ-100", "ДТ", "Газ", "Другое"];
const PETROL_FUEL_TYPES = ["АИ-92", "АИ-95", "АИ-98", "АИ-100"];
const DIESEL_FUEL_TYPES = ["ДТ"];
const DIESEL_SEASONAL_FUEL_TYPES = ["ДТ Лето", "ДТ Межсезонье", "ДТ Зима", "ДТ Арктика"];
const SUGGESTION_LIST_CLASS = "mt-1 max-h-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1 shadow-lg";
const SUGGESTION_OPTION_CLASS = "w-full rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";
const SUGGESTION_ACTIVE_CLASS = "bg-brand-soft text-brand-hover";
const SUGGESTION_IDLE_CLASS = "text-neutral-800 hover:bg-neutral-50";
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
  if (normalized.includes("дизел") || /(^|\s)дт($|\s)/.test(normalized)) return DIESEL_SEASONAL_FUEL_TYPES;
  if (normalized.includes("бензин") || normalized.includes("гибрид") || /аи[- ]?\d{2,3}/.test(normalized)) {
    return PETROL_FUEL_TYPES;
  }
  return FUEL_TYPES;
}

function getDefaultFuelType(vehicleFuelType: string | undefined, availableFuelTypes: string[]) {
  const normalized = (vehicleFuelType || "").toLocaleLowerCase("ru");
  const octane = normalized.match(/аи[- ]?(92|95|98|100)/)?.[1];
  const seasonalDiesel = DIESEL_SEASONAL_FUEL_TYPES.find((type) => normalized.includes(type.toLocaleLowerCase("ru")));
  const requestedType = octane ? "АИ-" + octane : seasonalDiesel || (normalized.includes("дизел") ? "ДТ Лето" : "АИ-95");
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
  const [isCategorySuggestionsOpen, setIsCategorySuggestionsOpen] = useState(false);
  const [activeCategorySuggestion, setActiveCategorySuggestion] = useState(0);
  const [category, setCategory] = useState<MaintenanceCategory>(
    initialPrefilledData?.category || "ТО и замена жидкостей"
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState(() => String(Math.round(toDisplayDistance(vehicle.currentMileage))));
  const [cost, setCost] = useState(
    initialPrefilledData?.totalCost ? String(initialPrefilledData.totalCost) : ""
  );
  const [laborCost, setLaborCost] = useState(
    initialPrefilledData?.laborCost ? String(initialPrefilledData.laborCost) : ""
  );
  const [location, setLocation] = useState(
    initialPrefilledData?.serviceCenter || "Автосервис"
  );
  const currencySymbol = CURRENCY_SYMBOLS[getGarageCurrency()];
  const prefilledCenter = initialPrefilledData?.serviceCenter || "";
  const [locationType, setLocationType] = useState<"Автосервис" | "Частный мастер" | "Другое">(
    prefilledCenter === "Частный мастер" ? "Частный мастер" : prefilledCenter === "Автосервис" || !prefilledCenter ? "Автосервис" : "Другое"
  );
  const [customLocation, setCustomLocation] = useState(
    ["Автосервис", "Частный мастер", "Газпромнефть", "Лукойл", "Роснефть", "Татнефть"].includes(prefilledCenter) ? "" : prefilledCenter
  );
  const [isStationSuggestionsOpen, setIsStationSuggestionsOpen] = useState(false);
  const [activeStationSuggestion, setActiveStationSuggestion] = useState(0);
  const [isLocationSuggestionsOpen, setIsLocationSuggestionsOpen] = useState(false);
  const [activeLocationSuggestion, setActiveLocationSuggestion] = useState(0);
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
  const [liters, setLiters] = useState("");
  const [volumeUnit, setVolumeUnit] = useState(getVolumeUnit);
  const [distanceUnit, setDistanceUnit] = useState(getDistanceUnit);
  const [fuelCostMode, setFuelCostMode] = useState<"total" | "per_liter">("total");
  const [pricePerLiterInput, setPricePerLiterInput] = useState("");
  const [fuelType, setFuelType] = useState(() => getDefaultFuelType(vehicle.fuelType, availableFuelTypes));
  const [customFuelType, setCustomFuelType] = useState("");

  useEffect(() => {
    setFuelType(getDefaultFuelType(vehicle.fuelType, availableFuelTypes));
    setCustomFuelType("");
  }, [vehicle.id, vehicle.fuelType, availableFuelTypes]);

  useEffect(() => {
    let previousUnit = getVolumeUnit();
    let previousDistanceUnit = getDistanceUnit();
    const refreshVolumeUnit = () => {
      const nextUnit = getVolumeUnit();
      if (nextUnit !== previousUnit) {
        const conversion = nextUnit === "gal" ? 0.264172 : 1 / 0.264172;
        setLiters((value) => {
          const amount = Number(value);
          return Number.isFinite(amount) ? String(amount * conversion) : value;
        });
        setPricePerLiterInput((value) => {
          if (!value.trim()) return value;
          const price = Number(value);
          return Number.isFinite(price) ? String(price / conversion) : value;
        });
        previousUnit = nextUnit;
        setVolumeUnit(nextUnit);
      }
      const nextDistanceUnit = getDistanceUnit();
      if (nextDistanceUnit !== previousDistanceUnit) {
        const conversion = nextDistanceUnit === "mi" ? 0.621371 : 1 / 0.621371;
        setMileage((value) => {
          const amount = Number(value);
          return Number.isFinite(amount) ? String(Math.round(amount * conversion)) : value;
        });
        previousDistanceUnit = nextDistanceUnit;
        setDistanceUnit(nextDistanceUnit);
      }
    };
    window.addEventListener(GARAGE_SETTINGS_CHANGE_EVENT, refreshVolumeUnit);
    return () => window.removeEventListener(GARAGE_SETTINGS_CHANGE_EVENT, refreshVolumeUnit);
  }, []);

  // Problem specific
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const fuelSuggestions = availableFuelTypes.map((type) => ({
    title: type,
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
  const stationSuggestions = FUEL_STATIONS.filter((station) => station !== "Другое" && station.toLocaleLowerCase("ru").includes(location.trim().toLocaleLowerCase("ru")));
  const locationSuggestions = ["Автосервис", "Частный мастер"];
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
    const enteredMileage = parseFloat(mileage);
    const numMileage = Number.isFinite(enteredMileage) && enteredMileage >= 0
      ? Math.round(toKilometers(enteredMileage))
      : vehicle.currentMileage;
    const numCost = parseFloat(cost) || 0;
    const enteredPricePerLiter = parseFloat(pricePerLiterInput);
    const numLabor = parseFloat(laborCost) || Math.round(numCost * 0.4);

    if (eventType === "fuel") {
      const parsedLiters = parseFloat(liters);
      const enteredVolume = Number.isFinite(parsedLiters) && parsedLiters > 0 ? parsedLiters : 0;
      const numLiters = toLiters(enteredVolume);
      const enteredPrice = Number.isFinite(enteredPricePerLiter) && enteredPricePerLiter >= 0 ? enteredPricePerLiter : 0;
      const totalCost = fuelCostMode === "per_liter"
        ? (Number.isFinite(enteredPricePerLiter) && enteredPricePerLiter >= 0
          ? enteredPrice * enteredVolume
          : 0)
        : numCost;
      const calculatedPricePerLiter = fuelCostMode === "per_liter"
        ? toPricePerLiter(enteredPrice)
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
        serviceCenter: customLocation.trim() || locationType || location || "Автосервис",
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
            : eventType === "fuel"
            ? "Добавить заправку"
            : eventType === "expense"
            ? "Добавить расход"
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
        <div className="p-3.5 rounded-3xl bg-white border border-neutral-200/90 text-neutral-900 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-soft border border-brand-soft-strong text-brand-strong flex items-center justify-center shrink-0">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <span>{eventType === "fuel" ? "Чек АЗС" : eventType === "part" ? "Сканировать деталь" : "Сканировать документ"}</span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5">{eventType === "fuel" ? "Сумма, топливо и АЗС" : eventType === "part" ? "EAN/QR для автозаполнения" : "VIN или штрихкод для ТО"}</p>
            </div>
          </div>

          <button
            onClick={() => handleOpenScanner(eventType === "part" ? "part" : "service")}
            className="px-3 py-2 rounded-xl bg-brand-strong hover:bg-brand text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer active:scale-95 transition"
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
                <label className="h-8 flex items-start text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 leading-tight">
                  Цена покупки ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="text-xs text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">{currencySymbol}</span>
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
                  {eventType === "fuel" ? "Вид топлива" : "Выполненные работы"}
                </label>
              </div>
              <input
                id="service-work-title"
                role="combobox"
                aria-label={eventType === "fuel" ? "Вид топлива" : "Выполненные работы"}
                aria-autocomplete="list"
                aria-expanded={isWorkSuggestionsOpen && workSuggestions.length > 0}
                aria-controls="service-work-suggestions"
                aria-activedescendant={isWorkSuggestionsOpen && workSuggestions[activeWorkSuggestion] ? `service-work-option-${activeWorkSuggestion}` : undefined}
                type="text"
                placeholder={
                  eventType === "fuel"
                    ? fuelType
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
                <div id="service-work-suggestions" role="listbox" aria-label="Варианты видов работ" className={SUGGESTION_LIST_CLASS}>
                  {workSuggestions.map((work, index) => (
                    <button
                      key={work.title}
                      id={`service-work-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={activeWorkSuggestion === index}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectWorkSuggestion(work)}
                      className={`${SUGGESTION_OPTION_CLASS} ${activeWorkSuggestion === index ? SUGGESTION_ACTIVE_CLASS : SUGGESTION_IDLE_CLASS}`}
                    >
                      <span className="block text-xs font-semibold">{work.title}</span>
                      {eventType !== "fuel" && <span className="mt-0.5 block text-[10px] text-neutral-500">{work.category}</span>}
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
                <div className="relative">
                  <button type="button" aria-haspopup="listbox" aria-expanded={isCategorySuggestionsOpen} onClick={() => setIsCategorySuggestionsOpen((open) => !open)} className={`${SUGGESTION_OPTION_CLASS} w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs flex items-center justify-between`}>
                    <span>{category}</span><span className="text-neutral-400">⌄</span>
                  </button>
                  {isCategorySuggestionsOpen && <div role="listbox" aria-label="Категории работ" className={`${SUGGESTION_LIST_CLASS} absolute left-0 right-0 z-30`}>
                    {MAINTENANCE_CATEGORIES.map((item, index) => <button key={item} type="button" role="option" aria-selected={category === item} onMouseDown={(event) => event.preventDefault()} onClick={() => { setCategory(item); setActiveCategorySuggestion(index); setIsCategorySuggestionsOpen(false); }} className={`${SUGGESTION_OPTION_CLASS} ${category === item ? SUGGESTION_ACTIVE_CLASS : SUGGESTION_IDLE_CLASS}`}><span className="block text-xs font-semibold">{item}</span></button>)}
                  </div>}
                </div>
              </div>
            )}

            {/* Date */}
            <div className={eventType === "fuel" ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
              <DatePicker value={date} onChange={setDate} />

              {eventType !== "fuel" && <div>
                <label className="h-8 flex items-start text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 leading-tight">
                  Пробег на момент события
                </label>
                <div className="relative">
                  <Gauge className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full pl-9 pr-12 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-mono font-bold"
                  />
                  <span className="text-xs text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">{distanceUnit === "mi" ? "ми" : "км"}</span>
                </div>
              </div>}
            </div>

            {/* Cost, volume & location */}
            <div className={eventType === "fuel" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
              <div>
                <label className="h-8 flex items-start text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 leading-tight">
                  {eventType === "fuel" && fuelCostMode === "per_liter"
                    ? "Цена за " + volumeUnitLabel() + " (" + currencySymbol + ")"
                    : "Итоговая стоимость (" + currencySymbol + ")"}
                </label>
                <div className="relative">
                  <span className="text-xs text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">{currencySymbol}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    placeholder={eventType === "fuel" && fuelCostMode === "per_liter" ? "0.00" : "0"}
                    value={eventType === "fuel" && fuelCostMode === "per_liter" ? pricePerLiterInput : cost}
                    onChange={(e) => eventType === "fuel" && fuelCostMode === "per_liter"
                      ? setPricePerLiterInput(e.target.value)
                      : setCost(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 font-mono font-bold text-emerald-600 transition"
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
                      Цена за {volumeUnit === "gal" ? "галлон" : "литр"}
                    </button>
                  </div>
                )}
              </div>

              {eventType === "fuel" && fuelCostMode === "per_liter" && (
                <div>
                  <label className="h-8 flex items-start text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 leading-tight">
                    Объем ({volumeUnitLabel()})
                  </label>
                  <div className="relative">
                    <input
                      aria-label={"Объем заправки в " + (volumeUnit === "gal" ? "галлонах" : "литрах")}
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      className="w-full px-3 pr-9 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 font-mono font-bold transition"
                    />
                    <span className="text-xs text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">{volumeUnitLabel()}</span>
                  </div>
                </div>
              )}

              <div className={eventType === "fuel" ? "sm:col-span-2" : ""}>
                <label className="h-8 flex items-start text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 leading-tight">
                  {eventType === "fuel" ? "АЗС" : "Автосервис / Место"}
                </label>
                {eventType === "fuel" ? (
                  <div className="relative">
                    <input
                      type="text"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={isStationSuggestionsOpen}
                      placeholder="Начните вводить название АЗС"
                      value={location}
                      onFocus={() => setIsStationSuggestionsOpen(true)}
                      onBlur={() => window.setTimeout(() => setIsStationSuggestionsOpen(false), 120)}
                      onChange={(e) => { setLocation(e.target.value); setCustomLocation(e.target.value); setActiveStationSuggestion(0); setIsStationSuggestionsOpen(true); }}
                      onKeyDown={(e) => { if (!stationSuggestions.length) return; if (e.key === "ArrowDown") { e.preventDefault(); setActiveStationSuggestion((index) => (index + 1) % stationSuggestions.length); } else if (e.key === "ArrowUp") { e.preventDefault(); setActiveStationSuggestion((index) => (index - 1 + stationSuggestions.length) % stationSuggestions.length); } else if (e.key === "Enter" && isStationSuggestionsOpen) { e.preventDefault(); const station = stationSuggestions[activeStationSuggestion]; setLocation(station); setCustomLocation(station); setIsStationSuggestionsOpen(false); } else if (e.key === "Escape") setIsStationSuggestionsOpen(false); }}
                      className="w-full px-3 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-brand font-bold"
                    />
                    {isStationSuggestionsOpen && stationSuggestions.length > 0 && <div id="fuel-station-suggestions" role="listbox" aria-label="Варианты АЗС" className={SUGGESTION_LIST_CLASS}>
                      {stationSuggestions.map((station, index) => <button key={station} id={`fuel-station-option-${index}`} type="button" role="option" aria-selected={activeStationSuggestion === index} onMouseDown={(event) => event.preventDefault()} onClick={() => { setLocation(station); setCustomLocation(station); setIsStationSuggestionsOpen(false); }} className={`${SUGGESTION_OPTION_CLASS} ${activeStationSuggestion === index ? SUGGESTION_ACTIVE_CLASS : SUGGESTION_IDLE_CLASS}`}><span className="block break-words text-xs font-semibold leading-4">{station}</span></button>)}
                    </div>}
                  </div>
                ) : (
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <button type="button" aria-haspopup="listbox" aria-expanded={isLocationSuggestionsOpen} onClick={() => setIsLocationSuggestionsOpen((open) => !open)} className={`${SUGGESTION_OPTION_CLASS} w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs flex items-center justify-between`}>
                      <span>{locationType}</span><span className="text-neutral-400">⌄</span>
                    </button>
                    {isLocationSuggestionsOpen && <div role="listbox" aria-label="Варианты места" className={`${SUGGESTION_LIST_CLASS} absolute left-0 right-0 top-full z-30`}>
                      {locationSuggestions.map((item, index) => <button key={item} type="button" role="option" aria-selected={locationType === item} onMouseDown={(event) => event.preventDefault()} onClick={() => { setLocationType(item as "Автосервис" | "Частный мастер"); setLocation(item); setCustomLocation(""); setActiveLocationSuggestion(index); setIsLocationSuggestionsOpen(false); }} className={`${SUGGESTION_OPTION_CLASS} ${locationType === item ? SUGGESTION_ACTIVE_CLASS : SUGGESTION_IDLE_CLASS}`}><span className="block text-xs font-semibold">{item}</span><span className="mt-0.5 block text-[10px] text-neutral-500">Место обслуживания</span></button>)}
                      <button type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => { setLocationType("Другое"); setLocation(customLocation || "Другое"); setIsLocationSuggestionsOpen(false); }} className={`${SUGGESTION_OPTION_CLASS} ${locationType === "Другое" ? SUGGESTION_ACTIVE_CLASS : SUGGESTION_IDLE_CLASS}`}><span className="block text-xs font-semibold">Другое</span><span className="mt-0.5 block text-[10px] text-neutral-500">Ввести вручную</span></button>
                    </div>}
                  </div>
                )}
                {eventType !== "fuel" && (
                  <input
                    type="text"
                    placeholder={locationType === "Частный мастер" ? "Имя частного мастера" : locationType === "Автосервис" ? "Название автосервиса" : "Название места"}
                    value={customLocation}
                    onChange={(e) => { setCustomLocation(e.target.value); if (locationType === "Другое") setLocation(e.target.value); }}
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
