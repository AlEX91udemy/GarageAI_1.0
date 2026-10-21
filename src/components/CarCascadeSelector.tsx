import React, { useState, useEffect } from "react";
import {
  Car,
  ChevronDown,
  Layers,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  RotateCcw,
  Check,
  Zap,
} from "lucide-react";
import {
  CAR_CATALOG,
  CarMakeInfo,
  CarModelInfo,
  CarGenerationInfo,
  CarBodyType,
  BODY_TYPE_LABELS,
  findMake,
  findModel,
  findGeneration,
  getModelBodyTypes,
} from "../carCatalog";

const STANDARD_BODY_TYPES: CarBodyType[] = [
  "sedan",
  "hatchback",
  "wagon",
  "suv",
  "coupe",
  "convertible",
  "minivan",
  "pickup",
];

export interface CarCascadeSelectorProps {
  make: string;
  model: string;
  generation: string;
  bodyType: CarBodyType;
  year: number;
  engine?: string;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  onChangeMake?: (make: string) => void;
  onChangeModel?: (model: string) => void;
  onChangeGeneration?: (gen: string) => void;
  onChangeBodyType?: (bodyType: CarBodyType) => void;
  onChangeYear?: (year: number) => void;
  onChangeEngine?: (engine: string) => void;
  onChangeFuelType?: (fuelType: string) => void;
  onChangeTransmission?: (trans: string) => void;
  onChangeDriveType?: (drive: string) => void;
}

export const CarCascadeSelector: React.FC<CarCascadeSelectorProps> = ({
  make,
  model,
  generation,
  bodyType,
  year,
  engine = "",
  fuelType = "",
  transmission = "",
  driveType = "",
  onChangeMake,
  onChangeModel,
  onChangeGeneration,
  onChangeBodyType,
  onChangeYear,
  onChangeEngine,
  onChangeFuelType,
  onChangeTransmission,
  onChangeDriveType,
}) => {
  // Mode toggles for custom entry
  const [customMakeMode, setCustomMakeMode] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customGenMode, setCustomGenMode] = useState(false);

  // Identify current catalog matches
  const matchedMake = findMake(make);
  const matchedModel = matchedMake ? findModel(make, model) : undefined;
  const matchedGen = matchedMake && matchedModel ? findGeneration(make, model, generation) : undefined;

  // Determine available options in current cascade state
  const availableModels: CarModelInfo[] = matchedMake ? matchedMake.models : [];
  const availableGenerations: CarGenerationInfo[] = matchedModel ? matchedModel.generations : [];

  // Catalog selections only expose body styles recorded for that model/generation.
  const modelBodyTypes = matchedModel ? getModelBodyTypes(matchedModel) : [];
  const availableBodyTypes = (matchedModel ? modelBodyTypes : STANDARD_BODY_TYPES)
    .map((type) => ({ type, label: BODY_TYPE_LABELS[type] }));

  // Sync custom modes if incoming value doesn't match catalog
  useEffect(() => {
    if (make && !matchedMake && !customMakeMode) {
      setCustomMakeMode(true);
    }
  }, [make, matchedMake]);

  useEffect(() => {
    if (model && !matchedModel && !customModelMode && matchedMake) {
      setCustomModelMode(true);
    }
  }, [model, matchedModel, matchedMake]);

  // Handler when user chooses a Make from dropdown
  const handleSelectMake = (makeName: string) => {
    if (makeName === "__custom__") {
      setCustomMakeMode(true);
      return;
    }

    setCustomMakeMode(false);
    setCustomModelMode(false);
    setCustomGenMode(false);
    onChangeMake?.(makeName);

    const m = findMake(makeName);
    if (m && m.models.length > 0) {
      // Auto-cascade to first model of this make
      const firstModel = m.models[0];
      onChangeModel?.(firstModel.name);

      if (firstModel.generations.length > 0) {
        const firstGen = firstModel.generations[0];
        onChangeGeneration?.(firstGen.name);
        const generationBodyTypes = firstGen.bodyTypes.map((body) => body.type);
        if (generationBodyTypes.length > 0) {
          onChangeBodyType?.(generationBodyTypes.includes(firstModel.defaultBodyType)
            ? firstModel.defaultBodyType
            : generationBodyTypes[0]);
        }
        onChangeYear?.(firstGen.defaultYear);
        if (firstGen.engineSuggestions?.[0]) {
          onChangeEngine?.(firstGen.engineSuggestions[0]);
        }
        if (firstGen.transmissionSuggestions?.[0]) {
          onChangeTransmission?.(firstGen.transmissionSuggestions[0]);
        }
        if (firstGen.driveTypeSuggestions?.[0]) {
          onChangeDriveType?.(firstGen.driveTypeSuggestions[0]);
        }
        if (firstGen.fuelTypeSuggestions?.[0]) {
          onChangeFuelType?.(firstGen.fuelTypeSuggestions[0]);
        }
      } else {
        onChangeGeneration?.("");
        const types = getModelBodyTypes(firstModel);
        if (types.length > 0) {
          onChangeBodyType?.(types.includes(firstModel.defaultBodyType) ? firstModel.defaultBodyType : types[0]);
        }
      }
    } else {
      onChangeModel?.("");
      onChangeGeneration?.("");
    }
  };

  // Handler when user chooses a Model from dropdown
  const handleSelectModel = (modelName: string) => {
    if (modelName === "__custom__") {
      setCustomModelMode(true);
      return;
    }

    setCustomModelMode(false);
    setCustomGenMode(false);
    onChangeModel?.(modelName);

    const mod = findModel(make, modelName);
    if (mod) {
      if (mod.generations.length > 0) {
        // Auto-select first generation of this model
        const firstGen = mod.generations[0];
        onChangeGeneration?.(firstGen.name);
        const generationBodyTypes = firstGen.bodyTypes.map((body) => body.type);
        if (generationBodyTypes.length > 0) {
          const nextBodyType = generationBodyTypes.includes(mod.defaultBodyType)
            ? mod.defaultBodyType
            : generationBodyTypes[0];
          onChangeBodyType?.(nextBodyType);
        }
        onChangeYear?.(firstGen.defaultYear);
        if (firstGen.engineSuggestions?.[0]) {
          onChangeEngine?.(firstGen.engineSuggestions[0]);
        }
        if (firstGen.transmissionSuggestions?.[0]) {
          onChangeTransmission?.(firstGen.transmissionSuggestions[0]);
        }
        if (firstGen.driveTypeSuggestions?.[0]) {
          onChangeDriveType?.(firstGen.driveTypeSuggestions[0]);
        }
        if (firstGen.fuelTypeSuggestions?.[0]) {
          onChangeFuelType?.(firstGen.fuelTypeSuggestions[0]);
        }
      } else {
        onChangeGeneration?.("");
        const types = getModelBodyTypes(mod);
        if (types.length > 0) {
          onChangeBodyType?.(types.includes(mod.defaultBodyType) ? mod.defaultBodyType : types[0]);
        }
      }
    }
  };

  // Handler when user chooses a Generation from dropdown
  const handleSelectGeneration = (genName: string, preferredBodyType?: CarBodyType) => {
    if (genName === "__custom__") {
      setCustomGenMode(true);
      return;
    }

    setCustomGenMode(false);
    onChangeGeneration?.(genName);

    const gen = findGeneration(make, model, genName);
    if (gen) {
      const generationBodyTypes = gen.bodyTypes.map((body) => body.type);
      if (generationBodyTypes.length > 0 && (!generationBodyTypes.includes(bodyType) || preferredBodyType)) {
        const defaultBodyType = matchedModel?.defaultBodyType;
        const nextBodyType = preferredBodyType && generationBodyTypes.includes(preferredBodyType)
          ? preferredBodyType
          : defaultBodyType && generationBodyTypes.includes(defaultBodyType)
            ? defaultBodyType
            : generationBodyTypes[0];
        onChangeBodyType?.(nextBodyType);
      }

      // Link: Year default
      onChangeYear?.(gen.defaultYear);

      // Auto-suggest specifications if empty or user wants defaults
      if ((!engine || engine === "2.0L") && gen.engineSuggestions?.[0]) {
        onChangeEngine?.(gen.engineSuggestions[0]);
      }
      if (gen.transmissionSuggestions?.[0]) {
        onChangeTransmission?.(gen.transmissionSuggestions[0]);
      }
      if (gen.driveTypeSuggestions?.[0]) {
        onChangeDriveType?.(gen.driveTypeSuggestions[0]);
      }
      if (gen.fuelTypeSuggestions?.[0]) {
        onChangeFuelType?.(gen.fuelTypeSuggestions[0]);
      }
    }
  };

  // Body type is intentionally independent from generation.
  const handleSelectBodyType = (newBodyType: CarBodyType) => {
    if (matchedModel && matchedGen && !matchedGen.bodyTypes.some((body) => body.type === newBodyType)) {
      const compatibleGeneration = matchedModel.generations.find((gen) =>
        gen.bodyTypes.some((body) => body.type === newBodyType)
      );
      if (compatibleGeneration) {
        handleSelectGeneration(compatibleGeneration.name, newBodyType);
        return;
      }
    }
    onChangeBodyType?.(newBodyType);
  };

  return (
    <div className="space-y-3 bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-200/90 shadow-xs">
      {/* Cascade Link Visual Breadcrumb */}
      <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
          <LinkIcon className="w-3.5 h-3.5 text-brand-strong" />
          <span>Каталог автомобиля: Марка ➔ Модель ➔ Поколение</span>
        </div>
        {matchedGen && (
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600" />
            Поколение выбрано из каталога
          </span>
        )}
      </div>

      {/* Row 1: Linked Make & Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Field 1: Make (Марка) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-neutral-800 text-xs flex items-center gap-1">
              <span>Марка автомобиля</span>
              <span className="text-brand-strong">*</span>
            </label>
            {customMakeMode ? (
              <button
                type="button"
                onClick={() => {
                  setCustomMakeMode(false);
                  if (CAR_CATALOG[0]) handleSelectMake(CAR_CATALOG[0].name);
                }}
                className="text-[10px] text-brand-strong hover:text-brand-hover font-semibold cursor-pointer underline"
              >
                Выбрать из каталога
              </button>
            ) : (
              <span className="text-[10px] text-neutral-400 font-normal">
                {CAR_CATALOG.length} марок в базе
              </span>
            )}
          </div>

          {customMakeMode ? (
            <div className="relative">
              <input
                type="text"
                value={make}
                onChange={(e) => onChangeMake?.(e.target.value)}
                placeholder="Введите марку вручную..."
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand-border"
                required
              />
            </div>
          ) : (
            <div className="relative">
              <select
                value={matchedMake ? matchedMake.name : make ? "__custom__" : ""}
                onChange={(e) => handleSelectMake(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 appearance-none pr-8 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand-border cursor-pointer"
                required
              >
                <option value="" disabled>
                  — Выберите марку автомобиля —
                </option>
                {CAR_CATALOG.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.flag} {m.name}
                  </option>
                ))}
                <option value="__custom__">✏️ Другая марка (ввести вручную)...</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Field 2: Model (Модель) - Dynamically restricted to selected Make */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-neutral-800 text-xs flex items-center gap-1">
              <span>Модель</span>
              <span className="text-brand-strong">*</span>
              {matchedMake && (
                <span className="text-[10px] font-normal text-neutral-500">
                  для {matchedMake.name}
                </span>
              )}
            </label>
            {customModelMode ? (
              <button
                type="button"
                onClick={() => {
                  setCustomModelMode(false);
                  if (availableModels.length > 0) handleSelectModel(availableModels[0].name);
                }}
                className="text-[10px] text-brand-strong hover:text-brand-hover font-semibold cursor-pointer underline"
              >
                Выбрать из списка
              </button>
            ) : availableModels.length > 0 ? (
              <span className="text-[10px] text-neutral-400 font-normal">
                {availableModels.length} моделей марки
              </span>
            ) : null}
          </div>

          {customModelMode || !matchedMake ? (
            <div className="relative">
              <input
                type="text"
                value={model}
                onChange={(e) => onChangeModel?.(e.target.value)}
                placeholder={matchedMake ? `Модель ${matchedMake.name}...` : "Сначала выберите марку..."}
                disabled={!make && !customMakeMode}
                className="w-full bg-white border border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand-border"
                required
              />
            </div>
          ) : (
            <div className="relative">
              <select
                value={matchedModel ? matchedModel.name : model ? "__custom__" : ""}
                onChange={(e) => handleSelectModel(e.target.value)}
                disabled={!make}
                className="w-full bg-white border border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 appearance-none pr-8 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand-border cursor-pointer"
                required
              >
                <option value="" disabled>
                  — Выберите модель {matchedMake.name} —
                </option>
                {availableModels.map((mod) => (
                  <option key={mod.name} value={mod.name}>
                    {mod.name}{mod.generations.length > 0 ? ` (${mod.generations.length} пок.)` : ""}
                  </option>
                ))}
                <option value="__custom__">✏️ Другая модель (ввести вручную)...</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Linked Generation & Body Type (Поколение и Кузов) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Field 3: Generation (Поколение) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-neutral-800 text-xs flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>Поколение / Модификация</span>
            </label>
            {customGenMode ? (
              <button
                type="button"
                onClick={() => {
                  setCustomGenMode(false);
                  if (availableGenerations.length > 0) {
                    handleSelectGeneration(availableGenerations[0].name);
                  }
                }}
                className="text-[10px] text-brand-strong hover:text-brand-hover font-semibold cursor-pointer underline"
              >
                Из списка поколений
              </button>
            ) : availableGenerations.length > 0 ? (
              <span className="text-[10px] text-neutral-400 font-normal">
                {availableGenerations.length} вариантов кузова/лет
              </span>
            ) : null}
          </div>

          {customGenMode || availableGenerations.length === 0 ? (
            <input
              type="text"
              value={generation}
              onChange={(e) => onChangeGeneration?.(e.target.value)}
              placeholder="T31, XG10, F30 LCI, NG..."
              className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-brand"
            />
          ) : (
            <div className="relative">
              <select
                value={matchedGen ? matchedGen.name : generation ? "__custom__" : ""}
                onChange={(e) => handleSelectGeneration(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 appearance-none pr-8 focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value="" disabled>
                  — Выберите поколение {model || "автомобиля"} —
                </option>
                {availableGenerations.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
                <option value="__custom__">✏️ Другое поколение (ручной ввод)...</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Field 4: Body Type (Кузов) - Directly linked to Generation & 3D model */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-neutral-800 text-xs flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-neutral-500" />
              <span>Тип кузова</span>
            </label>
            {matchedGen && (
              <span className="text-[10px] text-neutral-500">
                Доступно для выбранной модели
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" role="radiogroup" aria-label="Тип кузова">
            {availableBodyTypes.map((bt) => {
              const selected = bodyType === bt.type;
              return (
                <button
                  key={bt.type}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={bt.label}
                  onClick={() => handleSelectBodyType(bt.type)}
                  className={`rounded-lg border px-3 py-2 text-center transition ${selected ? "border-neutral-900 ring-2 ring-neutral-200 bg-neutral-100" : "border-neutral-200 bg-white hover:border-neutral-400"}`}
                >
                  <span className={`block text-[10px] font-semibold truncate text-center ${selected ? "text-neutral-900" : "text-neutral-700"}`}>{bt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generation Specifications Quick-Fill Chips */}
      {matchedGen && (matchedGen.engineSuggestions || matchedGen.transmissionSuggestions) && (
        <div className="pt-2 border-t border-neutral-200/60 text-[11px]">
          <div className="text-neutral-500 font-medium mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Штатные параметры поколения ({matchedGen.name}):
            </span>
            <span className="text-[10px] text-neutral-400">кликните для быстрой вставки</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Year preset button */}
            {onChangeYear && matchedGen.defaultYear && (
              <button
                type="button"
                onClick={() => onChangeYear?.(matchedGen.defaultYear)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] transition cursor-pointer ${
                  year === matchedGen.defaultYear
                    ? "bg-neutral-900 text-white border-neutral-900 font-bold"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                }`}
                title={`Установить рекомендованный год (${matchedGen.yearLabel})`}
              >
                Год: {matchedGen.defaultYear} ({matchedGen.yearLabel})
              </button>
            )}

            {/* Engine suggestions */}
            {onChangeEngine &&
              matchedGen.engineSuggestions?.map((eng) => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => onChangeEngine?.(eng)}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] transition cursor-pointer ${
                    engine === eng
                      ? "bg-neutral-900 text-white border-neutral-900 font-bold"
                      : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                  }`}
                  title="Подставить данный двигатель"
                >
                  ДВС: {eng.split(" ")[0]} {eng.split(" ")[1] || ""}
                </button>
              ))}

            {/* Transmission suggestions */}
            {onChangeTransmission &&
              matchedGen.transmissionSuggestions?.map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => onChangeTransmission?.(tr)}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] transition cursor-pointer ${
                    transmission === tr
                      ? "bg-neutral-900 text-white border-neutral-900 font-bold"
                      : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                  }`}
                  title="Подставить данную трансмиссию"
                >
                  КПП: {tr.split(" ")[0]}
                </button>
              ))}

            {/* Drive type suggestions */}
            {onChangeDriveType &&
              matchedGen.driveTypeSuggestions?.map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => onChangeDriveType?.(dt)}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] transition cursor-pointer ${
                    driveType === dt
                      ? "bg-neutral-900 text-white border-neutral-900 font-bold"
                      : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                  }`}
                  title="Подставить данный привод"
                >
                  Привод: {dt.split(" ")[0]}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

