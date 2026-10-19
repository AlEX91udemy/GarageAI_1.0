import React, { useState } from "react";
import { Car } from "lucide-react";
import { Vehicle } from "../types";
import { findModel } from "../carCatalog";
import { getMobileVehicleVisual } from "../mobile/vehicleVisuals";

export interface VehicleModelSpec {
  id: string;
  make: string;
  model: string;
  bodyType: import("../carCatalog").CarBodyType;
  description: string;
  placeholder?: boolean;
}

const normalize = (value: string | undefined) =>
  (value || "").toLowerCase().replace(/[()]/g, "").replace(/\s+/g, " ").trim();

const BODY_DESCRIPTIONS: Record<VehicleModelSpec["bodyType"], string> = {
  suv: "Кроссовер / SUV",
  sedan: "Седан",
  hatchback: "Хэтчбек",
  coupe: "Купе",
  wagon: "Универсал",
  convertible: "Кабриолет",
  minivan: "Минивэн",
  pickup: "Пикап",
  van: "Фургон (LCV)",
  minibus: "Микроавтобус",
  liftback: "Лифтбек",
  "crossover-coupe": "Кросс-купе",
};

/** The catalog is the source of truth for model identity and body type. */
export function getVehicleModelSpec(vehicle: Pick<Vehicle, "make" | "model" | "bodyType">): VehicleModelSpec | undefined {
  const catalogModel = findModel(vehicle.make, vehicle.model);
  if (!catalogModel) {
    const bodyType = vehicle.bodyType || "suv";
    return {
      id: `generic-${bodyType}`,
      make: vehicle.make,
      model: vehicle.model,
      bodyType,
      description: BODY_DESCRIPTIONS[bodyType],
      placeholder: true,
    };
  }
  const make = normalize(vehicle.make);
  // A model may be offered in multiple body styles. Keep the user's selected
  // body type independent from the model's default catalog style.
  const bodyType = vehicle.bodyType || catalogModel.defaultBodyType;
  return {
    id: `${make}-${normalize(catalogModel.name)}`.replace(/[^a-z0-9]+/g, "-"),
    make: vehicle.make,
    model: catalogModel.name,
    bodyType,
    description: BODY_DESCRIPTIONS[bodyType],
  };
}

const GENERIC_BODY_PATHS: Record<VehicleModelSpec["bodyType"], string> = {
  suv: "M74 245 L92 187 Q101 174 125 171 L171 164 L218 111 Q229 98 252 94 L376 94 Q401 96 416 111 L466 164 L521 174 Q547 180 561 199 L575 245 Z",
  sedan: "M78 245 L97 190 Q105 178 128 174 L181 164 L225 119 Q237 106 258 103 L377 103 Q400 105 416 119 L463 164 L520 175 Q545 181 559 199 L575 245 Z",
  hatchback: "M82 245 L101 187 Q109 176 132 171 L181 160 L224 112 Q237 98 258 96 L365 96 Q387 98 401 112 L450 162 L512 176 Q538 183 554 201 L571 245 Z",
  coupe: "M77 245 L99 190 Q108 178 132 174 L190 163 L240 112 Q253 99 276 96 L386 96 Q409 99 424 113 L469 163 L524 175 Q548 181 562 200 L576 245 Z",
  wagon: "M72 245 L92 187 Q101 174 125 171 L171 164 L214 111 Q224 98 246 94 L390 94 Q414 96 428 111 L474 164 L527 174 Q550 180 565 199 L578 245 Z",
  convertible: "M77 245 L99 190 Q108 178 132 174 L196 163 L239 122 Q252 106 274 103 L371 103 Q394 105 411 121 L453 163 L524 175 Q548 181 562 200 L576 245 Z",
  minivan: "M66 245 L85 177 Q91 160 116 157 L154 153 L179 107 Q185 94 207 91 L395 91 Q417 93 425 107 L451 153 L512 160 Q544 165 565 194 L578 245 Z",
  pickup: "M67 245 L88 190 Q96 177 120 174 L174 164 L216 116 Q228 102 249 99 L382 99 Q403 101 418 115 L461 164 L520 175 Q548 182 565 201 L578 245 Z",
  van: "M70 245 L88 164 Q93 148 117 145 L441 145 Q466 147 477 164 L557 200 L578 245 Z",
  minibus: "M68 245 L86 166 Q92 150 116 147 L443 147 Q468 149 479 166 L558 201 L578 245 Z",
  liftback: "M76 245 L97 188 Q106 176 130 173 L183 162 L228 112 Q240 99 262 97 L382 97 Q405 99 420 112 L466 162 L523 174 Q548 181 562 200 L576 245 Z",
  "crossover-coupe": "M70 245 L91 187 Q100 173 125 169 L181 159 L231 108 Q244 95 267 92 L382 92 Q406 95 422 109 L469 159 L527 171 Q551 178 566 197 L579 245 Z",
};

const GENERIC_WINDOW_PATHS: Record<VehicleModelSpec["bodyType"], string> = {
  suv: "M197 159 L235 116 Q242 108 258 107 L371 107 Q390 108 402 119 L441 160 Z",
  sedan: "M205 159 L239 122 Q247 112 262 111 L373 111 Q391 112 403 123 L437 159 Z",
  hatchback: "M199 155 L236 116 Q245 106 260 105 L355 105 Q374 106 388 117 L428 157 Z",
  coupe: "M207 159 L250 116 Q260 106 278 103 L379 103 Q397 105 411 118 L443 160 Z",
  wagon: "M194 159 L229 116 Q237 106 252 104 L383 104 Q401 105 414 117 L449 159 Z",
  convertible: "M204 160 L243 123 Q253 111 270 109 L373 109 Q392 110 406 122 L438 160 Z",
  minivan: "M174 150 L193 108 Q198 100 210 99 L393 99 Q407 101 414 111 L436 151 Z",
  pickup: "M195 160 L232 116 Q241 106 257 104 L380 104 Q398 105 412 117 L445 160 Z",
  van: "M113 143 L445 143 L478 174 L143 174 Z",
  minibus: "M113 145 L445 145 L477 174 L143 174 Z",
  liftback: "M202 158 L241 116 Q249 106 264 104 L377 104 Q395 105 409 117 L441 159 Z",
  "crossover-coupe": "M197 155 L243 110 Q253 100 270 98 L379 98 Q398 100 412 112 L448 155 Z",
};

function GenericVehiclePlaceholder({ vehicle, bodyType, color }: {
  vehicle: Vehicle;
  bodyType: VehicleModelSpec["bodyType"];
  color: string;
}) {
  const bodyPath = GENERIC_BODY_PATHS[bodyType];
  const windowPath = GENERIC_WINDOW_PATHS[bodyType];
  const label = `${vehicle.make} ${vehicle.model}, заглушка кузова: ${BODY_DESCRIPTIONS[bodyType]}`;
  return (
    <div className="vehicle-model-renderer vehicle-model-renderer--placeholder" data-visual-model={`generic-${bodyType}`} data-body-type={bodyType}>
      <svg viewBox="0 0 640 360" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`placeholder-${bodyType}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.96" />
            <stop offset="0.52" stopColor={color} />
            <stop offset="1" stopColor="#05070b" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`placeholder-${bodyType}-glass`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b9d9ec" stopOpacity="0.72" />
            <stop offset="1" stopColor="#0b1420" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill="transparent" />
        <ellipse cx="325" cy="267" rx="245" ry="22" fill="#05070b" opacity="0.7" />
        <path d={bodyPath} fill={`url(#placeholder-${bodyType}-body)`} stroke="#dbeafe" strokeOpacity="0.35" strokeWidth="3" />
        <path d={windowPath} fill={`url(#placeholder-${bodyType}-glass)`} stroke="#dbeafe" strokeOpacity="0.35" strokeWidth="3" />
        <path d="M319 108 L319 160" stroke="#dbeafe" strokeOpacity="0.35" strokeWidth="3" />
        <path d="M101 205 Q320 173 548 205" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="5" />
        <path d="M91 228 Q320 205 566 228" fill="none" stroke="#020408" strokeOpacity="0.58" strokeWidth="8" />
        {[155, 485].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="245" r="39" fill="#05070b" stroke="#9ca3af" strokeWidth="5" />
            <circle cx={cx} cy="245" r="19" fill="#d1d5db" stroke="#475569" strokeWidth="5" />
            <circle cx={cx} cy="245" r="6" fill="#334155" />
          </g>
        ))}
        <text x="320" y="321" textAnchor="middle" fill="#cbd5e1" fontSize="16" fontFamily="sans-serif" opacity="0.78">
          {BODY_DESCRIPTIONS[bodyType]} · универсальная модель
        </text>
      </svg>
    </div>
  );
}

function hexToRgb(hex: string) {
  const value = hex.slice(1);
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function colorMatrixFor(hex: string) {
  const [red, green, blue] = hexToRgb(hex);
  const luminance = [0.2126, 0.7152, 0.0722];
  return [
    ...luminance.map((channel) => channel * red), 0, 0,
    ...luminance.map((channel) => channel * green), 0, 0,
    ...luminance.map((channel) => channel * blue), 0, 0,
    0, 0, 0, 1, 0,
  ].join(" ");
}

function MissingVisual({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="vehicle-stage-placeholder" role="status">
      <Car size={64} strokeWidth={1.2} aria-hidden="true" />
      <p>Изображение недоступно: {vehicle.make} {vehicle.model}</p>
    </div>
  );
}

/** Renders the user's standardized body-type template for every vehicle. */
export function VehicleModelRenderer({ vehicle, className = "" }: { vehicle: Vehicle; className?: string }) {
  const spec = getVehicleModelSpec(vehicle);
  const visual = getMobileVehicleVisual(vehicle);
  const [failed, setFailed] = useState(false);
  const color = /^#[0-9a-f]{6}$/i.test(vehicle.colorHex || "") ? vehicle.colorHex! : "#dc2626";

  if (!spec) return <MissingVisual vehicle={vehicle} />;
  if (!visual.src) {
    return <GenericVehiclePlaceholder vehicle={vehicle} bodyType={spec.bodyType} color={color} />;
  }
  if (failed) return <MissingVisual vehicle={vehicle} />;

  const uid = `${spec.id}-${vehicle.id}`.replace(/[^a-z0-9-]/gi, "-");
  const maskId = `${uid}-body-mask`;
  const filterId = `${uid}-paint-filter`;

  return (
    <div
      className={`vehicle-model-renderer ${className}`}
      data-visual-model={spec.id}
      data-visual-src={visual.src}
      data-body-mask-src={visual.paintMaskSrc || ""}
    >
      <svg viewBox="0 0 640 360" role="img" aria-label={`${vehicle.make} ${vehicle.model}, ${spec.description}`}>
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={colorMatrixFor(color)} />
          </filter>
          {visual.paintMaskSrc && (
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="640" height="360" style={{ maskType: "alpha" }}>
              <image href={visual.paintMaskSrc} x="0" y="0" width="640" height="360" preserveAspectRatio="none" />
            </mask>
          )}
        </defs>
        <image
          data-vehicle-layer="original"
          href={visual.src}
          x="0"
          y="0"
          width="640"
          height="360"
          preserveAspectRatio="xMidYMax meet"
          style={{ overflow: "visible" }}
          onError={() => setFailed(true)}
        />
        {visual.paintMaskSrc && (
          <image
            data-vehicle-layer="painted-body"
            href={visual.src}
            x="0"
            y="0"
            width="640"
            height="360"
            preserveAspectRatio="xMidYMax meet"
            style={{ overflow: "visible" }}
            filter={`url(#${filterId})`}
            mask={`url(#${maskId})`}
            onError={() => setFailed(true)}
          />
        )}
      </svg>
    </div>
  );
}
