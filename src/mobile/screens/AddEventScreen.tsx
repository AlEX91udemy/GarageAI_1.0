import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Wrench,
  Fuel,
  Package,
  AlertTriangle,
  Layers,
  Calendar,
  Gauge,
  DollarSign,
  Building2,
  Camera,
  Plus,
  Trash2,
  Check,
  ScanBarcode,
  QrCode,
  Sparkles,
  CheckCircle2,
  MapPin,
  Tag,
} from "lucide-react";
import { Vehicle, ServiceRecord, FuelRecord, ToFixTask, GaragePart, MaintenanceCategory } from "../../types";
import { QuickActionType, PrefilledScanData } from "../types";
import { BarcodeScannerScreen } from "./BarcodeScannerScreen";

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
    initialPrefilledData?.targetType || initialType
  );

  // Common inputs
  const [title, setTitle] = useState(initialPrefilledData?.title || "");
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
  const [partLocation, setPartLocation] = useState(
    initialPrefilledData?.location || "Склад гаража: Стеллаж A"
  );

  // Scanned badge info
  const [scannedBadge, setScannedBadge] = useState<string | null>(
    initialPrefilledData?.barcode
      ? `Штрихкод: ${initialPrefilledData.barcode}`
      : initialPrefilledData?.vin
      ? `VIN: ${initialPrefilledData.vin}`
      : null
  );

  // Fuel specific
  const [liters, setLiters] = useState("45");
  const [fuelType, setFuelType] = useState("АИ-95");

  // Problem specific
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  // Parts list inside service
  const [parts, setParts] = useState<
    Array<{ name: string; brand: string; sku: string; price: string }>
  >(() => {
    if (initialPrefilledData?.name && initialPrefilledData.partNumber) {
      return [
        {
          name: initialPrefilledData.name,
          brand: initialPrefilledData.brand || "OEM",
          sku: initialPrefilledData.partNumber,
          price: String(initialPrefilledData.price || 1500),
        },
      ];
    }
    return [];
  });

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
      if (initialPrefilledData.location) setPartLocation(initialPrefilledData.location);
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
      if (scanned.location) setPartLocation(scanned.location);
      if (scanned.description) setNotes(scanned.description);
    } else {
      // Service or Repair
      setEventType("service");
      if (scanned.title) setTitle(scanned.title);
      if (scanned.category) setCategory(scanned.category);
      if (scanned.laborCost) setLaborCost(String(scanned.laborCost));
      if (scanned.totalCost) setCost(String(scanned.totalCost));
      if (scanned.description) setNotes(scanned.description);

      // Append scanned part to parts list
      if (scanned.name && scanned.partNumber) {
        setParts((prev) => [
          ...prev,
          {
            name: scanned.name!,
            brand: scanned.brand || "OEM",
            sku: scanned.partNumber!,
            price: String(scanned.price || 0),
          },
        ]);
      }
    }
  };

  const handleOpenScanner = (target: "part" | "service") => {
    setScannerTargetMode(target);
    setIsScannerModalOpen(true);
  };

  const handleAddPartRow = () => {
    setParts((prev) => [
      ...prev,
      { name: "Масляный фильтр", brand: "Mann-Filter", sku: "W67/1", price: "750" },
    ]);
  };

  const handleRemovePartRow = (index: number) => {
    setParts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const numMileage = parseInt(mileage, 10) || vehicle.currentMileage;
    const numCost = parseFloat(cost) || 0;
    const numLabor = parseFloat(laborCost) || Math.round(numCost * 0.4);

    if (eventType === "fuel") {
      const numLiters = parseFloat(liters) || 40;
      onSaveFuel?.({
        vehicleId: vehicle.id,
        date,
        mileage: numMileage,
        liters: numLiters,
        pricePerLiter: numCost && numLiters ? Math.round(numCost / numLiters) : 58,
        totalCost: numCost,
        fuelType,
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
        location: partLocation || "Склад гаража: Полка A1",
      });
    } else {
      // Default: Service or Repair
      const finalTitle =
        title ||
        (eventType === "repair"
          ? "Ремонт узла"
          : eventType === "expense"
          ? "Прочий расход"
          : "Плановое ТО");

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
            : "Работы внесены через мобильный GarageHub"),
        serviceCenter: location || "Автосервис",
        parts: (parts || []).map((p, idx) => ({
          id: `pt-${Date.now()}-${idx}`,
          name: p.name,
          brand: p.brand,
          partNumber: p.sku,
          quantity: 1,
          unitPrice: parseFloat(p.price) || 0,
        })),
      });
    }

    onBack?.();
  };

  return (
    <div className="flex flex-col w-full pb-10 bg-neutral-100 text-neutral-900 select-none relative min-h-full">
      {/* FULLSCREEN CAMERA SCANNER OVERLAY MODAL */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
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
            ? "Добавить запчасть"
            : eventType === "service"
            ? "Добавить услугу (ТО)"
            : "Добавить событие"}
        </span>

        <button
          onClick={handleSave}
          className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-md shadow-red-600/30"
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

        {/* Event Type selector pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "service", label: "Обслуживание (ТО)", icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: "part", label: "Запчасть на склад", icon: <Package className="w-3.5 h-3.5" /> },
            { id: "repair", label: "Ремонт", icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: "fuel", label: "Заправка", icon: <Fuel className="w-3.5 h-3.5" /> },
            { id: "problem", label: "Проблема (To-Fix)", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setEventType(item.id as QuickActionType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                eventType === item.id
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-900"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* PROMINENT CAMERA BARCODE / QR SCAN TRIGGER BANNER */}
        <div className="p-3.5 rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-800 text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
              <ScanBarcode className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Камера-сканер штрихкодов</span>
                <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.2 rounded font-mono font-bold">
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
            className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 shrink-0 cursor-pointer active:scale-95 transition"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Сканировать</span>
          </button>
        </div>

        {/* -------------------- FORM 1: ADD PART (Запчасть на склад) -------------------- */}
        {eventType === "part" ? (
          <div className="p-4 rounded-3xl bg-white border border-neutral-200/90 shadow-xs space-y-3.5">
            {/* Part Name */}
            <div>
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                Наименование детали
              </label>
              <input
                type="text"
                placeholder="Например: Масляный фильтр двигателя"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 font-bold"
              />
            </div>

            {/* Brand & Part Number / SKU with Scan button */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Производитель / Бренд
                </label>
                <input
                  type="text"
                  placeholder="Mann-Filter, Brembo, OEM..."
                  value={partBrand}
                  onChange={(e) => setPartBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide block">
                    Артикул / SKU
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenScanner("part")}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <ScanBarcode className="w-3 h-3" />
                    <span>Скан</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="W67/1 или 15208-9F60A"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 font-mono font-bold"
                />
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
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500"
              >
                <option value="ТО и замена жидкостей">ТО и замена жидкостей</option>
                <option value="Двигатель">Двигатель</option>
                <option value="Тормозная система">Тормозная система</option>
                <option value="Подвеска и рулевое">Подвеска и рулевое</option>
                <option value="Трансмиссия">Трансмиссия</option>
                <option value="Система охлаждения">Система охлаждения</option>
                <option value="Электрика и датчики">Электрика и датчики</option>
                <option value="Кузов и стекла">Кузов и стекла</option>
                <option value="Другое">Другое</option>
              </select>
            </div>

            {/* Price & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Цена покупки (₽)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="0"
                    value={partPrice}
                    onChange={(e) => setPartPrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 font-mono font-bold"
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
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 font-mono font-bold text-center"
                />
              </div>
            </div>

            {/* Storage Location in Garage */}
            <div>
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                Место хранения в гараже
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Стеллаж A • Полка 2 или Багажник"
                  value={partLocation}
                  onChange={(e) => setPartLocation(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500"
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
                className="w-full p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 resize-none"
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
                {(eventType === "service" || eventType === "repair") && (
                  <button
                    type="button"
                    onClick={() => handleOpenScanner("service")}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Сканировать VIN/Деталь</span>
                  </button>
                )}
              </div>
              <input
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
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 font-bold"
              />
            </div>

            {/* Category for service/repair */}
            {(eventType === "service" || eventType === "repair") && (
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Категория работ
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500"
                >
                  <option value="ТО и замена жидкостей">ТО и замена жидкостей</option>
                  <option value="Двигатель">Двигатель</option>
                  <option value="Тормозная система">Тормозная система</option>
                  <option value="Подвеска и рулевое">Подвеска и рулевое</option>
                  <option value="Трансмиссия">Трансмиссия</option>
                  <option value="Система охлаждения">Система охлаждения</option>
                  <option value="Электрика и датчики">Электрика и датчики</option>
                  <option value="Кузов и стекла">Кузов и стекла</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>
            )}

            {/* Date & Mileage */}
            <div className="grid grid-cols-2 gap-3">
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Пробег (км)
                </label>
                <div className="relative">
                  <Gauge className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Cost & Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  Итоговая стоимость (₽)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1 block">
                  {eventType === "fuel" ? "АЗС" : "Автосервис / Место"}
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={eventType === "fuel" ? "Газпромнефть" : "Гараж / ПроСТО"}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Fuel-specific: Liters */}
            {eventType === "fuel" && (
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <span className="text-xs text-neutral-600 font-medium">Объем заправки:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    className="w-20 px-2 py-1 rounded-xl bg-white border border-neutral-300 text-neutral-900 font-mono text-center text-xs font-bold"
                  />
                  <span className="text-xs text-neutral-500">литров</span>
                </div>
              </div>
            )}

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
                className="w-full p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-900 text-xs focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            {/* Installed parts in service form with camera scan button */}
            {(eventType === "service" || eventType === "repair") && (
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-neutral-800">
                      Установленные запчасти ({parts.length})
                    </span>
                    <p className="text-[10px] text-neutral-500">
                      Привязываются к записи обслуживания
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenScanner("service")}
                      className="px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-[10px] font-bold text-red-600 hover:bg-red-100 flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <ScanBarcode className="w-3 h-3" />
                      <span>Сканировать</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPartRow}
                      className="px-2 py-1 rounded-lg bg-white border border-neutral-200 text-[10px] font-bold text-neutral-700 hover:bg-neutral-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Добавить</span>
                    </button>
                  </div>
                </div>

                {parts.length === 0 ? (
                  <div className="text-[11px] text-neutral-400 py-2 text-center bg-white rounded-xl border border-dashed border-neutral-200">
                    Запчасти не добавлены. Отсканируйте штрихкод коробки или введите вручную.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {parts.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-neutral-200 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-bold text-neutral-900 truncate">
                            {p.brand} {p.name}
                          </div>
                          <div className="text-[10px] font-mono text-neutral-500">
                            Арт: {p.sku} • {p.price} ₽
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePartRow(idx)}
                          className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit action */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.98] transition cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>
              {eventType === "part"
                ? "Сохранить деталь на склад"
                : "Зафиксировать в бортовом журнале"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
