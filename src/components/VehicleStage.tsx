import { CAR_PAINT_PRESETS, Vehicle } from "../types";
import { paintPresetToAssetColor } from "../mobile/vehicleVisuals";
import { VehicleModelRenderer } from "./VehicleModelRenderer";

export function VehicleStage({
  vehicle,
  onColorChange,
  onModelChange: _onModelChange,
}: {
  vehicle: Vehicle;
  onColorChange?: (color: string) => void;
  onModelChange?: (url: string) => void;
}) {
  return (
    <section className="vehicle-stage" aria-label={`Внешний вид ${vehicle.make} ${vehicle.model}`}>
      <div className="vehicle-stage-toolbar flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Автомобиль</span>
        {onColorChange && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Цвет кузова">
            {CAR_PAINT_PRESETS.map((preset) => {
              const isSelected =
                paintPresetToAssetColor(vehicle.colorHex) === paintPresetToAssetColor(preset.hex);
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => onColorChange(preset.hex)}
                  title={preset.name}
                  aria-label={`Цвет кузова: ${preset.name}`}
                  aria-pressed={isSelected}
                  className={`!w-5 !h-5 !min-w-0 !min-h-0 !p-0 rounded-full border transition cursor-pointer ${
                    isSelected
                      ? "border-white ring-2 ring-red-500 scale-110"
                      : "border-black/25 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: preset.hex }}
                />
              );
            })}
          </div>
        )}
      </div>
      <VehicleModelRenderer key={`${vehicle.id}-${vehicle.colorHex || "default"}`} vehicle={vehicle} />
    </section>
  );
}
