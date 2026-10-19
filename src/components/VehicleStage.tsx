import { Vehicle } from "../types";
import { VehicleModelRenderer } from "./VehicleModelRenderer";

export function VehicleStage({ vehicle, onColorChange: _onColorChange, onModelChange: _onModelChange }: {
  vehicle: Vehicle;
  onColorChange?: (color: string) => void;
  onModelChange?: (url: string) => void;
}) {
  return (
    <section className="vehicle-stage" aria-label={`Внешний вид ${vehicle.make} ${vehicle.model}`}>
      <div className="vehicle-stage-toolbar">
        <span className="text-sm font-semibold">Автомобиль</span>
      </div>
      <VehicleModelRenderer key={`${vehicle.id}-${vehicle.colorHex || "default"}`} vehicle={vehicle} />
    </section>
  );
}
