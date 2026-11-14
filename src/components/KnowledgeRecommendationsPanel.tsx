import React, { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Loader2, RefreshCw, ShieldAlert, Wrench } from "lucide-react";
import { fetchVehicleRecommendations, refreshPublicKnowledgeSources, type VehicleRecommendationResponse } from "../api";
import type { Vehicle } from "../types";

interface KnowledgeRecommendationsPanelProps {
  vehicle: Vehicle;
}

const riskLabel: Record<VehicleRecommendationResponse["recommendations"][number]["risk"], string> = {
  safety: "Безопасность",
  urgent: "Срочно",
  routine: "Планово",
  informational: "Справка",
};

const riskClass: Record<VehicleRecommendationResponse["recommendations"][number]["risk"], string> = {
  safety: "border-red-200 bg-red-50/70 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
  urgent: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  routine: "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
  informational: "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
};

export const KnowledgeRecommendationsPanel: React.FC<KnowledgeRecommendationsPanelProps> = ({ vehicle }) => {
  const [state, setState] = useState<{ loading: boolean; data: VehicleRecommendationResponse | null; error: string | null }>({ loading: true, data: null, error: null });
  const [refreshState, setRefreshState] = useState<{ loading: boolean; message: string | null }>({ loading: false, message: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    fetchVehicleRecommendations(vehicle)
      .then((data) => { if (!cancelled) setState({ loading: false, data, error: null }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, data: null, error: error instanceof Error ? error.message : "Рекомендации временно недоступны" }); });
    return () => { cancelled = true; };
  }, [vehicle.id, vehicle.make, vehicle.model, vehicle.generation, vehicle.engine, vehicle.fuelType, vehicle.currentMileage]);

  const handleRefreshSources = async () => {
    setRefreshState({ loading: true, message: null });
    try {
      const result = await refreshPublicKnowledgeSources();
      const reachable = result.statuses.filter((item) => item.status === "reachable").length;
      setRefreshState({ loading: false, message: "Проверено источников: " + reachable + " из " + result.statuses.length });
    } catch (error) {
      setRefreshState({ loading: false, message: error instanceof Error ? error.message : "Проверка источников недоступна" });
    }
  };

  return (
    <section className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-[#243044] dark:bg-[#17202e]" aria-labelledby="knowledge-recommendations-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong dark:bg-brand/15 dark:text-brand-on-dark">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="knowledge-recommendations-title" className="text-base font-bold text-neutral-900 dark:text-white">Советы по вашей машине</h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Публичные инструкции и правила с указанием источника</p>
          </div>
        </div>
        <button type="button" onClick={handleRefreshSources} disabled={refreshState.loading} className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-brand-strong disabled:cursor-wait disabled:opacity-60" title="Проверить доступность источников">
          <RefreshCw className={refreshState.loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} aria-hidden="true" />
          Источники
        </button>
      </div>
      {refreshState.message && <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400" role="status">{refreshState.message}</p>}

      {state.loading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Загружаем рекомендации…
        </div>
      )}
      {state.error && !state.loading && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300" role="status">
          {state.error}. Остальные функции гаража доступны.
        </div>
      )}
      {!state.loading && !state.error && state.data?.recommendations.length === 0 && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">
          Для этого профиля пока нет подходящих правил. Уточните двигатель, год и пробег, чтобы сузить рекомендации.
        </div>
      )}
      {!state.loading && !state.error && state.data && state.data.recommendations.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {state.data.recommendations.slice(0, 3).map((item) => (
            <article key={item.id} className={riskClass[item.risk] + " rounded-2xl border p-3"}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  {item.risk === "safety" ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Wrench className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                  <h4 className="text-xs font-bold leading-snug">{item.title}</h4>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide">{riskLabel[item.risk]}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed opacity-90">{item.text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] opacity-75">
                <span>{item.applicability}</span>
                {item.sources.slice(0, 2).map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline">
                    {source.publisher}<ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
