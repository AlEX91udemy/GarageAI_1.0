import { useModalFocus } from "./useModalFocus";
import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Car,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Sparkles,
  Gauge,
  Palette,
  Shield,
  Layers,
  HelpCircle,
  Lock,
  ChevronDown,
} from "lucide-react";
import { Vehicle } from "../types";
import { LicensePlateBadge } from "./LicensePlateBadge";
import { CarCascadeSelector } from "./CarCascadeSelector";
import { CarBodyType, findGeneration } from "../carCatalog";

const STANDARD_VEHICLE_COLOR = "#dc2626";

interface VehicleModalProps {
  currentVehicle?: Vehicle;
  allVehicles: Vehicle[];
  initialMode?: "edit" | "add";
  onClose: () => void;
  onSaveVehicle: (vehicle: Vehicle) => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
}

// Preset vehicle templates for quick 1-click addition
const PRESETS: Array<{
  make: string;
  model: string;
  generation: string;
  bodyType: CarBodyType;
  year: number;
  engine: string;
  fuelType: string;
  transmission: string;
  driveType: string;
  mileage: number;
  colorHex: string;
  licensePlate: string;
  vin: string;
}> = [
  {
    make: "Nissan",
    model: "X-Trail",
    generation: "T31 Рестайлинг",
    bodyType: "suv",
    year: 2008,
    engine: "2.0L MR20DE (141 л.с.)",
    fuelType: "Бензин (АИ-95)",
    transmission: "Вариатор Jatco JF011E",
    driveType: "Полный привод (All-Mode 4x4-i)",
    mileage: 206000,
    colorHex: STANDARD_VEHICLE_COLOR,
    licensePlate: "О742УМ 197",
    vin: "JN1TBNT31U0048123",
  },
  {
    make: "Toyota",
    model: "Corolla Cross",
    generation: "XG10",
    bodyType: "suv",
    year: 2025,
    engine: "2.0L Dynamic Force Hybrid (196 л.с.)",
    fuelType: "Бензин / Гибрид",
    transmission: "E-CVT",
    driveType: "Полный привод AWD-i",
    mileage: 18500,
    colorHex: STANDARD_VEHICLE_COLOR,
    licensePlate: "М319КХ 799",
    vin: "JTDAGACF9P3012984",
  },
  {
    make: "BMW",
    model: "3 Series 320d",
    generation: "F30 LCI",
    bodyType: "sedan",
    year: 2017,
    engine: "2.0d B47D20 (190 л.с.)",
    fuelType: "Дизель",
    transmission: "АКПП 8-ст ZF 8HP",
    driveType: "Полный привод xDrive",
    mileage: 142000,
    colorHex: STANDARD_VEHICLE_COLOR,
    licensePlate: "В505ОХ 777",
    vin: "WBA8E1106GNT98231",
  },
  {
    make: "Chery",
    model: "Tiggo 7 Pro Max",
    generation: "I Рестайлинг",
    bodyType: "suv",
    year: 2023,
    engine: "1.6 TGDI SQRF4J16 (150 л.с.)",
    fuelType: "Бензин (АИ-92/95)",
    transmission: "РКПП 7DCT300",
    driveType: "AWD",
    mileage: 38000,
    colorHex: STANDARD_VEHICLE_COLOR,
    licensePlate: "Е821ТН 790",
    vin: "LVVDB21B9PD018274",
  },
  {
    make: "Lada",
    model: "Vesta SW Cross",
    generation: "NG (Новое поколение)",
    bodyType: "suv",
    year: 2024,
    engine: "1.8 EVO (122 л.с.)",
    fuelType: "Бензин (АИ-95)",
    transmission: "Вариатор CVT WLY",
    driveType: "Передний привод",
    mileage: 12000,
    colorHex: STANDARD_VEHICLE_COLOR,
    licensePlate: "К404ХУ 777",
    vin: "XTA218150P0128912",
  },
];

const uniqueOptions = (current: string, suggested: string[] | undefined, defaults: string[]) =>
  Array.from(new Set([current, ...(suggested || []), ...defaults].filter(Boolean)));

interface ModernSelectProps {
  id: string;
  value: string;
  options: string[];
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
}

const ModernSelect: React.FC<ModernSelectProps> = ({ id, value, options, placeholder, required, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`w-full flex items-center justify-between gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2 text-xs text-left transition focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 ${value ? "text-neutral-800" : "text-neutral-400"}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <input tabIndex={-1} aria-hidden="true" value={value} onChange={() => undefined} required={required} className="sr-only" />
      {open && (
        <div role="listbox" aria-labelledby={id} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl shadow-neutral-900/10">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onClick={() => { onChange(option); setOpen(false); }}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${value === option ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Quick VIN origin decoder helper
const decodeVinOrigin = (vinStr: string) => {
  if (!vinStr || vinStr.length < 3) return "";
  const first = vinStr.charAt(0).toUpperCase();
  const firstTwo = vinStr.substring(0, 2).toUpperCase();

  if (first === "J") return "Производство: Япония 🇯🇵";
  if (first === "W") return "Производство: Германия 🇩🇪";
  if (first === "K") return "Производство: Южная Корея 🇰🇷";
  if (first === "L") return "Производство: Китай 🇨🇳";
  if (first === "X" || firstTwo === "X7" || firstTwo === "X8") return "Производство: Россия 🇷🇺";
  if (first === "1" || first === "4" || first === "5") return "Производство: США 🇺🇸";
  if (first === "2") return "Производство: Канада 🇨🇦";
  if (first === "3") return "Производство: Мексика 🇲🇽";
  if (first === "S") return "Производство: Великобритания 🇬🇧";
  if (first === "V" && (firstTwo === "VF" || firstTwo === "VR")) return "Производство: Франция 🇫🇷";
  if (first === "Z") return "Производство: Италия 🇮🇹";
  return "Корректный формат VIN";
};

export const VehicleModal: React.FC<VehicleModalProps> = ({
  currentVehicle,
  allVehicles,
  initialMode = "edit",
  onClose,
  onSaveVehicle,
  onAddVehicle,
  onDeleteVehicle,
}) => {
  const [mode, setMode] = useState<"edit" | "add">(initialMode);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [make, setMake] = useState(mode === "add" ? "" : (currentVehicle?.make || ""));
  const [model, setModel] = useState(mode === "add" ? "" : (currentVehicle?.model || ""));
  const [generation, setGeneration] = useState(mode === "add" ? "" : (currentVehicle?.generation || ""));
  const [bodyType, setBodyType] = useState<CarBodyType>(
    mode === "add" ? "suv" : (currentVehicle?.bodyType || "suv")
  );
  const [year, setYear] = useState(mode === "add" ? 2023 : (currentVehicle?.year || 2023));
  const [engine, setEngine] = useState(mode === "add" ? "" : (currentVehicle?.engine || ""));
  const [fuelType, setFuelType] = useState(mode === "add" ? "Бензин (АИ-95)" : (currentVehicle?.fuelType || "Бензин (АИ-95)"));
  const [transmission, setTransmission] = useState(mode === "add" ? "Автомат / Вариатор" : (currentVehicle?.transmission || "Автомат / Вариатор"));
  const [driveType, setDriveType] = useState(mode === "add" ? "Полный привод" : (currentVehicle?.driveType || "Передний привод"));
  const matchedGeneration = findGeneration(make, model, generation);
  const transmissionOptions = uniqueOptions(transmission, matchedGeneration?.transmissionSuggestions, [
    "АКПП",
    "МКПП",
    "Вариатор (CVT)",
    "Роботизированная КПП (DCT)",
  ]);
  const driveOptions = uniqueOptions(driveType, matchedGeneration?.driveTypeSuggestions, [
    "Передний привод",
    "Задний привод",
    "Полный привод (AWD/4WD)",
  ]);
  const engineOptions = uniqueOptions(engine, matchedGeneration?.engineSuggestions, [
    "1.6L бензин",
    "2.0L бензин",
    "2.5L бензин",
    "Дизельный двигатель",
    "Гибридная установка",
    "Электродвигатель",
  ]);
  const fuelOptions = uniqueOptions(fuelType, matchedGeneration?.fuelTypeSuggestions, [
    "Бензин (АИ-95)",
    "Бензин (АИ-92)",
    "Дизель",
    "Бензин / Гибрид",
    "Электричество",
  ]);
  const [mileage, setMileage] = useState(mode === "add" ? 25000 : (currentVehicle?.currentMileage || 0));
  const colorHex = STANDARD_VEHICLE_COLOR;
  const [licensePlate, setLicensePlate] = useState(mode === "add" ? "" : (currentVehicle?.licensePlate || ""));
  const [vin, setVin] = useState(mode === "add" ? "" : (currentVehicle?.vin || ""));

  // Active preview vehicle for live 3D rotation
  const previewVehicle: Vehicle = {
    id: "preview",
    make: make || "Автомобиль",
    model: model || "3D Модель",
    generation,
    bodyType,
    year: Number(year) || 2024,
    engine: engine || "2.0L",
    fuelType,
    transmission,
    driveType,
    currentMileage: Number(mileage) || 0,
    lastMileageUpdate: "сегодня",
    colorHex,
    licensePlate,
    vin,
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setMake(p.make);
    setModel(p.model);
    setGeneration(p.generation);
    setBodyType(p.bodyType);
    setYear(p.year);
    setEngine(p.engine);
    setFuelType(p.fuelType);
    setTransmission(p.transmission);
    setDriveType(p.driveType);
    setMileage(p.mileage);
    setLicensePlate(p.licensePlate);
    setVin(p.vin);
  };

  const handleStartAdd = () => {
    setMode("add");
    setMake("");
    setModel("");
    setGeneration("");
    setBodyType("suv");
    setYear(2024);
    setEngine("");
    setFuelType("Бензин (АИ-95)");
    setTransmission("Автомат / Вариатор");
    setDriveType("Полный привод");
    setMileage(20000);
    setLicensePlate("");
    setVin("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!make.trim() || !model.trim()) return;

    if (mode === "edit" && currentVehicle) {
      const updated: Vehicle = {
        ...currentVehicle,
        make: make.trim(),
        model: model.trim(),
        generation: generation.trim() || undefined,
        bodyType,
        year: Number(year),
        engine: engine.trim(),
        fuelType: fuelType.trim(),
        transmission: transmission.trim(),
        driveType: driveType.trim(),
        currentMileage: Number(mileage),
        colorHex: currentVehicle.colorHex || STANDARD_VEHICLE_COLOR,
        licensePlate: currentVehicle?.licensePlate, // Locked upon creation
        vin: vin.trim().toUpperCase() || undefined,
        photoUrl: undefined,
        lastMileageUpdate: new Date().toLocaleDateString("ru-RU"),
      };
      onSaveVehicle(updated);
    } else {
      const newV: Vehicle = {
        id: "car-" + crypto.randomUUID(),
        make: make.trim(),
        model: model.trim(),
        generation: generation.trim() || undefined,
        bodyType,
        year: Number(year),
        engine: engine.trim() || "2.0L",
        fuelType: fuelType.trim(),
        transmission: transmission.trim() || "АКПП",
        driveType: driveType.trim(),
        currentMileage: Number(mileage) || 0,
        colorHex,
        licensePlate: licensePlate.trim() || undefined,
        vin: vin.trim().toUpperCase() || undefined,
        photoUrl: undefined,
        lastMileageUpdate: new Date().toLocaleDateString("ru-RU"),
      };
      onAddVehicle(newV);
    }
    onClose();
  };

  const dialogRef = useModalFocus(onClose);

  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-label="Автомобили" tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-neutral-100 shrink-0 bg-white">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                  Управление автопарком
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
                  {mode === "edit" ? "Редактировать автомобиль" : "Добавить новый автомобиль"}
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

        {/* Mode switcher tabs */}
        <div className="flex items-center justify-between pt-3 pb-2 text-xs border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMode("edit");
                if (currentVehicle) {
                  setMake(currentVehicle.make || "");
                  setModel(currentVehicle.model || "");
                  setGeneration(currentVehicle.generation || "");
                  setBodyType(currentVehicle.bodyType || "suv");
                  setYear(currentVehicle.year || 2023);
                  setEngine(currentVehicle.engine || "");
                  setFuelType(currentVehicle.fuelType || "Бензин (АИ-95)");
                  setTransmission(currentVehicle.transmission || "Автомат / Вариатор");
                  setDriveType(currentVehicle.driveType || "Передний привод");
                  setMileage(currentVehicle.currentMileage || 0);
                  setLicensePlate(currentVehicle.licensePlate || "");
                  setVin(currentVehicle.vin || "");
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                mode === "edit" ? "bg-neutral-900 text-white shadow-sm" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Редактировать {currentVehicle ? `(${currentVehicle.make} ${currentVehicle.model})` : ""}
            </button>
            <button
              onClick={handleStartAdd}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mode === "add" ? "bg-red-600 text-white shadow-sm" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Добавить авто</span>
            </button>
          </div>

          {allVehicles.length > 1 && mode === "edit" && currentVehicle && (
            showDeleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-500 font-medium">Точно удалить?</span>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteVehicle(currentVehicle.id);
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="text-xs text-white bg-red-600 hover:bg-red-700 font-bold px-2 py-1 rounded-lg transition"
                >
                  Да
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded-lg transition"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
        {/* Vehicle Preview Card with Car Icon */}
        <div className="mt-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-neutral-200 shadow-sm"
              style={{ backgroundColor: colorHex ? `${colorHex}18` : "#f5f5f5" }}
            >
              <Car className="w-6 h-6" style={{ color: colorHex || "#dc2626" }} />
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">
                {make || "Марка"} {model || "Модель"} {year ? `(${year})` : ""}
              </div>
              <div className="text-[11px] text-neutral-500">
                {generation || bodyType ? `${generation || ""} • ${bodyType || ""}` : "Параметры авто"}
              </div>
            </div>
          </div>
          {licensePlate && (
            <LicensePlateBadge plate={licensePlate} size="sm" />
          )}
        </div>

        {/* Quick Presets row when in add mode or switching */}
        <div className="mt-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Быстрые шаблоны автомобилей:</span>
            <span className="text-[10px] text-neutral-400 font-normal">кликните для автозаполнения</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="p-2 bg-white hover:bg-neutral-100 hover:border-red-400 border border-neutral-200 rounded-xl text-left text-xs transition cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-neutral-300"
                    style={{ backgroundColor: p.colorHex }}
                  />
                  <span className="font-bold text-neutral-900 truncate">
                    {p.make}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-600 font-medium truncate">
                  {p.model}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  {p.year} г.
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Vehicle Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mt-3 text-xs">
          {/* Linked Hierarchical Selector: Make -> Model -> Generation -> Body Type */}
          <CarCascadeSelector
            make={make}
            model={model}
            generation={generation}
            bodyType={bodyType}
            year={Number(year) || 2024}
            engine={engine}
            fuelType={fuelType}
            transmission={transmission}
            driveType={driveType}
            onChangeMake={(m) => setMake(m)}
            onChangeModel={(mod) => setModel(mod)}
            onChangeGeneration={(gen) => setGeneration(gen)}
            onChangeBodyType={(bt) => setBodyType(bt)}
            onChangeYear={(y) => setYear(y)}
            onChangeEngine={(eng) => setEngine(eng)}
            onChangeFuelType={(f) => setFuelType(f)}
            onChangeTransmission={(tr) => setTransmission(tr)}
            onChangeDriveType={(dt) => setDriveType(dt)}
          />

          {/* Row 2: License Plate & VIN Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* License Plate (Configured only once when adding vehicle) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-neutral-700">
                  Госномер автомобиля
                </label>
                {mode === "edit" ? (
                  <span className="text-[10px] text-neutral-500 bg-neutral-200/80 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-neutral-500" />
                    Зафиксирован
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                    При создании авто
                  </span>
                )}
              </div>
              <div className="relative">
                {mode === "add" ? (
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    placeholder="О 742 УМ 197 или М777ММ 777"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-none focus:border-red-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={currentVehicle?.licensePlate || "Без госномера"}
                    readOnly
                    disabled
                    title="Госномер зафиксирован при регистрации автомобиля"
                    className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-neutral-600 cursor-not-allowed"
                  />
                )}
              </div>
            </div>

            {/* VIN Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-neutral-700 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-neutral-500" />
                  <span>VIN-номер (17 символов)</span>
                </label>
                <span className={`text-[10px] font-mono ${vin.length === 17 ? "text-emerald-600 font-bold" : "text-neutral-400"}`}>
                  {vin.length}/17
                </span>
              </div>
              <input
                type="text"
                maxLength={17}
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="JN1TBNT31U0048123"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-none focus:border-red-500"
              />
              {vin && (
                <div className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
                  <span>{decodeVinOrigin(vin)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Year, Transmission, Drive Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Год выпуска <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1970"
                max="2030"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                required
              />
            </div>
            <div>
              <label htmlFor="vehiclemodal-field-1" className="block font-semibold text-neutral-700 mb-1">
                Трансмиссия (КПП)
              </label>
              <ModernSelect
                id="vehiclemodal-field-1"
                value={transmission}
                onChange={setTransmission}
                options={transmissionOptions}
                placeholder="Выберите трансмиссию"
              />
            </div>
            <div>
              <label htmlFor="vehiclemodal-field-2" className="block font-semibold text-neutral-700 mb-1">
                Привод
              </label>
              <ModernSelect
                id="vehiclemodal-field-2"
                value={driveType}
                onChange={setDriveType}
                options={driveOptions}
                placeholder="Выберите привод"
              />
            </div>
          </div>

          {/* Row 5: Engine, Fuel, Mileage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Двигатель <span className="text-red-500">*</span>
              </label>
              <ModernSelect
                value={engine}
                onChange={setEngine}
                options={engineOptions}
                placeholder="Выберите двигатель"
                required
                id="vehiclemodal-field-engine"
              />
            </div>
            <div>
              <label htmlFor="vehiclemodal-field-3" className="block font-semibold text-neutral-700 mb-1">
                Топливо
              </label>
              <ModernSelect
                id="vehiclemodal-field-3"
                value={fuelType}
                onChange={setFuelType}
                options={fuelOptions}
                placeholder="Выберите топливо"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Текущий пробег (км) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={mileage}
                onChange={(e) => setMileage(Number(e.target.value))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-medium transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition cursor-pointer"
            >
              {mode === "edit" ? "Сохранить параметры" : "Добавить автомобиль в гараж"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};
