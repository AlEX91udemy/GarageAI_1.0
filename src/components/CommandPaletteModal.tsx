import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Wrench,
  Package,
  Car,
  ClipboardCheck,
  Sparkles,
  ScanLine,
  FileText,
  Database,
  Plus,
  Copy,
  Check,
  ArrowRight,
  Layers,
  Wallet,
  X,
} from "lucide-react";
import {
  Vehicle,
  ServiceRecord,
  GaragePart,
  ToFixTask,
  OemScheduleItem,
} from "../types";
import { DialogFrame } from "./DialogFrame";

type SearchFilterCategory = "all" | "parts" | "records" | "tasks" | "actions";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  currentVehicle: Vehicle;
  onSelectVehicle: (vehicle: Vehicle) => void;
  serviceRecords: ServiceRecord[];
  garageParts: GaragePart[];
  toFixTasks: ToFixTask[];
  oemSchedules: OemScheduleItem[];
  onNavigateView: (
    view:
      | "dashboard"
      | "service_log"
      | "oem_schedule"
      | "expenses"
      | "garage_inventory"
      | "tuning"
  ) => void;
  onOpenAddService: () => void;
  onOpenScanReceipt: () => void;
  onOpenAiMechanic: () => void;
  onOpenServiceBook: () => void;
  onOpenBackupModal: () => void;
  onToggleTheme: () => void;
  theme: "light" | "dark";
}

interface SearchResultItem {
  id: string;
  category: SearchFilterCategory;
  title: string;
  subtitle: string;
  meta?: string;
  sku?: string;
  badgeText?: string;
  onSelect: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  currentVehicle,
  onSelectVehicle,
  serviceRecords,
  garageParts,
  toFixTasks,
  oemSchedules,
  onNavigateView,
  onOpenAddService,
  onOpenScanReceipt,
  onOpenAiMechanic,
  onOpenServiceBook,
  onOpenBackupModal,
  onToggleTheme,
  theme,
}) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<SearchFilterCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveCategory("all");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleCopySku = async (e: React.MouseEvent, sku: string) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(sku);
      }
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 1800);
    } catch {
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 1800);
    }
  };

  const allItems = useMemo<SearchResultItem[]>(() => {
    const results: SearchResultItem[] = [];

    // 1. Quick Actions
    results.push(
      {
        id: "act-add-service",
        category: "actions",
        title: "Записать ремонт или ТО",
        subtitle: "Добавить новую запись в сервисный журнал с запчастями",
        meta: "Быстрое действие",
        onSelect: () => {
          onClose();
          onOpenAddService();
        },
      },
      {
        id: "act-scan-receipt",
        category: "actions",
        title: "Сканировать чек или заказ-наряд (OCR)",
        subtitle: "Распознать работы, артикулы деталей и сумму по фото",
        meta: "Быстрое действие",
        onSelect: () => {
          onClose();
          onOpenScanReceipt();
        },
      },
      {
        id: "act-ai-diag",
        category: "actions",
        title: "AI-диагностика по истории автомобиля",
        subtitle: `Разбор симптомов для ${currentVehicle.make} ${currentVehicle.model}`,
        meta: "Инструмент",
        onSelect: () => {
          onClose();
          onOpenAiMechanic();
        },
      },
      {
        id: "act-service-book",
        category: "actions",
        title: "Электронная сервисная книжка и экспорт PDF",
        subtitle: "Официальная выписка по всем работам и печати ТО",
        meta: "Документ",
        onSelect: () => {
          onClose();
          onOpenServiceBook();
        },
      },
      {
        id: "act-backup",
        category: "actions",
        title: "База данных и резервное копирование",
        subtitle: "Экспорт и импорт JSON-архива гаража",
        meta: "Система",
        onSelect: () => {
          onClose();
          onOpenBackupModal();
        },
      },
      {
        id: "act-theme",
        category: "actions",
        title:
          theme === "dark"
            ? "Переключить на светлую тему (Daylight Studio)"
            : "Переключить на тёмную тему (Obsidian Cockpit)",
        subtitle: "Смена оформления интерфейса",
        meta: "Вид",
        onSelect: () => {
          onToggleTheme();
          onClose();
        },
      }
    );

    // 2. Vehicles in Garage
    vehicles.forEach((v) => {
      results.push({
        id: `veh-${v.id}`,
        category: "actions",
        title: `${v.make} ${v.model} ${v.generation || ""}`.trim(),
        subtitle: `Пробег ${v.currentMileage.toLocaleString("ru-RU")} км · ${v.year} г. · ${v.engine}`,
        sku: v.vin,
        meta: v.id === currentVehicle.id ? "Активное авто" : "Переключить авто",
        onSelect: () => {
          onSelectVehicle(v);
          onClose();
        },
      });
    });

    // 3. Garage Parts & Installed Parts (with OEM SKU)
    garageParts.forEach((part) => {
      results.push({
        id: `gpart-${part.id}`,
        category: "parts",
        title: `${part.brand} ${part.name}`,
        subtitle: `${part.status === "in_stock" ? "На складе" : "Установлено"} · ${part.location || "Гараж"} · ${part.purchasePrice.toLocaleString("ru-RU")} ₽`,
        sku: part.partNumber,
        meta: part.category,
        onSelect: () => {
          onClose();
          onNavigateView("garage_inventory");
        },
      });
    });

    serviceRecords
      .filter((r) => r.vehicleId === currentVehicle.id)
      .forEach((rec) => {
        rec.parts.forEach((p) => {
          results.push({
            id: `spart-${rec.id}-${p.id}`,
            category: "parts",
            title: `${p.brand} ${p.name}`,
            subtitle: `Из записи «${rec.title}» от ${rec.date} (${rec.mileage.toLocaleString("ru-RU")} км)`,
            sku: p.partNumber,
            meta: `${p.unitPrice.toLocaleString("ru-RU")} ₽`,
            onSelect: () => {
              onClose();
              onNavigateView("service_log");
            },
          });
        });
      });

    // 4. Service Records
    serviceRecords
      .filter((r) => r.vehicleId === currentVehicle.id)
      .forEach((rec) => {
        const partsSummary =
          rec.parts.length > 0
            ? rec.parts.map((p) => `${p.brand} ${p.partNumber}`).join(", ")
            : "Без артикулов";
        results.push({
          id: `rec-${rec.id}`,
          category: "records",
          title: rec.title,
          subtitle: `${rec.date} · ${rec.mileage.toLocaleString("ru-RU")} км · ${rec.category} · ${partsSummary}`,
          meta: `${rec.totalCost.toLocaleString("ru-RU")} ₽`,
          onSelect: () => {
            onClose();
            onNavigateView("service_log");
          },
        });
      });

    // 5. To-Fix Tasks & OEM Schedule
    toFixTasks
      .filter((t) => t.vehicleId === currentVehicle.id && t.status !== "completed")
      .forEach((task) => {
        results.push({
          id: `task-${task.id}`,
          category: "tasks",
          title: task.title,
          subtitle: `To-Fix · ${task.category} · ${task.description || "Запланированный ремонт"}`,
          meta: task.estimatedCost
            ? `~${task.estimatedCost.toLocaleString("ru-RU")} ₽`
            : "В плане",
          onSelect: () => {
            onClose();
            onNavigateView("garage_inventory");
          },
        });
      });

    oemSchedules
      .filter((s) => s.vehicleId === currentVehicle.id)
      .forEach((oem) => {
        const diff = currentVehicle.currentMileage - (oem.lastDoneKm ?? 0);
        const rem = oem.intervalKm - diff;
        results.push({
          id: `oem-${oem.id}`,
          category: "tasks",
          title: oem.title,
          subtitle: `Регламент ТО каждые ${oem.intervalKm.toLocaleString("ru-RU")} км · ${
            rem <= 0
              ? `Просрочено на ${Math.abs(rem).toLocaleString("ru-RU")} км`
              : `Осталось ${rem.toLocaleString("ru-RU")} км`
          }`,
          meta: oem.category,
          onSelect: () => {
            onClose();
            onNavigateView("oem_schedule");
          },
        });
      });

    return results;
  }, [
    vehicles,
    currentVehicle,
    serviceRecords,
    garageParts,
    toFixTasks,
    oemSchedules,
    theme,
    onClose,
    onOpenAddService,
    onOpenScanReceipt,
    onOpenAiMechanic,
    onOpenServiceBook,
    onOpenBackupModal,
    onToggleTheme,
    onSelectVehicle,
    onNavigateView,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesCat =
        activeCategory === "all" || item.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.meta && item.meta.toLowerCase().includes(q))
      );
    });
  }, [allItems, query, activeCategory]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0
          ? (prev - 1 + filteredItems.length) % filteredItems.length
          : 0
      );
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].onSelect();
    }
  };

  if (!isOpen) return null;

  const filterTabs: { id: SearchFilterCategory; label: string; count: number }[] = [
    { id: "all", label: "Все", count: allItems.length },
    {
      id: "parts",
      label: "Запчасти и артикулы",
      count: allItems.filter((i) => i.category === "parts").length,
    },
    {
      id: "records",
      label: "История ТО",
      count: allItems.filter((i) => i.category === "records").length,
    },
    {
      id: "tasks",
      label: "Регламент и задачи",
      count: allItems.filter((i) => i.category === "tasks").length,
    },
    {
      id: "actions",
      label: "Команды и авто",
      count: allItems.filter((i) => i.category === "actions").length,
    },
  ];

  const getCategoryIcon = (cat: SearchFilterCategory) => {
    switch (cat) {
      case "parts":
        return <Package className="w-4 h-4 text-red-500 shrink-0" />;
      case "records":
        return <Wrench className="w-4 h-4 text-slate-400 shrink-0" />;
      case "tasks":
        return <ClipboardCheck className="w-4 h-4 text-amber-500 shrink-0" />;
      case "actions":
      default:
        return <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
  };

  return (
    <DialogFrame
      label="Глобальный поиск по гаражу, артикулам и командам"
      onClose={onClose}
      backdropClassName="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 p-4 bg-black/75 backdrop-blur-sm"
    >
      <div
        onKeyDown={handleKeyDown}
        className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1f2937] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-[#1f2937]">
          <Search className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по артикулу (SKU), запчасти, работам, VIN или команде..."
            className="w-full bg-transparent border-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              title="Очистить запрос"
            >
              Сброс
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-mono text-slate-500 bg-slate-100 dark:bg-[#1f2937] dark:text-slate-300 rounded-lg hover:bg-slate-200 transition cursor-pointer shrink-0"
            title="Закрыть (Esc)"
          >
            ESC
          </button>
        </div>

        {/* Segmented Category Filter Bar */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-50 dark:bg-[#0b0f17] border-b border-slate-200 dark:border-[#1f2937] overflow-x-auto no-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategory === tab.id
                  ? "bg-slate-900 text-white dark:bg-red-600 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#161f30]"
              }`}
            >
              {tab.label} · {tab.count}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-[#1f2937] flex-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                По запросу «{query}» ничего не найдено
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Попробуйте ввести каталожный номер детали (например, Mann, Brembo), название узла или выберите категорию «Все».
              </p>
            </div>
          ) : (
            filteredItems.slice(0, 25).map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      item.onSelect();
                    }
                  }}
                  className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-slate-100/90 dark:bg-[#161f30]"
                      : "hover:bg-slate-50 dark:hover:bg-[#141c2b]"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5">{getCategoryIcon(item.category)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        {item.sku && (
                          <button
                            type="button"
                            onClick={(e) => handleCopySku(e, item.sku!)}
                            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                            title="Скопировать артикул / код"
                          >
                            <span>{item.sku}</span>
                            {copiedSku === item.sku ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-70" />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.meta && (
                      <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {item.meta}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#0b0f17] border-t border-slate-200 dark:border-[#1f2937] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Навигация</span>
            <span>·</span>
            <span>Enter Открыть</span>
            <span>·</span>
            <span>Клик по артикулу копирует SKU</span>
          </div>
          <span className="font-mono">
            {currentVehicle.make} {currentVehicle.model}
          </span>
        </div>
      </div>
    </DialogFrame>
  );
};
