import { useModalFocus } from "./useModalFocus";
import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Camera,
  Package,
  Wrench,
  DollarSign,
  Calendar,
  Gauge,
  Store,
  CheckCircle,
} from "lucide-react";
import {
  Vehicle,
  ServiceRecord,
  PartItem,
  MaintenanceCategory,
  GaragePart,
  ToFixTask,
} from "../types";
import { SAMPLE_RECEIPT_IMAGE } from "../mockData";

interface AddServiceModalProps {
  vehicle: Vehicle;
  garageParts: GaragePart[];
  toFixTasks: ToFixTask[];
  onClose: () => void;
  onSave: (record: ServiceRecord, usedPartIds?: string[], completedTaskId?: string) => void;
  initialData?: Partial<ServiceRecord>;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  vehicle,
  garageParts,
  toFixTasks,
  onClose,
  onSave,
  initialData,
}) => {
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split("T")[0]
  );
  const [mileage, setMileage] = useState(
    initialData?.mileage || vehicle.currentMileage
  );
  const [category, setCategory] = useState<MaintenanceCategory>(
    initialData?.category || "ТО и замена жидкостей"
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [serviceCenter, setServiceCenter] = useState(
    initialData?.serviceCenter || "Собственными силами / Гараж"
  );
  const [laborCost, setLaborCost] = useState(initialData?.laborCost || 0);
  const [receiptImage, setReceiptImage] = useState<string | null>(
    initialData?.receiptImages?.[0] || null
  );

  // Parts list
  const [parts, setParts] = useState<PartItem[]>(
    initialData?.parts || [
      {
        id: "p-" + crypto.randomUUID(),
        name: "",
        brand: "",
        partNumber: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]
  );

  // Optional link to To-Fix and Garage parts
  const [selectedToFixId, setSelectedToFixId] = useState<string>("");
  const [selectedGaragePartId, setSelectedGaragePartId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const availableGarageParts = garageParts.filter(
    (gp) => (gp.vehicleId === vehicle.id || gp.vehicleId === "all") && gp.status === "in_stock"
  );

  const pendingToFix = toFixTasks.filter(
    (tf) => tf.vehicleId === vehicle.id && tf.status !== "completed"
  );

  const addPartRow = () => {
    setParts((prev) => [
      ...prev,
      {
        id: "p-" + crypto.randomUUID(),
        name: "",
        brand: "",
        partNumber: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removePartRow = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePartRow = (id: string, field: keyof PartItem, value: any) => {
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Add part directly from Garage Inventory
  const handleAddFromGarage = (partId: string) => {
    const gp = availableGarageParts.find((p) => p.id === partId);
    if (!gp) return;

    setParts((prev) => [
      ...prev.filter((p) => p.name.trim() !== ""),
      {
        id: "gp-" + gp.id,
        name: gp.name,
        brand: gp.brand,
        partNumber: gp.partNumber,
        quantity: 1,
        unitPrice: gp.purchasePrice,
      },
    ]);
    setSelectedGaragePartId("");
  };

  // When user selects a To-Fix task, pre-fill title and description
  const handleSelectToFix = (taskId: string) => {
    setSelectedToFixId(taskId);
    const task = pendingToFix.find((t) => t.id === taskId);
    if (task) {
      if (!title) setTitle(task.title);
      if (!description && task.description) setDescription(task.description);
      if (task.category) setCategory(task.category);
    }
  };

  const partsCost = parts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
  const totalCost = Number(laborCost) + partsCost;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Пожалуйста, введите название работ или ТО.");
      return;
    }
    setFormError(null);

    const cleanParts = parts.filter((p) => p.name.trim() !== "");

    // Recover the original garage part ids from parts that were added
    // from the garage inventory (their ids carry exactly one "gp-" prefix,
    // which we strip to get the real part id for the install API).
    const usedGaragePartIds = cleanParts
      .filter((p) => p.id.startsWith("gp-"))
      .map((p) => p.id.replace(/^gp-/, ""));

    const newRecord: ServiceRecord = {
      id: initialData?.id || `rec-${crypto.randomUUID()}`,
      vehicleId: vehicle.id,
      date,
      mileage: Number(mileage),
      category,
      title: title.trim(),
      description: description.trim() || title.trim(),
      laborCost: Number(laborCost),
      parts: cleanParts,
      totalCost,
      serviceCenter: serviceCenter.trim(),
      receiptImages: receiptImage ? [receiptImage] : [],
      notes: "Запись сохранена в дневнике обслуживания.",
    };

    onSave(
      newRecord,
      usedGaragePartIds.length > 0 ? usedGaragePartIds : undefined,
      selectedToFixId || undefined
    );
  };

  const dialogRef = useModalFocus(onClose);

  return (
    <div
      ref={dialogRef} role="dialog" aria-modal="true" aria-label="Запись ремонта и ТО" tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-neutral-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-neutral-100 shrink-0 bg-white flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-brand-strong uppercase tracking-wider">
              {vehicle.make} {vehicle.model} • {vehicle.year}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
              {initialData ? "Редактировать запись ремонта" : "Новая запись ремонта / ТО"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link to To-Fix task if available */}
          {pendingToFix.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 text-xs">
              <label htmlFor="addservicemodal-field-1" className="block font-semibold text-amber-900 mb-1">
                Связать со списком задач To-Fix:
              </label>
              <select id="addservicemodal-field-1"
                value={selectedToFixId}
                onChange={(e) => handleSelectToFix(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-neutral-800"
              >
                <option value="">-- Не выбрано (новая работа) --</option>
                {pendingToFix.map((tf) => (
                  <option key={tf.id} value={tf.id}>
                    [{tf.priority.toUpperCase()}] {tf.title} (~{tf.estimatedCost || 0} ₽)
                  </option>
                ))}
              </select>
              {selectedToFixId && (
                <p className="text-[11px] text-amber-800 mt-1">
                  ✓ Задача автоматически отметится как выполненная.
                </p>
              )}
            </div>
          )}

          {/* Primary Row: Date, Mileage, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="addservicemodal-field-2" className="block text-xs font-semibold text-neutral-700 mb-1">
                Дата обслуживания
              </label>
              <input id="addservicemodal-field-2"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div>
              <label htmlFor="addservicemodal-field-3" className="block text-xs font-semibold text-neutral-700 mb-1">
                Пробег (км)
              </label>
              <input id="addservicemodal-field-3"
                type="number"
                min="0"
                step="10"
                value={mileage}
                onChange={(e) => setMileage(Number(e.target.value))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div>
              <label htmlFor="addservicemodal-field-4" className="block text-xs font-semibold text-neutral-700 mb-1">
                Категория
              </label>
              <select id="addservicemodal-field-4"
                value={category}
                onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-brand"
              >
                <option value="ТО и замена жидкостей">ТО и замена жидкостей</option>
                <option value="Двигатель">Двигатель</option>
                <option value="Трансмиссия и сцепление">Трансмиссия и сцепление</option>
                <option value="Подвеска и рулевое">Подвеска и рулевое</option>
                <option value="Тормозная система">Тормозная система</option>
                <option value="Электрика и датчики">Электрика и датчики</option>
                <option value="Выхлопная система">Выхлопная система</option>
                <option value="Кузов и стекла">Кузов и стекла</option>
                <option value="Шины и диски">Шины и диски</option>
                <option value="Другое">Другое</option>
              </select>
            </div>
          </div>

          {/* Title & Service Center */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="addservicemodal-field-5" className="block text-xs font-semibold text-neutral-700 mb-1">
                Заголовок / Краткое наименование
              </label>
              <input id="addservicemodal-field-5"
                type="text"
                placeholder="например: Замена масла ДВС и тормозных колодок"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-brand font-medium"
                required
              />
            </div>

            <div>
              <label htmlFor="addservicemodal-field-6" className="block text-xs font-semibold text-neutral-700 mb-1">
                Сервис / Автомастерская
              </label>
              <input id="addservicemodal-field-6"
                type="text"
                placeholder="Fit Service, Официальный дилер, Гараж..."
                value={serviceCenter}
                onChange={(e) => setServiceCenter(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="addservicemodal-field-7" className="block text-xs font-semibold text-neutral-700 mb-1">
              Подробное описание работ
            </label>
            <textarea id="addservicemodal-field-7"
              rows={2}
              placeholder="Что конкретно менялось, особенности ремонта, смазка суппортов, регулировка..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-brand"
            />
          </div>

          {/* Spare Parts Section */}
          <div className="border border-neutral-200 rounded-2xl p-3.5 bg-neutral-50/50 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                <Package className="w-4 h-4 text-brand-strong" />
                <span>Использованные запчасти (Бренд + Артикулы)</span>
              </div>

              {/* Add from garage shortcut */}
              {availableGarageParts.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs min-w-0 w-full sm:max-w-[50%]">
                  <span className="text-neutral-500 text-[11px]">Из гаража:</span>
                  <select
                    aria-label="Добавить деталь со склада"
                    value={selectedGaragePartId}
                    onChange={(e) => {
                      if (e.target.value) handleAddFromGarage(e.target.value);
                    }}
                    className="min-w-0 flex-1 bg-white border border-neutral-300 rounded-lg px-2 py-1 text-[11px] text-neutral-800"
                  >
                    <option value="">Выбрать со склада...</option>
                    {availableGarageParts.map((gp) => (
                      <option key={gp.id} value={gp.id}>
                        {gp.brand} {gp.name} ({gp.partNumber}) - {gp.purchasePrice} ₽
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Parts table rows */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {parts.map((part, index) => (
                <div
                  key={part.id}
                  className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-neutral-200/80 text-xs"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Деталь (Фильтр масляный...)"
                      value={part.name}
                      onChange={(e) =>
                        updatePartRow(part.id, "name", e.target.value)
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Бренд (Mann, Motul)"
                      value={part.brand}
                      onChange={(e) =>
                        updatePartRow(part.id, "brand", e.target.value)
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Артикул / SKU"
                      value={part.partNumber}
                      onChange={(e) =>
                        updatePartRow(part.id, "partNumber", e.target.value)
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="Кол"
                      aria-label={`Количество детали ${index + 1}`}
                      value={part.quantity}
                      onChange={(e) =>
                        updatePartRow(
                          part.id,
                          "quantity",
                          Math.max(1, Number(e.target.value))
                        )
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs text-center font-mono"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      placeholder="Цена ₽"
                      aria-label={`Цена детали ${index + 1}, рублей`}
                      value={part.unitPrice}
                      onChange={(e) =>
                        updatePartRow(
                          part.id,
                          "unitPrice",
                          Number(e.target.value)
                        )
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 text-right">
                    <button
                      aria-label={`Убрать деталь ${index + 1} из записи`}
                      type="button"
                      onClick={() => removePartRow(part.id)}
                      className="p-1 text-neutral-400 hover:text-brand-strong rounded-md transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPartRow}
              className="text-xs font-semibold text-brand-strong hover:text-brand-hover flex items-center gap-1 cursor-pointer pt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Добавить ещё деталь
            </button>
          </div>

          {/* Labor Cost & Total Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
            <div>
              <label htmlFor="addservicemodal-field-8" className="block text-xs font-semibold text-neutral-700 mb-1">
                Стоимость работ сервиса (₽)
              </label>
              <input id="addservicemodal-field-8"
                type="number"
                min="0"
                step="100"
                value={laborCost}
                onChange={(e) => setLaborCost(Number(e.target.value))}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-brand"
              />
            </div>

            <div className="flex flex-col justify-center text-right pr-2">
              <div className="text-[11px] text-neutral-500">
                Детали: {partsCost.toLocaleString("ru-RU")} ₽ + Работы: {Number(laborCost).toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-lg font-extrabold text-brand-strong font-mono mt-0.5">
                Итого: {totalCost.toLocaleString("ru-RU")} ₽
              </div>
            </div>
          </div>

          {/* Receipt Attachment / Photo */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-neutral-500" />
              <span>Фото чека или заказ-наряда</span>
            </label>

            {receiptImage ? (
              <div className="flex items-center gap-3 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200">
                <img
                  width={112}
                  height={112}
                  src={receiptImage}
                  alt="Чек"
                  className="w-14 h-14 object-cover rounded-xl border border-neutral-300"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-semibold text-neutral-800 truncate">
                    Чек прикреплен к записи
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    Будет сохранен в истории ремонта
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptImage(null)}
                  className="text-xs text-brand-strong hover:text-brand-hover font-semibold p-1"
                >
                  Удалить
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl cursor-pointer transition flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Выбрать фото / чек</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setReceiptImage(SAMPLE_RECEIPT_IMAGE)}
                  className="px-3 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 text-xs font-medium rounded-xl border border-neutral-200 transition cursor-pointer"
                >
                  Использовать пример заказ-наряда
                </button>
              </div>
            )}
          </div>

          {formError && (
            <div className="p-3 bg-brand-soft border border-brand-border text-brand-hover text-xs rounded-xl font-medium">
              {formError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-brand-strong hover:bg-brand rounded-xl transition cursor-pointer shadow-lg shadow-brand-strong/30 active:scale-95"
            >
              Сохранить запись
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};
