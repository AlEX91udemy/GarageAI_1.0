import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Maximize2,
  Minimize2,
  Lightbulb,
  Eye,
  Lock,
  Upload,
  RotateCcw,
  Sparkles,
  Box,
  Loader2,
  FileDown,
  ChevronDown,
  Check,
  Layers,
  Car,
  X,
} from "lucide-react";
import { Vehicle } from "../types";
import { ErrorBoundary } from "./ErrorBoundary";

export interface Builtin3dModel {
  id: string;
  name: string;
  badge: string;
  description: string;
  url: string;
  category: "suv" | "sedan" | "hatchback" | "coupe";
}

export const BUILTIN_3D_MODELS: Builtin3dModel[] = [
  {
    id: "xtrail-t31",
    name: "Nissan X-Trail T31",
    badge: "Внедорожник",
    description: "Рейлинги с фарами-прожекторами, решётка V-motion, задние вертикальные фонари",
    url: "/models/nissan_xtrail_t31.glb",
    category: "suv",
  },
  {
    id: "bmw-e46",
    name: "BMW 3 Series",
    badge: "Седан",
    description: "Двойные ноздри, ангельские глазки, рельефный капот, сдвоенный выхлоп",
    url: "/models/bmw_3_e46.glb",
    category: "sedan",
  },
  {
    id: "vw-golf-mk7",
    name: "Volkswagen Golf Mk7",
    badge: "Хэтчбек",
    description: "Широкая задняя стойка, спойлер на крыше, угловая LED-оптика",
    url: "/models/vw_golf_mk7.glb",
    category: "hatchback",
  },
  {
    id: "car-concept",
    name: "Khronos Car Concept (Демо)",
    badge: "Концепт",
    description: "Спортивный концепт-кар Gran Turismo для демонстрации PBR шейдеров",
    url: "/models/car_concept.glb",
    category: "coupe",
  },
  {
    id: "ferrari",
    name: "Ferrari FXX-K (Демо)",
    badge: "Спорткар",
    description: "Гоночный гиперкар с развитым карбоновым пакетом и антикрылом",
    url: "/models/ferrari.glb",
    category: "coupe",
  },
];

function isBuiltinModelCompatible(veh: Vehicle, model: Builtin3dModel) {
  const make = (veh.make || "").trim().toLowerCase();
  const modelName = (veh.model || "").trim().toLowerCase();
  const generation = (veh.generation || "").trim().toLowerCase();

  if (model.id === "xtrail-t31") {
    return make === "nissan" && modelName.includes("x-trail") && generation.includes("t31");
  }
  if (model.id === "bmw-e46") {
    return make === "bmw" && modelName.includes("3 series") && generation.includes("e46");
  }
  return false;
}

export function getAutoModelForVehicle(veh: Vehicle): Builtin3dModel | undefined {
  if (veh.model3dUrl) {
    const selected = BUILTIN_3D_MODELS.find((m) => m.url === veh.model3dUrl);
    if (selected && isBuiltinModelCompatible(veh, selected)) return selected;
  }
  if (isBuiltinModelCompatible(veh, BUILTIN_3D_MODELS[0])) return BUILTIN_3D_MODELS[0];
  if (isBuiltinModelCompatible(veh, BUILTIN_3D_MODELS[1])) return BUILTIN_3D_MODELS[1];
  return undefined;
}

export function getVehicleModelUrl(veh: Vehicle) {
  const selectedBuiltin = BUILTIN_3D_MODELS.find((m) => m.url === veh.model3dUrl);
  if (selectedBuiltin) {
    return isBuiltinModelCompatible(veh, selectedBuiltin) ? selectedBuiltin.url : undefined;
  }
  return veh.model3dUrl || getAutoModelForVehicle(veh)?.url;
}

interface Car3DViewerProps {
  vehicle: Vehicle;
  fallbackPhoto?: { src: string; alt: string };
  onColorChange?: (hex: string) => void;
  onModelChange?: (modelUrl: string, modelName: string) => void;
  height?: string;
  allowColorChange?: boolean;
  interactive?: boolean;
  showControls?: boolean;
  minimal?: boolean;
  className?: string;
}

// Popular automotive paint colors
export const CAR_PAINT_PRESETS = [
  { name: "Красный металлик", hex: "#dc2626" },
  { name: "Глубокий синий", hex: "#1e40af" },
  { name: "Черный обсидиан", hex: "#171717" },
  { name: "Белый перламутр", hex: "#f1f5f9" },
  { name: "Серый нардо", hex: "#64748b" },
  { name: "Серебристый металлик", hex: "#94a3b8" },
  { name: "Изумрудный British", hex: "#166534" },
  { name: "Золотой шампань", hex: "#ca8a04" },
];

const Car3DViewerInternal: React.FC<Car3DViewerProps> = ({
  vehicle,
  fallbackPhoto,
  onColorChange,
  onModelChange,
  height = "90px",
  allowColorChange = false,
  interactive = true,
  showControls = true,
  minimal = false,
  className = "",
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [fallbackPhotoFailed, setFallbackPhotoFailed] = useState(false);

  // States
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [selectedColor, setSelectedColor] = useState("#dc2626");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState<"front34" | "side" | "rear" | "top">("front34");
  const [loadedModelName, setLoadedModelName] = useState<string | null>(null);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep track of internal THREE.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const carGroupRef = useRef<THREE.Group | null>(null);
  const bodyMaterialsRef = useRef<(THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial)[]>([]);
  const headlightMeshesRef = useRef<THREE.Mesh[]>([]);
  const taillightMeshesRef = useRef<THREE.Mesh[]>([]);
  const headlightLightsRef = useRef<THREE.SpotLight[]>([]);

  // Orbit drag state - ONLY rotates on touch/mouse sensor gestures
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 3.8, phi: Math.PI / 2.7, radius: 8.2 });
  const targetAngleRef = useRef({ theta: Math.PI / 3.8, phi: Math.PI / 2.7, radius: 8.2 });

  // Sync color with vehicle prop
  useEffect(() => {
    if (selectedColor !== "#dc2626") setSelectedColor("#dc2626");
  }, [selectedColor]);

  // Update body color in real-time
  useEffect(() => {
    bodyMaterialsRef.current.forEach((mat) => {
      if ("color" in mat && mat.color) {
        mat.color.set(selectedColor);
        mat.needsUpdate = true;
      }
    });
  }, [selectedColor]);

  // Toggle headlights & taillights
  useEffect(() => {
    headlightMeshesRef.current.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissive.set(headlightsOn ? 0xe0f2fe : 0x000000);
        mat.emissiveIntensity = headlightsOn ? 3.0 : 0.0;
      }
    });

    headlightLightsRef.current.forEach((light) => {
      light.intensity = headlightsOn ? 3.5 : 0.0;
    });

    taillightMeshesRef.current.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissive.set(headlightsOn ? 0xff1e28 : 0x4a0004);
        mat.emissiveIntensity = headlightsOn ? 2.5 : 0.4;
      }
    });
  }, [headlightsOn]);

  // Create authentic Russian license plate texture
  const createPlateTexture = (plateText: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // White reflective plate surface
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 256, 64);

    // Embossed black outer border
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, 250, 58);

    const text = (plateText || "О 742 УМ 197").trim().toUpperCase();
    const parts = text.split(/\s+/);
    let mainPart = text;
    let regionPart = "777";
    if (parts.length >= 2) {
      regionPart = parts[parts.length - 1];
      mainPart = parts.slice(0, parts.length - 1).join(" ");
    } else if (text.length >= 8) {
      mainPart = text.slice(0, 6);
      regionPart = text.slice(6);
    }

    // Vertical dividing line before region
    ctx.beginPath();
    ctx.moveTo(194, 4);
    ctx.lineTo(194, 60);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();

    // Main registration characters
    ctx.fillStyle = "#0f172a";
    ctx.font = "900 29px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mainPart, 98, 33);

    // Region code
    ctx.font = "900 21px 'Courier New', monospace";
    ctx.fillText(regionPart, 225, 23);

    // RUS country label
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("RUS", 213, 47);

    // Miniature Russian flag (White / Blue / Red)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(228, 41, 18, 4);
    ctx.fillStyle = "#0039a6";
    ctx.fillRect(228, 45, 18, 4);
    ctx.fillStyle = "#d52b1e";
    ctx.fillRect(228, 49, 18, 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  // Helper to build realistic photorealistic wheels
  const createPhotorealisticWheel = (
    radius: number,
    width: number,
    isFront: boolean
  ) => {
    const wheelGroup = new THREE.Group();

    // 1. Rubber Tire with beveled sidewalls and dark tread
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 32);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.85,
      metalness: 0.1,
    });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Tire tread outer groove rings
    const treadRingGeo = new THREE.TorusGeometry(radius * 0.99, width * 0.14, 8, 32);
    const treadMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.95,
      metalness: 0.05,
    });
    const tread1 = new THREE.Mesh(treadRingGeo, treadMat);
    wheelGroup.add(tread1);

    // 2. Machined Alloy Rim (Two-tone diamond cut)
    const rimRadius = radius * 0.72;
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, width * 1.02, 32);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.12,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    // Dark anthracite inner wheel well
    const innerRimGeo = new THREE.CylinderGeometry(rimRadius * 0.92, rimRadius * 0.92, width * 1.03, 32);
    const innerRimMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.85,
      roughness: 0.35,
    });
    const innerRim = new THREE.Mesh(innerRimGeo, innerRimMat);
    innerRim.rotation.x = Math.PI / 2;
    wheelGroup.add(innerRim);

    // 5-Spoke Split Diamond-Cut Face
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      const spokeGeo = new THREE.BoxGeometry(rimRadius * 0.88, 0.045, width * 0.08);
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.position.set(
        Math.cos(angle) * rimRadius * 0.42,
        Math.sin(angle) * rimRadius * 0.42,
        width * 0.48
      );
      spoke.rotation.z = angle;
      wheelGroup.add(spoke);
    }

    // Center Hub with Chrome Emblem
    const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, width * 1.08, 16);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1,
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);

    // 3. Cross-Drilled Steel Brake Rotor Disc
    const rotorRadius = rimRadius * 0.78;
    const rotorGeo = new THREE.CylinderGeometry(rotorRadius, rotorRadius, 0.02, 24);
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      metalness: 0.95,
      roughness: 0.22,
    });
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.rotation.x = Math.PI / 2;
    rotor.position.z = -width * 0.08;
    wheelGroup.add(rotor);

    // 4. High-Performance Sport Red Brake Caliper (Brembo style)
    const caliperGeo = new THREE.BoxGeometry(rotorRadius * 0.55, rotorRadius * 0.32, width * 0.28);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.75,
      roughness: 0.25,
    });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(
      isFront ? -rotorRadius * 0.65 : rotorRadius * 0.65,
      rotorRadius * 0.35,
      -width * 0.05
    );
    wheelGroup.add(caliper);

    return wheelGroup;
  };

  // Build the Photorealistic 3D Car Model
  const buildCarModel = (bodyType: string, carColor: string, licensePlate: string) => {
    const group = new THREE.Group();
    bodyMaterialsRef.current = [];
    headlightMeshesRef.current = [];
    taillightMeshesRef.current = [];
    headlightLightsRef.current = [];

    const isSuv =
      bodyType === "suv" ||
      vehicle.model.toLowerCase().includes("trail") ||
      vehicle.model.toLowerCase().includes("cross") ||
      vehicle.model.toLowerCase().includes("tiggo");

    // Proportions
    const length = isSuv ? 4.65 : 4.85;
    const width = isSuv ? 2.15 : 2.05;
    const groundClearance = isSuv ? 0.38 : 0.25;
    const bodyHeight = isSuv ? 1.05 : 0.82;
    const roofHeight = isSuv ? 0.85 : 0.7;

    // --- MATERIALS ---
    // 1. High-End Automotive Metallic Paint with Clearcoat
    const paintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(carColor),
      metalness: 0.88,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95,
    });
    bodyMaterialsRef.current.push(paintMaterial);

    // 2. Dark Satin Trim / Aerodynamic Plastic (Bumpers, Skirts, Diffuser)
    const darkTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0x16181b,
      roughness: 0.7,
      metalness: 0.2,
    });

    // 3. Polished Chrome / Aluminum Trim
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.96,
      roughness: 0.08,
    });

    // 4. Tinted Automotive Glass with Glossy Reflection
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a101f,
      metalness: 0.15,
      roughness: 0.02,
      transmission: 0.75,
      transparent: true,
      opacity: 0.92,
      reflectivity: 0.98,
    });

    // 5. Headlight Reflector & Bulb Materials
    const headlightLensMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      transmission: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.7,
    });

    const ledDrlMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x60a5fa,
      emissiveIntensity: 3.0,
      roughness: 0.1,
    });

    // 6. Taillight Lens & LED Material
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0x990000,
      emissive: 0xff1e28,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    // --- A. MAIN SCULPTED CHASSIS ---
    // Lower body main box
    const mainChassisGeo = new THREE.BoxGeometry(width, bodyHeight, length * 0.98);
    const mainChassis = new THREE.Mesh(mainChassisGeo, paintMaterial);
    mainChassis.position.y = groundClearance + bodyHeight / 2;
    mainChassis.castShadow = true;
    mainChassis.receiveShadow = true;
    group.add(mainChassis);

    // Sculpted Aerodynamic Hood (Sloped front hood with character lines)
    const hoodLength = length * 0.36;
    const hoodGeo = new THREE.CylinderGeometry(
      width / 2,
      width / 1.95,
      hoodLength,
      24,
      1,
      false,
      0,
      Math.PI
    );
    const hood = new THREE.Mesh(hoodGeo, paintMaterial);
    hood.rotation.x = Math.PI / 2;
    hood.rotation.z = Math.PI;
    hood.position.set(0, groundClearance + bodyHeight * 0.96, length * 0.28);
    hood.scale.set(1, 0.42, 1);
    hood.castShadow = true;
    group.add(hood);

    // Hood Twin Power Ridges (Creases)
    const creaseGeo = new THREE.BoxGeometry(0.04, 0.03, hoodLength * 0.9);
    const creaseL = new THREE.Mesh(creaseGeo, paintMaterial);
    creaseL.position.set(-width * 0.28, groundClearance + bodyHeight * 0.99, length * 0.28);
    creaseL.rotation.y = -0.05;
    group.add(creaseL);

    const creaseR = new THREE.Mesh(creaseGeo, paintMaterial);
    creaseR.position.set(width * 0.28, groundClearance + bodyHeight * 0.99, length * 0.28);
    creaseR.rotation.y = 0.05;
    group.add(creaseR);

    // Flared Wheel Arches (Fenders)
    const fenderGeo = new THREE.BoxGeometry(width * 1.04, bodyHeight * 0.55, length * 0.26);
    const frontFender = new THREE.Mesh(fenderGeo, paintMaterial);
    frontFender.position.set(0, groundClearance + bodyHeight * 0.42, length * 0.32);
    group.add(frontFender);

    const rearFender = new THREE.Mesh(fenderGeo, paintMaterial);
    rearFender.position.set(0, groundClearance + bodyHeight * 0.42, -length * 0.32);
    group.add(rearFender);

    // Lower Side Skirts / Rocker Panels
    const skirtGeo = new THREE.BoxGeometry(width * 1.02, 0.12, length * 0.54);
    const skirt = new THREE.Mesh(skirtGeo, darkTrimMaterial);
    skirt.position.set(0, groundClearance + 0.06, 0);
    group.add(skirt);

    // Chrome Accent Strip on Side Skirts
    const sideChromeGeo = new THREE.BoxGeometry(width * 1.03, 0.02, length * 0.5);
    const sideChrome = new THREE.Mesh(sideChromeGeo, chromeMaterial);
    sideChrome.position.set(0, groundClearance + 0.14, 0);
    group.add(sideChrome);

    // --- B. GREENHOUSE / CABIN & TINTED GLASS ---
    const cabinLength = isSuv ? length * 0.6 : length * 0.53;
    const cabinWidth = width * 0.88;
    const cabinOffsetZ = isSuv ? -0.18 : -0.28;

    const cabinGeo = new THREE.BoxGeometry(cabinWidth, roofHeight, cabinLength);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, groundClearance + bodyHeight + roofHeight / 2 - 0.04, cabinOffsetZ);
    cabin.castShadow = true;
    group.add(cabin);

    // Roof Panel (Matches car paint)
    const roofGeo = new THREE.BoxGeometry(cabinWidth * 0.96, 0.06, cabinLength * 0.94);
    const roof = new THREE.Mesh(roofGeo, paintMaterial);
    roof.position.set(0, groundClearance + bodyHeight + roofHeight - 0.01, cabinOffsetZ);
    roof.castShadow = true;
    bodyMaterialsRef.current.push(paintMaterial);
    group.add(roof);

    // Windshield A-Pillars & C-Pillars (Sleek body colored struts)
    const pillarGeo = new THREE.BoxGeometry(0.06, roofHeight * 0.95, 0.08);
    const pillarAL = new THREE.Mesh(pillarGeo, paintMaterial);
    pillarAL.position.set(-cabinWidth * 0.47, groundClearance + bodyHeight + roofHeight * 0.48, cabinOffsetZ + cabinLength * 0.46);
    pillarAL.rotation.x = -0.45;
    group.add(pillarAL);

    const pillarAR = new THREE.Mesh(pillarGeo, paintMaterial);
    pillarAR.position.set(cabinWidth * 0.47, groundClearance + bodyHeight + roofHeight * 0.48, cabinOffsetZ + cabinLength * 0.46);
    pillarAR.rotation.x = -0.45;
    group.add(pillarAR);

    // Shark Fin Roof Antenna
    const antennaGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
    const antenna = new THREE.Mesh(antennaGeo, darkTrimMaterial);
    antenna.rotation.x = -0.3;
    antenna.position.set(0, groundClearance + bodyHeight + roofHeight + 0.06, cabinOffsetZ - cabinLength * 0.42);
    group.add(antenna);

    // SUV Roof Rails
    if (isSuv) {
      const railGeo = new THREE.CylinderGeometry(0.02, 0.02, cabinLength * 0.85, 8);
      const railL = new THREE.Mesh(railGeo, chromeMaterial);
      railL.rotation.x = Math.PI / 2;
      railL.position.set(-cabinWidth * 0.45, groundClearance + bodyHeight + roofHeight + 0.05, cabinOffsetZ);
      group.add(railL);

      const railR = new THREE.Mesh(railGeo, chromeMaterial);
      railR.rotation.x = Math.PI / 2;
      railR.position.set(cabinWidth * 0.45, groundClearance + bodyHeight + roofHeight + 0.05, cabinOffsetZ);
      group.add(railR);
    }

    // --- C. INTERIOR SILHOUETTE (Dashboard & Headrests visible through glass) ---
    const dashGeo = new THREE.BoxGeometry(cabinWidth * 0.9, 0.15, 0.45);
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
    const dashboard = new THREE.Mesh(dashGeo, dashMat);
    dashboard.position.set(0, groundClearance + bodyHeight + 0.12, cabinOffsetZ + cabinLength * 0.35);
    group.add(dashboard);

    // Front Bucket Seat Headrests
    const headrestGeo = new THREE.BoxGeometry(0.22, 0.22, 0.12);
    const headrestL = new THREE.Mesh(headrestGeo, dashMat);
    headrestL.position.set(-cabinWidth * 0.24, groundClearance + bodyHeight + 0.42, cabinOffsetZ + 0.05);
    group.add(headrestL);

    const headrestR = new THREE.Mesh(headrestGeo, dashMat);
    headrestR.position.set(cabinWidth * 0.24, groundClearance + bodyHeight + 0.42, cabinOffsetZ + 0.05);
    group.add(headrestR);

    // --- D. AERODYNAMIC SIDE MIRRORS ---
    const mirrorGeo = new THREE.BoxGeometry(0.25, 0.14, 0.18);
    const mirrorL = new THREE.Mesh(mirrorGeo, paintMaterial);
    mirrorL.position.set(-width * 0.54, groundClearance + bodyHeight + 0.08, cabinOffsetZ + cabinLength * 0.38);
    group.add(mirrorL);

    const mirrorR = new THREE.Mesh(mirrorGeo, paintMaterial);
    mirrorR.position.set(width * 0.54, groundClearance + bodyHeight + 0.08, cabinOffsetZ + cabinLength * 0.38);
    group.add(mirrorR);

    // Amber LED indicator on side mirrors
    const indicatorGeo = new THREE.BoxGeometry(0.04, 0.02, 0.12);
    const indicatorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
    });
    const indicatorL = new THREE.Mesh(indicatorGeo, indicatorMat);
    indicatorL.position.set(-width * 0.65, groundClearance + bodyHeight + 0.08, cabinOffsetZ + cabinLength * 0.38);
    group.add(indicatorL);

    const indicatorR = new THREE.Mesh(indicatorGeo, indicatorMat);
    indicatorR.position.set(width * 0.65, groundClearance + bodyHeight + 0.08, cabinOffsetZ + cabinLength * 0.38);
    group.add(indicatorR);

    // Flush Door Handles
    const handleGeo = new THREE.BoxGeometry(0.02, 0.04, 0.18);
    const handleFL = new THREE.Mesh(handleGeo, chromeMaterial);
    handleFL.position.set(-width * 0.51, groundClearance + bodyHeight * 0.72, 0.4);
    group.add(handleFL);

    const handleRL = new THREE.Mesh(handleGeo, chromeMaterial);
    handleRL.position.set(-width * 0.51, groundClearance + bodyHeight * 0.72, -0.4);
    group.add(handleRL);

    const handleFR = new THREE.Mesh(handleGeo, chromeMaterial);
    handleFR.position.set(width * 0.51, groundClearance + bodyHeight * 0.72, 0.4);
    group.add(handleFR);

    const handleRR = new THREE.Mesh(handleGeo, chromeMaterial);
    handleRR.position.set(width * 0.51, groundClearance + bodyHeight * 0.72, -0.4);
    group.add(handleRR);

    // --- E. FRONT FASCIA: GRILLE, HEADLIGHTS, BUMPER ---
    // Honeycomb Front Grille
    const grilleGeo = new THREE.BoxGeometry(width * 0.68, bodyHeight * 0.42, 0.06);
    const grille = new THREE.Mesh(grilleGeo, darkTrimMaterial);
    grille.position.set(0, groundClearance + bodyHeight * 0.48, length / 2 + 0.02);
    group.add(grille);

    // Chrome Grille Outline
    const grilleBorderGeo = new THREE.BoxGeometry(width * 0.72, bodyHeight * 0.46, 0.02);
    const grilleBorder = new THREE.Mesh(grilleBorderGeo, chromeMaterial);
    grilleBorder.position.set(0, groundClearance + bodyHeight * 0.48, length / 2 + 0.01);
    group.add(grilleBorder);

    // Brand Emblem on Grille
    const emblemGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16);
    const emblem = new THREE.Mesh(emblemGeo, chromeMaterial);
    emblem.rotation.x = Math.PI / 2;
    emblem.position.set(0, groundClearance + bodyHeight * 0.54, length / 2 + 0.06);
    group.add(emblem);

    // Lower Aerodynamic Front Splitter / Air Dam
    const splitterGeo = new THREE.BoxGeometry(width * 0.94, 0.12, 0.22);
    const splitter = new THREE.Mesh(splitterGeo, darkTrimMaterial);
    splitter.position.set(0, groundClearance + 0.06, length / 2 - 0.02);
    group.add(splitter);

    // Modern Sleek LED Headlights (Left & Right)
    const headlightGeo = new THREE.BoxGeometry(width * 0.24, bodyHeight * 0.24, 0.15);

    // Left Headlight Housing
    const headlightL = new THREE.Mesh(headlightGeo, ledDrlMaterial);
    headlightL.position.set(-width * 0.38, groundClearance + bodyHeight * 0.62, length / 2 - 0.04);
    headlightL.rotation.y = -0.15;
    headlightMeshesRef.current.push(headlightL);
    group.add(headlightL);

    // Left Headlight Clear Crystal Lens
    const lensL = new THREE.Mesh(headlightGeo, headlightLensMaterial);
    lensL.position.set(-width * 0.38, groundClearance + bodyHeight * 0.62, length / 2 - 0.02);
    lensL.rotation.y = -0.15;
    group.add(lensL);

    // Right Headlight Housing
    const headlightR = new THREE.Mesh(headlightGeo, ledDrlMaterial);
    headlightR.position.set(width * 0.38, groundClearance + bodyHeight * 0.62, length / 2 - 0.04);
    headlightR.rotation.y = 0.15;
    headlightMeshesRef.current.push(headlightR);
    group.add(headlightR);

    // Right Headlight Clear Crystal Lens
    const lensR = new THREE.Mesh(headlightGeo, headlightLensMaterial);
    lensR.position.set(width * 0.38, groundClearance + bodyHeight * 0.62, length / 2 - 0.02);
    lensR.rotation.y = 0.15;
    group.add(lensR);

    // Real Spotlight Beams projected from headlights
    const spotL = new THREE.SpotLight(0xffffff, 3.5, 14, Math.PI / 6, 0.4, 1.2);
    spotL.position.set(-width * 0.38, groundClearance + bodyHeight * 0.62, length / 2 + 0.1);
    spotL.target.position.set(-width * 0.38, 0, length / 2 + 10);
    group.add(spotL);
    group.add(spotL.target);
    headlightLightsRef.current.push(spotL);

    const spotR = new THREE.SpotLight(0xffffff, 3.5, 14, Math.PI / 6, 0.4, 1.2);
    spotR.position.set(width * 0.38, groundClearance + bodyHeight * 0.62, length / 2 + 0.1);
    spotR.target.position.set(width * 0.38, 0, length / 2 + 10);
    group.add(spotR);
    group.add(spotR.target);
    headlightLightsRef.current.push(spotR);

    // --- F. REAR FASCIA: LED LIGHTBAR, DIFFUSER, EXHAUSTS ---
    // Full-Width Sleek LED Taillight Bar
    const taillightBarGeo = new THREE.BoxGeometry(width * 0.88, 0.14, 0.08);
    const taillightBar = new THREE.Mesh(taillightBarGeo, taillightMat);
    taillightBar.position.set(0, groundClearance + bodyHeight * 0.66, -length / 2 - 0.01);
    taillightMeshesRef.current.push(taillightBar);
    group.add(taillightBar);

    // Rear Decklid Lip / Spoiler
    const spoilerGeo = new THREE.BoxGeometry(width * 0.85, 0.05, 0.18);
    const spoiler = new THREE.Mesh(spoilerGeo, isSuv ? darkTrimMaterial : paintMaterial);
    spoiler.position.set(0, groundClearance + bodyHeight + (isSuv ? roofHeight - 0.04 : 0.08), -length / 2 + 0.08);
    group.add(spoiler);

    // Rear Aerodynamic Diffuser
    const diffuserGeo = new THREE.BoxGeometry(width * 0.82, 0.18, 0.18);
    const diffuser = new THREE.Mesh(diffuserGeo, darkTrimMaterial);
    diffuser.position.set(0, groundClearance + 0.08, -length / 2 + 0.02);
    group.add(diffuser);

    // Dual Stainless-Steel Chrome Exhaust Tips
    const exhaustGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.18, 16);
    const exhaustL = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhaustL.rotation.x = Math.PI / 2;
    exhaustL.position.set(-width * 0.32, groundClearance + 0.1, -length / 2 - 0.06);
    group.add(exhaustL);

    const exhaustR = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhaustR.rotation.x = Math.PI / 2;
    exhaustR.position.set(width * 0.32, groundClearance + 0.1, -length / 2 - 0.06);
    group.add(exhaustR);

    // --- G. AUTHENTIC LICENSE PLATES (FRONT & REAR) ---
    const plateTexture = createPlateTexture(licensePlate);
    if (plateTexture) {
      const plateMat = new THREE.MeshBasicMaterial({ map: plateTexture });
      const plateGeo = new THREE.PlaneGeometry(0.72, 0.18);

      // Front License Plate
      const frontPlate = new THREE.Mesh(plateGeo, plateMat);
      frontPlate.position.set(0, groundClearance + bodyHeight * 0.22, length / 2 + 0.04);
      group.add(frontPlate);

      // Front plate backing bracket
      const frontBracketGeo = new THREE.BoxGeometry(0.76, 0.21, 0.03);
      const frontBracket = new THREE.Mesh(frontBracketGeo, darkTrimMaterial);
      frontBracket.position.set(0, groundClearance + bodyHeight * 0.22, length / 2 + 0.02);
      group.add(frontBracket);

      // Rear License Plate
      const rearPlate = new THREE.Mesh(plateGeo, plateMat);
      rearPlate.rotation.y = Math.PI;
      rearPlate.position.set(0, groundClearance + bodyHeight * 0.36, -length / 2 - 0.02);
      group.add(rearPlate);

      // Rear plate backing bracket
      const rearBracketGeo = new THREE.BoxGeometry(0.76, 0.21, 0.03);
      const rearBracket = new THREE.Mesh(rearBracketGeo, darkTrimMaterial);
      rearBracket.position.set(0, groundClearance + bodyHeight * 0.36, -length / 2 - 0.01);
      group.add(rearBracket);
    }

    // --- H. 4 HIGH-FIDELITY ALLOY WHEELS ---
    const wheelRadius = isSuv ? 0.42 : 0.36;
    const wheelWidth = 0.28;
    const axleX = width * 0.48;
    const frontZ = length * 0.32;
    const rearZ = -length * 0.32;
    const wheelY = wheelRadius;

    // Front Left Wheel
    const wheelFL = createPhotorealisticWheel(wheelRadius, wheelWidth, true);
    wheelFL.position.set(-axleX, wheelY, frontZ);
    group.add(wheelFL);

    // Front Right Wheel
    const wheelFR = createPhotorealisticWheel(wheelRadius, wheelWidth, true);
    wheelFR.rotation.y = Math.PI;
    wheelFR.position.set(axleX, wheelY, frontZ);
    group.add(wheelFR);

    // Rear Left Wheel
    const wheelRL = createPhotorealisticWheel(wheelRadius, wheelWidth, false);
    wheelRL.position.set(-axleX, wheelY, rearZ);
    group.add(wheelRL);

    // Rear Right Wheel
    const wheelRR = createPhotorealisticWheel(wheelRadius, wheelWidth, false);
    wheelRR.rotation.y = Math.PI;
    wheelRR.position.set(axleX, wheelY, rearZ);
    group.add(wheelRR);

    // --- I. GROUND CONTACT SHADOW PLANE ---
    // Soft radial ambient occlusion shadow directly under chassis
    const shadowGeo = new THREE.PlaneGeometry(width * 1.3, length * 1.1);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 15, 64, 64, 60);
      grad.addColorStop(0, "rgba(0,0,0,0.85)");
      grad.addColorStop(0.6, "rgba(0,0,0,0.4)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.01;
    group.add(shadowPlane);

    return group;
  };

  // Setup THREE.js Scene, Studio Lighting, Fixed Non-Rotating Podium
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // Safely verify and create WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("WebGL initialization failed:", err);
      setWebglAvailable(false);
      return;
    }

    const currentWidth = container.clientWidth || 300;
    const currentHeight = container.clientHeight || 90;

    renderer.domElement.className = "w-full h-full cursor-grab active:cursor-grabbing block";
    renderer.domElement.setAttribute("aria-label", "3D-модель автомобиля. Для смены ракурса используйте кнопки под моделью.");
    renderer.domElement.setAttribute("role", "img");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(currentWidth, currentHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // Clear previous children and mount canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.04);
    sceneRef.current = scene;

    // Camera
    const isSmallHeight = currentHeight <= 120;
    const camera = new THREE.PerspectiveCamera(
      isSmallHeight ? 32 : 36,
      currentWidth / currentHeight,
      0.1,
      100
    );
    cameraRef.current = camera;

    // --- STUDIO LIGHTING SETUP ---
    // 1. Hemisphere Light (Soft Sky & Floor bounce)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x64748b, 1.6);
    scene.add(hemiLight);

    // 2. Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    // 3. Main Studio Softbox Overhead Key Light
    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    mainKeyLight.position.set(5, 14, 7);
    mainKeyLight.castShadow = true;
    mainKeyLight.shadow.mapSize.width = 1024;
    mainKeyLight.shadow.mapSize.height = 1024;
    mainKeyLight.shadow.bias = -0.001;
    scene.add(mainKeyLight);

    // 4. Cool Cyan Rim Light (Catches car body curves from the left rear)
    const coolRimLight = new THREE.DirectionalLight(0x7dd3fc, 2.2);
    coolRimLight.position.set(-8, 6, -8);
    scene.add(coolRimLight);

    // 5. Warm Amber Fill Light (Accentuates paint highlights from right)
    const warmFillLight = new THREE.DirectionalLight(0xfdba74, 1.6);
    warmFillLight.position.set(8, 5, -5);
    scene.add(warmFillLight);

    // 6. Front Low Bumper Fill
    const frontFill = new THREE.DirectionalLight(0xffffff, 2.0);
    frontFill.position.set(0, 3, 9);
    scene.add(frontFill);

    // --- STATIONARY SHOWROOM PODIUM (Does NOT auto-rotate) ---
    const stageRadius = 5.2;
    const stageGeo = new THREE.CylinderGeometry(stageRadius, stageRadius, 0.08, 48);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x12141a,
      roughness: 0.35,
      metalness: 0.7,
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -0.04;
    stage.receiveShadow = true;
    scene.add(stage);

    // Red Neon Accent Border on Podium Edge
    const ringGeo = new THREE.RingGeometry(stageRadius - 0.07, stageRadius, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.003;
    scene.add(ring);

    // Studio Grid Floor
    const grid = new THREE.GridHelper(18, 24, 0x1e293b, 0x0f172a);
    grid.position.y = -0.05;
    scene.add(grid);

    // Add Photorealistic Car Model to Scene
    const carModel = buildCarModel(
      vehicle.bodyType || "suv",
      selectedColor,
      vehicle.licensePlate || ""
    );
    carGroupRef.current = carModel;
    scene.add(carModel);

    let isDisposed = false;

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (isDisposed || !container || !renderer || !camera) return;
      try {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        if (newWidth === 0 || newHeight === 0) return;
        camera.aspect = newWidth / newHeight;
        camera.fov = newHeight <= 120 ? 32 : 36;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      } catch {
        // ignore resize error
      }
    });
    resizeObserver.observe(container);

    // Animation Loop: STRICTLY NO AUTO-ROTATION! Rotates ONLY on touch/pointer drag
    let animationFrameId: number;
    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      try {
        // Smooth camera interpolation towards target angle
        const angle = cameraAngleRef.current;
        const target = targetAngleRef.current;
        if (!angle || !target) return;
        const easing = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0.12;
        angle.theta += (target.theta - angle.theta) * easing;
        angle.phi += (target.phi - angle.phi) * easing;
        angle.radius += (target.radius - angle.radius) * easing;

        // Restrict camera pitch so user cannot flip the camera upside down or beneath the floor
        angle.phi = Math.max(0.12, Math.min(Math.PI / 2.05, angle.phi));
        angle.radius = Math.max(4.0, Math.min(14.0, angle.radius));

        // Calculate camera coordinates
        const x = angle.radius * Math.sin(angle.phi) * Math.sin(angle.theta);
        const y = angle.radius * Math.cos(angle.phi);
        const z = angle.radius * Math.sin(angle.phi) * Math.cos(angle.theta);

        camera.position.set(x, y, z);
        camera.lookAt(0, 0.72, 0);

        renderer.render(scene, camera);
      } catch {
        // ignore render frame error
      }
    };

    animate();

    return () => {
      isDisposed = true;
      requestRef.current++;
      abortRef.current?.abort();
      sceneRef.current = null;
      cancelAnimationFrame(animationFrameId);
      try {
        resizeObserver.disconnect();
      } catch {}
      try {
        renderer.dispose();
      } catch {}
      try {
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      } catch {}
      try {
        scene.clear();
      } catch {}
    };
  }, [vehicle.bodyType, vehicle.id]);

  // Touch and Sensor drag controls
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive || (e.target as HTMLElement).closest("button, input")) return;
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !interactive) return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    targetAngleRef.current.theta -= deltaX * 0.009;
    targetAngleRef.current.phi -= deltaY * 0.007;

    targetAngleRef.current.phi = Math.max(0.12, Math.min(Math.PI / 2.05, targetAngleRef.current.phi));

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();
    targetAngleRef.current.radius += e.deltaY * 0.005;
    targetAngleRef.current.radius = Math.max(4.5, Math.min(13.0, targetAngleRef.current.radius));
  };

  // Load external 3D GLB/GLTF model
  const loadGlbBuffer = (
    buffer: ArrayBuffer,
    name: string,
    request = ++requestRef.current,
    onLoaded?: () => void,
  ) => {
    if (!sceneRef.current) return;
    setIsLoadingModel(true);
    setModelError(null);

    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      "",
      (gltf) => {
        if (!sceneRef.current || request !== requestRef.current) return;
        // Remove previous car model
        if (carGroupRef.current) {
          sceneRef.current.remove(carGroupRef.current);
        }

        bodyMaterialsRef.current = [];
        headlightMeshesRef.current = [];
        taillightMeshesRef.current = [];

        const loadedGroup = new THREE.Group();
        const rawModel = gltf.scene;

        // Auto compute bounding box & scale into standard showroom scale
        const box = new THREE.Box3().setFromObject(rawModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 4.8;
        const scale = targetSize / maxDim;

        rawModel.scale.setScalar(scale);
        rawModel.position.x = -center.x * scale;
        rawModel.position.y = -box.min.y * scale; // align wheels to floor y = 0
        rawModel.position.z = -center.z * scale;

        loadedGroup.add(rawModel);

        // Traverse meshes to enable shadows & hook body paint recoloring
        rawModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const mat = mesh.material;
            const materials = Array.isArray(mat) ? mat : [mat];
            materials.forEach((m) => {
              if (!m) return;
              const matName = (m.name || "").toLowerCase();
              const meshName = (mesh.name || "").toLowerCase();
              if (
                matName.includes("paint") ||
                matName.includes("body") ||
                matName.includes("car") ||
                matName.includes("exterior") ||
                matName.includes("color") ||
                meshName.includes("body") ||
                meshName.includes("paint")
              ) {
                if ("color" in m) {
                  bodyMaterialsRef.current.push(m as any);
                  (m as any).color.set(selectedColor);
                }
              }
            });
          }
        });

        // Contact shadow plane
        const shadowGeo = new THREE.PlaneGeometry(3.2, 5.8);
        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = 128;
        shadowCanvas.height = 128;
        const sctx = shadowCanvas.getContext("2d");
        if (sctx) {
          const grad = sctx.createRadialGradient(64, 64, 15, 64, 64, 60);
          grad.addColorStop(0, "rgba(0,0,0,0.85)");
          grad.addColorStop(0.6, "rgba(0,0,0,0.35)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          sctx.fillStyle = grad;
          sctx.fillRect(0, 0, 128, 128);
        }
        const shadowTex = new THREE.CanvasTexture(shadowCanvas);
        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        });
        const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.01;
        loadedGroup.add(shadowPlane);

        sceneRef.current.add(loadedGroup);
        carGroupRef.current = loadedGroup;
        setLoadedModelName(name);
        setIsLoadingModel(false);
        onLoaded?.();
      },
      () => {
        if (request !== requestRef.current) return;
        setModelError("Не удалось прочитать модель. Показан предыдущий или базовый вид. Выберите другой GLB.");
        setIsLoadingModel(false);
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        loadGlbBuffer(buffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.endsWith(".glb") || file.name.endsWith(".gltf")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (buffer) {
          loadGlbBuffer(buffer, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleResetToDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    requestRef.current++;
    abortRef.current?.abort();
    setIsLoadingModel(false);
    setModelError(null);
    if (!sceneRef.current) return;
    if (carGroupRef.current) {
      sceneRef.current.remove(carGroupRef.current);
    }
    const defaultModel = buildCarModel(
      vehicle.bodyType || "suv",
      selectedColor,
      vehicle.licensePlate || ""
    );
    carGroupRef.current = defaultModel;
    sceneRef.current.add(defaultModel);
    setLoadedModelName(null);
    setCurrentModelId(null);
  };

  // Unified helper to load a GLB from URL
  const loadGlbFromUrl = async (
    url: string,
    displayName: string,
    modelId?: string,
    onLoaded?: () => void,
  ) => {
    if (!sceneRef.current) return;
    const request = ++requestRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setIsLoadingModel(true);
    setModelError(null);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      if (request !== requestRef.current) return;
      loadGlbBuffer(buffer, displayName, request, onLoaded);
      if (modelId) setCurrentModelId(modelId);
    } catch {
      if (request !== requestRef.current) return;
      setModelError("Модель не загрузилась. Показан предыдущий или базовый вид; проверьте соединение или выберите другой GLB.");
      setIsLoadingModel(false);
      if (!carGroupRef.current && sceneRef.current) {
        const defaultModel = buildCarModel(
          vehicle.bodyType || "suv",
          selectedColor,
          vehicle.licensePlate || ""
        );
        carGroupRef.current = defaultModel;
        sceneRef.current.add(defaultModel);
      }
    } finally {
      window.clearTimeout(timeout);
    }
  };

  // Auto load vehicle 3D model on mount or when vehicle changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const autoModel = getAutoModelForVehicle(vehicle);
    const targetUrl = getVehicleModelUrl(vehicle);
    if (!targetUrl) return;
    const targetName = targetUrl
      ? BUILTIN_3D_MODELS.find((m) => m.url === targetUrl)?.name || `${vehicle.make} ${vehicle.model}`
      : autoModel?.name || `${vehicle.make} ${vehicle.model}`;
    const targetId = targetUrl
      ? BUILTIN_3D_MODELS.find((m) => m.url === targetUrl)?.id || null
      : autoModel?.id || null;

    loadGlbFromUrl(targetUrl, targetName, targetId || undefined);
  }, [vehicle.id, vehicle.model3dUrl]);

  // Camera Presets (Quick jump angles)
  const setCameraPreset = (view: "front34" | "side" | "rear" | "top") => {
    setActiveView(view);
    switch (view) {
      case "front34":
        targetAngleRef.current.theta = Math.PI / 3.8;
        targetAngleRef.current.phi = Math.PI / 2.7;
        targetAngleRef.current.radius = 8.2;
        break;
      case "side":
        targetAngleRef.current.theta = Math.PI / 2;
        targetAngleRef.current.phi = Math.PI / 2.2;
        targetAngleRef.current.radius = 7.5;
        break;
      case "rear":
        targetAngleRef.current.theta = Math.PI;
        targetAngleRef.current.phi = Math.PI / 2.8;
        targetAngleRef.current.radius = 8.2;
        break;
      case "top":
        targetAngleRef.current.theta = Math.PI / 3.8;
        targetAngleRef.current.phi = 0.28;
        targetAngleRef.current.radius = 9.8;
        break;
    }
  };

  const isCompact = parseInt(height) <= 120;

  if (!webglAvailable) {
    return (
      <div
        style={{ height }}
        className={`relative w-full rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-850 p-3 flex items-center justify-between shadow-xl select-none ${className}`}
      >
        {fallbackPhoto?.src && !fallbackPhotoFailed ? (
          <img
            src={fallbackPhoto.src}
            alt={fallbackPhoto.alt}
            className="w-full h-full object-contain"
            onError={() => setFallbackPhotoFailed(true)}
          />
        ) : fallbackPhoto?.src ? <span className="text-xs text-neutral-400">Фото недоступно</span> : null}
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 shadow"
            style={{ backgroundColor: selectedColor }}
          >
            <Eye className="w-5 h-5 text-white drop-shadow" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{vehicle.make} {vehicle.model}</span>
              <span className="text-[10px] text-neutral-400 font-normal">({vehicle.bodyType || "suv"})</span>
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              3D визуализатор {selectedColor}
            </div>
          </div>
        </div>

        {vehicle.licensePlate && (
          <div className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[11px] font-mono font-bold text-neutral-200">
            {vehicle.licensePlate}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ height: isFullscreen ? "100dvh" : height, touchAction: "pan-y" }}
      aria-label="3D-обзор автомобиля"
      onKeyDown={e => {
        if (e.key === "Escape") { setIsFullscreen(false); setShowModelPicker(false); }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`car-viewer w-full rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 select-none ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-none" : "relative"
      } ${className}`}
    >
      {/* Dedicated canvas mount point without React children */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full" />
      {modelError && <div className="model-error" role="alert">{modelError}</div>}

      {/* Hidden file input for uploading .glb car models */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Left Badges & Model Status */}
      {!minimal && <div className="model-toolbar absolute top-2 left-2 flex flex-wrap items-center gap-1.5 z-10">
        <span className="px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-full text-[9px] font-semibold text-neutral-300 border border-neutral-700/80 shadow flex items-center gap-1">
          <Eye className="w-2.5 h-2.5 text-red-500 shrink-0" />
          <span>360° Обзор</span>
        </span>

        {/* 3D Model Selector Trigger */}
        <button
          aria-expanded={showModelPicker}
          onClick={() => setShowModelPicker(true)}
          className="px-2.5 py-0.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white backdrop-blur-md rounded-full text-[9px] font-semibold border border-neutral-700/80 shadow flex items-center gap-1.5 transition cursor-pointer"
          title="Выбрать 3D модель автомобиля из каталога или загрузить свой файл"
        >
          <Box className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
          <span className="max-w-[110px] truncate">{loadedModelName || "3D Модели"}</span>
          <ChevronDown className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
        </button>

        {loadedModelName && (
          <button
            aria-label="Показать базовую модель"
            onClick={handleResetToDefault}
            title="Сбросить к процедурной геометрии"
            className="w-4 h-4 flex items-center justify-center rounded-full bg-neutral-900/80 text-neutral-400 hover:text-white text-xs border border-neutral-800 cursor-pointer"
          >
            ×
          </button>
        )}
      </div>}

      {/* Top Right Controls */}
      {!minimal && <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        {/* Headlights Toggle */}
        <button
          onClick={() => setHeadlightsOn(!headlightsOn)}
          aria-pressed={headlightsOn}
          title={headlightsOn ? "Выключить фары" : "Включить фары"}
          className={`p-1.5 rounded-lg backdrop-blur-md border transition cursor-pointer ${
            headlightsOn
              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs"
              : "bg-black/60 text-neutral-400 border-neutral-800 hover:text-white"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "Свернуть" : "Развернуть на весь экран"}
          className="p-1.5 bg-black/60 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg backdrop-blur-md border border-neutral-800 transition cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>}

      {/* Camera View Presets Bar */}
      {showControls && (
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/85 backdrop-blur-md p-0.5 rounded-lg border border-neutral-800 shadow-md pointer-events-auto z-10">
          <button
            aria-pressed={activeView === "front34"}
            onClick={() => setCameraPreset("front34")}
            className={`px-2 py-0.5 text-[9px] font-medium rounded transition cursor-pointer ${
              activeView === "front34"
                ? "bg-red-600 text-white font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            3/4
          </button>
          <button
            aria-pressed={activeView === "side"}
            onClick={() => setCameraPreset("side")}
            className={`px-2 py-0.5 text-[9px] font-medium rounded transition cursor-pointer ${
              activeView === "side"
                ? "bg-red-600 text-white font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Бок
          </button>
          <button
            aria-pressed={activeView === "rear"}
            onClick={() => setCameraPreset("rear")}
            className={`px-2 py-0.5 text-[9px] font-medium rounded transition cursor-pointer ${
              activeView === "rear"
                ? "bg-red-600 text-white font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Тыл
          </button>
          <button
            aria-pressed={activeView === "top"}
            onClick={() => setCameraPreset("top")}
            className={`px-2 py-0.5 text-[9px] font-medium rounded transition cursor-pointer ${
              activeView === "top"
                ? "bg-red-600 text-white font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Верх
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingModel && (
        <div role="status" className="absolute inset-0 z-30 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-7 h-7 text-red-500 animate-spin" />
          <span className="text-xs font-bold text-white tracking-wide">
            Загрузка 3D модели...
          </span>
          <button type="button" onClick={() => {
            requestRef.current++;
            abortRef.current?.abort();
            setIsLoadingModel(false);
            setModelError("Загрузка отменена. Показан базовый или предыдущий вид.");
          }}>Отменить загрузку</button>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-red-950/80 border-2 border-dashed border-red-500 rounded-2xl flex flex-col items-center justify-center gap-2 backdrop-blur-xs">
          <Upload className="w-8 h-8 text-red-400 animate-bounce" />
          <span className="text-xs font-bold text-white">
            Отпустите .GLB файл для загрузки
          </span>
        </div>
      )}

      {/* 3D Model Picker Catalog Modal */}
      {showModelPicker && (
        <div
          className="absolute inset-0 z-40 bg-neutral-950/95 backdrop-blur-md p-3 sm:p-4 flex flex-col justify-between overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Каталог 3D моделей
                </h3>
                <p className="text-[10px] text-neutral-400">
                  Выберите модель автомобиля или загрузите собственный .glb
                </p>
              </div>
            </div>
            <button
              aria-label="Закрыть каталог моделей"
              onClick={() => setShowModelPicker(false)}
              className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid of models */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 overflow-y-auto max-h-[170px] pr-1">
            {BUILTIN_3D_MODELS.map((model) => {
              const isSelected =
                loadedModelName === model.name ||
                currentModelId === model.id ||
                vehicle.model3dUrl === model.url;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    loadGlbFromUrl(model.url, model.name, model.id, () => {
                      onModelChange?.(model.url, model.name);
                    });
                    setShowModelPicker(false);
                  }}
                  className={`text-left p-2 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? "bg-red-950/40 border-red-500 shadow-sm"
                      : "bg-neutral-900/80 hover:bg-neutral-800/80 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">
                        {model.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded font-medium shrink-0">
                        {model.badge}
                      </span>
                    </div>
                    <p className="text-[9px] text-neutral-400 line-clamp-2 mt-0.5 leading-tight">
                      {model.description}
                    </p>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 mt-1">
                        <Check className="w-2.5 h-2.5" />
                        Активно
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              onClick={() => {
                setShowModelPicker(false);
                fileInputRef.current?.click();
              }}
              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white rounded-lg border border-neutral-700 text-[10px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Upload className="w-3 h-3 text-red-400" />
              <span>Загрузить свой .GLB</span>
            </button>

            <button
              onClick={(e) => {
                handleResetToDefault(e);
                setShowModelPicker(false);
              }}
              className="px-2 py-1 text-neutral-400 hover:text-neutral-200 text-[10px] transition cursor-pointer"
            >
              Сбросить модель
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Car3DViewer: React.FC<Car3DViewerProps> = (props) => {
  return (
    <ErrorBoundary name="3D Автомобиль">
      <Car3DViewerInternal {...props} />
    </ErrorBoundary>
  );
};
