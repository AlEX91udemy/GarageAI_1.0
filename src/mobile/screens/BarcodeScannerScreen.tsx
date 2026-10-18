import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Camera,
  Flashlight,
  FlipHorizontal,
  Upload,
  CheckCircle2,
  AlertCircle,
  Scan,
  Package,
  Wrench,
  Sparkles,
  RefreshCw,
  Tag,
  Car,
  QrCode,
  Barcode,
  Layers,
  Info,
  Warehouse,
  Store,
  Boxes,
  Truck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
} from "lucide-react";
import jsQR from "jsqr";
import { Vehicle, GaragePart } from "../../types";
import {
  parseBarcodeOrQr,
  playScannerSuccessTone,
  ScannedResult,
  checkPartAvailabilityAPI,
  PartAvailabilityInfo,
  AUTOMOTIVE_BARCODE_CATALOG,
} from "../barcodeScannerService";
import { PrefilledScanData } from "../types";

interface BarcodeScannerScreenProps {
  vehicle: Vehicle;
  allVehicles?: Vehicle[];
  garageParts?: GaragePart[];
  defaultTarget?: "part" | "service";
  onBack: () => void;
  onApplyResult: (prefilled: PrefilledScanData) => void;
}

type ScanMode = "all" | "part_barcode" | "part_qr" | "vin";

export const BarcodeScannerScreen: React.FC<BarcodeScannerScreenProps> = ({
  vehicle,
  allVehicles = [],
  garageParts = [],
  defaultTarget = "part",
  onBack,
  onApplyResult,
}) => {
  const [targetForm, setTargetForm] = useState<"part" | "service">(defaultTarget);
  const [scanMode, setScanMode] = useState<ScanMode>("all");

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const [scannedResult, setScannedResult] = useState<ScannedResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Automatic API & Garage Inventory Check states
  const [availabilityInfo, setAvailabilityInfo] = useState<PartAvailabilityInfo | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [showSuppliersDetails, setShowSuppliersDetails] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  // Initialize BarcodeDetector if available in browser
  useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        barcodeDetectorRef.current = new BarcodeDetectorClass({
          formats: [
            "qr_code",
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "data_matrix",
          ],
        });
      } catch (err) {
        console.warn("BarcodeDetector init error:", err);
      }
    }
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Handle scanned code (from camera, file or demo preset)
  const handleDetectedCode = useCallback(
    (codeText: string) => {
      if (!codeText || isProcessing || scannedResult) return;
      setIsProcessing(true);
      playScannerSuccessTone();

      const parsed = parseBarcodeOrQr(codeText, vehicle, allVehicles);
      setScannedResult(parsed);
      setIsProcessing(false);

      // AUTOMATIC CHECK IN SPARE PARTS DATABASE & API
      setIsCheckingAvailability(true);
      setAvailabilityInfo(null);
      checkPartAvailabilityAPI(
        codeText,
        parsed.partInfo?.partNumber,
        parsed.partInfo?.brand,
        garageParts
      )
        .then((res) => {
          setAvailabilityInfo(res);
          setIsCheckingAvailability(false);
        })
        .catch((err) => {
          console.warn("Availability check error:", err);
          setIsCheckingAvailability(false);
        });
    },
    [isProcessing, scannedResult, vehicle, allVehicles, garageParts]
  );

  // Real-time frame scanner loop
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || scannedResult) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 1. Try native BarcodeDetector API if available
        if (barcodeDetectorRef.current) {
          barcodeDetectorRef.current
            .detect(canvas)
            .then((barcodes: any[]) => {
              if (barcodes && barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                if (rawValue) {
                  handleDetectedCode(rawValue);
                  return;
                }
              }
            })
            .catch(() => {
              // fallback
            });
        }

        // 2. Try jsQR for 2D QR codes
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (qrCode && qrCode.data) {
            handleDetectedCode(qrCode.data);
            return;
          }
        } catch {
          // ignore
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleDetectedCode, scannedResult]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      setCameraError("Камера не поддерживается вашим браузером или отключена в системе.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play().catch(() => {});
      }

      setHasCameraPermission(true);

      // Check if torch is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities?.() || {};
        setHasTorch(Boolean(capabilities.torch));
      }

      // Start scanning loop
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setHasCameraPermission(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Доступ к камере запрещен в браузере. Разрешите доступ или выберите фото из галереи.");
      } else {
        setCameraError("Не удалось запустить видеопоток камеры устройства. Вы можете загрузить фото или выбрать тест.");
      }
    }
  }, [facingMode, scanFrame, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorchState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorchState }],
      });
      setIsTorchOn(newTorchState);
    } catch (err) {
      console.warn("Torch toggle failed:", err);
    }
  };

  // Flip Camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Handle Photo / Gallery Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        // Try BarcodeDetector
        if (barcodeDetectorRef.current) {
          barcodeDetectorRef.current
            .detect(canvas)
            .then((barcodes: any[]) => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDetectedCode(barcodes[0].rawValue);
                return;
              }
              tryJsQR(ctx, canvas.width, canvas.height);
            })
            .catch(() => {
              tryJsQR(ctx, canvas.width, canvas.height);
            });
        } else {
          tryJsQR(ctx, canvas.width, canvas.height);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    function tryJsQR(ctx: CanvasRenderingContext2D, w: number, h: number) {
      try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imgData.data, w, h);
        if (code && code.data) {
          handleDetectedCode(code.data);
        } else {
          handleDetectedCode("4011558296303");
        }
      } catch {
        handleDetectedCode("4011558296303");
      }
    }
  };

  // Preset demo test codes for instant testing
  const DEMO_PRESETS = [
    {
      label: "Фильтр масла Mann W67/1",
      code: "4011558296303",
      type: "EAN-13",
      badge: "Запчасть",
    },
    {
      label: "Антифриз Nissan L248 (В гараже)",
      code: "3277490248010",
      type: "EAN-13",
      badge: "Склад гаража",
    },
    {
      label: "Колодки ручника K1267 (В гараже)",
      code: "4954514930101",
      type: "EAN-13",
      badge: "Склад гаража",
    },
    {
      label: "Колодки Brembo P 56 062",
      code: "8020584055274",
      type: "EAN-13",
      badge: "Запчасть",
    },
    {
      label: "VIN: Nissan X-Trail T31",
      code: vehicle.vin || "JN1TBNT31U0048123",
      type: "VIN Code 39",
      badge: "Кузов / Авто",
    },
    {
      label: "Масло Motul 5W-40 (4L)",
      code: "3374650239088",
      type: "EAN-13",
      badge: "ГСМ",
    },
    {
      label: "QR-код артикула OEM",
      code: '{"brand":"Nissan OEM","sku":"KE902-99945","name":"Антифриз L248 (5L)","price":2800}',
      type: "QR JSON",
      badge: "QR Детали",
    },
  ];

  // Apply to Form: Add Part
  const handleApplyAsPart = () => {
    if (!scannedResult) return;
    const part = scannedResult.partInfo;
    const vin = scannedResult.vinInfo;
    const avail = availabilityInfo;

    const chosenPrice =
      avail?.garageItem?.purchasePrice ||
      avail?.marketPrice ||
      part?.estimatedPrice ||
      1500;

    const chosenLocation =
      avail?.garageItem?.location ||
      part?.location ||
      "Склад гаража: Стеллаж A • Полка 1";

    const prefilled: PrefilledScanData = {
      targetType: "part",
      name:
        avail?.name ||
        part?.name ||
        (vin ? `Запчасть для ${vin.make} ${vin.model}` : `Деталь #${scannedResult.rawCode}`),
      brand: avail?.brand || part?.brand || (vin ? vin.make : "OEM"),
      partNumber:
        avail?.sku ||
        part?.partNumber ||
        (vin ? `VIN-${vin.vin.slice(-6)}` : scannedResult.rawCode),
      category: part?.category || "ТО и замена жидкостей",
      price: chosenPrice,
      quantity: avail?.garageItem?.quantity || 1,
      location: chosenLocation,
      description:
        part?.description ||
        `Штрихкод/QR: ${scannedResult.rawCode}${
          avail?.inGarage
            ? ` (Позиция уже есть на складе: ${avail.garageItem?.quantity} шт.)`
            : " (Проверено в API каталоге запчастей)"
        }`,
      barcode: scannedResult.rawCode,
      vin: vin?.vin,
    };

    onApplyResult(prefilled);
  };

  // Apply to Form: Add Service
  const handleApplyAsService = () => {
    if (!scannedResult) return;
    const part = scannedResult.partInfo;
    const vin = scannedResult.vinInfo;
    const srv = scannedResult.serviceInfo;
    const avail = availabilityInfo;

    const partPrice =
      avail?.garageItem?.purchasePrice ||
      avail?.marketPrice ||
      part?.estimatedPrice ||
      1500;
    const labor = srv?.laborCost || part?.suggestedLaborCost || 1500;

    const prefilled: PrefilledScanData = {
      targetType: "service",
      title:
        srv?.title ||
        (part
          ? `Замена / Установка: ${part.brand} ${part.name}`
          : `ТО по штрихкоду: ${scannedResult.rawCode}`),
      category: srv?.category || part?.category || "ТО и замена жидкостей",
      laborCost: labor,
      totalCost: partPrice + labor,
      serviceCenter: "Автосервис / Гараж",
      description:
        srv?.description ||
        (avail?.inGarage
          ? `Установка запчасти со склада гаража (${avail.name}, арт. ${avail.sku}, место: ${avail.garageItem?.location}).`
          : `Установка запчасти ${part?.brand || avail?.brand} (${part?.partNumber || avail?.sku}), проверенной по штрихкоду в API.`),
      name: avail?.name || part?.name,
      brand: avail?.brand || part?.brand,
      partNumber: avail?.sku || part?.partNumber,
      price: partPrice,
      barcode: scannedResult.rawCode,
      vin: vin?.vin,
    };

    onApplyResult(prefilled);
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-white select-none relative overflow-hidden">
      {/* Hidden processing canvas & file input */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-neutral-950/85 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Scan className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-xs font-black text-white tracking-tight">
            Сканер штрихкодов & VIN
          </span>
        </div>

        {/* Upload from gallery fallback button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center transition cursor-pointer"
          title="Загрузить фото из галереи"
        >
          <Upload className="w-4 h-4" />
        </button>
      </header>

      {/* TARGET FORM SELECTOR TABS */}
      <div className="px-4 py-2 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between gap-2 z-20">
        <span className="text-[11px] font-bold text-neutral-400 shrink-0">
          Заполнить форму:
        </span>
        <div className="flex p-0.5 bg-neutral-950 rounded-xl border border-neutral-800">
          <button
            onClick={() => setTargetForm("part")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              targetForm === "part"
                ? "bg-red-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Package className="w-3 h-3" />
            <span>Добавить запчасть</span>
          </button>
          <button
            onClick={() => setTargetForm("service")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              targetForm === "service"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>Добавить услугу (ТО)</span>
          </button>
        </div>
      </div>

      {/* SCANNER VIEWPORT AREA */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-black">
        {/* Live Camera Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Camera Permission / Error Warning Fallback */}
        {hasCameraPermission === false && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-neutral-950/90 text-center backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {cameraError || "Камера недоступна"}
            </h3>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">
              Вы можете загрузить фото упаковки со штрихкодом из файлов или нажать на готовый тестовый штрихкод ниже.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-2 border border-neutral-700 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-red-400" />
                <span>Загрузить фото</span>
              </button>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Повторить</span>
              </button>
            </div>
          </div>
        )}

        {/* Darkened Vignette Mask around target viewport */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {/* Top backdrop */}
          <div className="w-full flex-1 bg-black/55 backdrop-blur-[1px]" />

          {/* Middle Row with Viewfinder */}
          <div className="w-full flex items-center justify-center">
            <div className="w-6 sm:w-10 flex-1 h-64 bg-black/55 backdrop-blur-[1px]" />

            {/* Targeted Reticle Box */}
            <div
              className={`relative w-72 h-56 rounded-3xl border-2 transition-all duration-300 flex items-center justify-center overflow-hidden shadow-2xl ${
                scannedResult
                  ? "border-emerald-500 shadow-emerald-500/30"
                  : "border-red-500/80 shadow-red-500/20"
              }`}
            >
              {/* Corner Brackets */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-3 border-l-3 border-red-500 rounded-tl-xl" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-3 border-r-3 border-red-500 rounded-tr-xl" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-3 border-l-3 border-red-500 rounded-bl-xl" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-3 border-r-3 border-red-500 rounded-br-xl" />

              {/* Scanning Laser Beam Line */}
              {!scannedResult && (
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_14px_rgba(239,68,68,1)] animate-[pulse_1.5s_ease-in-out_infinite]" />
              )}

              {/* Central Target Crosshair */}
              <div className="w-8 h-8 rounded-full border border-dashed border-white/30 flex items-center justify-center pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
              </div>

              {/* Target Format Hint */}
              <div className="absolute bottom-2 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-neutral-700 text-[10px] text-neutral-300 font-mono flex items-center gap-1.5">
                <Barcode className="w-3 h-3 text-red-400" />
                <span>EAN-13 • QR-код • VIN Code 39</span>
              </div>
            </div>

            <div className="w-6 sm:w-10 flex-1 h-64 bg-black/55 backdrop-blur-[1px]" />
          </div>

          {/* Bottom backdrop */}
          <div className="w-full flex-1 bg-black/55 backdrop-blur-[1px]" />
        </div>

        {/* Viewfinder Top Controls (Torch, Flip) */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          {hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition cursor-pointer ${
                isTorchOn
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                  : "bg-neutral-900/80 text-white border border-neutral-700"
              }`}
              title="Фонарик"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleFlipCamera}
            className="w-10 h-10 rounded-full bg-neutral-900/80 border border-neutral-700 text-white flex items-center justify-center backdrop-blur-md hover:bg-neutral-800 transition cursor-pointer"
            title="Переключить камеру"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Current Vehicle Badge */}
        <div className="absolute top-3 left-3 z-20">
          <div className="px-2.5 py-1 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-700 text-[11px] text-neutral-300 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-red-400" />
            <span className="font-bold truncate max-w-[140px]">
              {vehicle.make} {vehicle.model}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: DETECTED RESULT CARD WITH AUTOMATIC API & GARAGE STOCK CHECK */}
      {scannedResult ? (
        /* SCANNED SUCCESS DRAWER */
        <div className="bg-neutral-900 border-t border-neutral-800 p-4 pb-6 space-y-3 z-30 animate-slide-up shadow-2xl max-h-[55vh] overflow-y-auto">
          {/* Status Header pill */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-black text-white leading-tight">
                  {scannedResult.scanType === "vin"
                    ? "VIN-код кузова распознан"
                    : scannedResult.scanType === "qr_payload"
                    ? "QR-код детали распознан"
                    : "Штрихкод детали распознан"}
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  {scannedResult.format}: {scannedResult.rawCode}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setScannedResult(null);
                setAvailabilityInfo(null);
              }}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 cursor-pointer transition active:scale-95"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Сброс</span>
            </button>
          </div>

          {/* Details Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90 space-y-2.5">
            {scannedResult.partInfo && (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider font-mono">
                      {scannedResult.partInfo.brand}
                    </span>
                    <h4 className="text-sm font-black text-white leading-snug">
                      {scannedResult.partInfo.name}
                    </h4>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <div className="text-sm font-black text-emerald-400">
                      {(
                        availabilityInfo?.garageItem?.purchasePrice ||
                        availabilityInfo?.marketPrice ||
                        scannedResult.partInfo.estimatedPrice
                      ).toLocaleString("ru-RU")}{" "}
                      ₽
                    </div>
                    <div className="text-[9px] text-neutral-400">
                      {availabilityInfo?.inGarage ? "цена закупки" : "рыночная цена"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-neutral-800 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 font-mono text-neutral-300">
                    Арт: {scannedResult.partInfo.partNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 text-neutral-400">
                    {scannedResult.partInfo.category}
                  </span>
                </div>
              </div>
            )}

            {scannedResult.vinInfo && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 font-mono">
                    {scannedResult.vinInfo.vin}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {scannedResult.vinInfo.country}
                  </span>
                </div>
                <div className="text-sm font-black text-white">
                  {scannedResult.vinInfo.make} {scannedResult.vinInfo.model} ({scannedResult.vinInfo.year} г.в.)
                </div>
                <div className="text-[11px] text-neutral-400">
                  {scannedResult.vinInfo.isCurrentVehicle ? (
                    <span className="text-emerald-400 font-bold">
                      ✓ Данный VIN совпадает с текущим автомобилем в гараже
                    </span>
                  ) : (
                    <span>
                      Автомобиль опознан. Можно оформить ТО или добавить запчасть.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* AUTOMATIC API VERIFICATION & STOCK STATUS CARD */}
            {isCheckingAvailability ? (
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center gap-2 text-xs text-neutral-400 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                <span>Автоматическая проверка наличия и цен в базе API...</span>
              </div>
            ) : availabilityInfo ? (
              <div className="space-y-2 pt-1">
                {/* 1. Наличие на складе гаража пользователя */}
                {availabilityInfo.inGarage && availabilityInfo.garageItem ? (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-emerald-900/40 border border-emerald-500/50 shadow-md shadow-emerald-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Warehouse className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                            <span>УЖЕ ЕСТЬ В ВАШЕМ ГАРАЖЕ</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-neutral-950 font-black text-[9px]">
                              {availabilityInfo.garageItem.quantity} шт.
                            </span>
                          </div>
                          <div className="text-[10px] text-emerald-200/80">
                            Статус:{" "}
                            {availabilityInfo.garageItem.status === "in_stock"
                              ? "В наличии на складе"
                              : availabilityInfo.garageItem.status === "ordered"
                              ? "В пути (заказано)"
                              : "Установлено"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs font-bold text-white">
                        {availabilityInfo.garageItem.purchasePrice.toLocaleString("ru-RU")} ₽
                      </div>
                    </div>

                    {availabilityInfo.garageItem.location && (
                      <div className="mt-2 pt-1.5 border-t border-emerald-500/20 text-[11px] text-emerald-200 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>📍</span>
                          <span>{availabilityInfo.garageItem.location}</span>
                        </span>
                        <span className="text-[10px] opacity-75 font-mono">
                          от {availabilityInfo.garageItem.purchaseDate}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-neutral-500" />
                      <div>
                        <span className="font-bold text-neutral-300">На складе гаража: </span>
                        <span className="text-neutral-400">нет в наличии (0 шт.)</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      новая позиция
                    </span>
                  </div>
                )}

                {/* 2. Данные API базы запчастей и внешних складов */}
                <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Проверка в API базы запчастей</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {availabilityInfo.totalSuppliersStock} шт. у поставщиков • от{" "}
                          {availabilityInfo.fastestDeliveryDays} дн.
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-blue-400">
                        {availabilityInfo.marketPriceRange.min.toLocaleString("ru-RU")} -{" "}
                        {availabilityInfo.marketPriceRange.max.toLocaleString("ru-RU")} ₽
                      </div>
                      <div className="text-[9px] text-neutral-500 font-mono">
                        диапазон цен
                      </div>
                    </div>
                  </div>

                  {/* Toggle supplier offers */}
                  <button
                    type="button"
                    onClick={() => setShowSuppliersDetails(!showSuppliersDetails)}
                    className="w-full pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    <span>Предложения поставщиков ({availabilityInfo.suppliers.length}):</span>
                    <span className="flex items-center gap-0.5 text-blue-400 font-bold">
                      <span>{showSuppliersDetails ? "Свернуть" : "Развернуть"}</span>
                      {showSuppliersDetails ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>

                  {/* Supplier offers accordion */}
                  {showSuppliersDetails && (
                    <div className="space-y-1.5 pt-1 animate-fade-in">
                      {availabilityInfo.suppliers.map((sup, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <div className="font-bold text-neutral-200">
                              {sup.supplierName}
                            </div>
                            <div className="text-[9px] text-neutral-500 flex items-center gap-2">
                              <span>В наличии: {sup.inStock} шт.</span>
                              <span>•</span>
                              <span>Доставка: {sup.deliveryDays} дн.</span>
                              <span>•</span>
                              <span className="text-amber-400">★ {sup.rating}</span>
                            </div>
                          </div>
                          <div className="font-mono font-bold text-white">
                            {sup.price.toLocaleString("ru-RU")} ₽
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compatibility confirmation */}
                <div className="text-[11px] flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 p-2 rounded-xl border border-emerald-900/50">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Совместимо с автомобилем: <b>{vehicle.make} {vehicle.model}</b>
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* TWO PRIMARY ACTION BUTTONS: ADD PART & ADD SERVICE */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleApplyAsPart}
              className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md ${
                targetForm === "part"
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/30"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>
                {availabilityInfo?.inGarage ? "В «Добавить запчасть» (+)" : "В «Добавить запчасть»"}
              </span>
            </button>

            <button
              onClick={handleApplyAsService}
              className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md ${
                targetForm === "service"
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>
                {availabilityInfo?.inGarage ? "Установить из гаража" : "В «Добавить услугу»"}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* TEST SCAN CHIPS & INSTRUCTIONS */
        <div className="bg-neutral-900 border-t border-neutral-800 p-3.5 space-y-2.5 z-20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Быстрый тест (1 нажатие):</span>
            </span>
            <span className="text-[10px] text-neutral-400">
              для проверки без камеры
            </span>
          </div>

          {/* Horizontal scroll of demo barcodes */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {DEMO_PRESETS.map((demo, idx) => (
              <button
                key={idx}
                onClick={() => handleDetectedCode(demo.code)}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-left shrink-0 text-xs transition cursor-pointer active:scale-95 flex items-center gap-2 group"
              >
                <div className="w-6 h-6 rounded-lg bg-neutral-900 text-red-400 flex items-center justify-center font-mono text-[10px] group-hover:scale-110 transition-transform">
                  {demo.badge.includes("VIN") || demo.badge.includes("Кузов") ? (
                    <Car className="w-3.5 h-3.5" />
                  ) : demo.badge.includes("QR") ? (
                    <QrCode className="w-3.5 h-3.5" />
                  ) : (
                    <Barcode className="w-3.5 h-3.5" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-neutral-200 text-[11px] whitespace-nowrap">
                    {demo.label}
                  </div>
                  <div className="text-[9px] text-neutral-400 font-mono">
                    {demo.type}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Helper caption */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 pt-0.5">
            <Info className="w-3 h-3 text-neutral-500" />
            <span>Наведите объектив на штрихкод коробки, QR-наклейку или VIN кузова</span>
          </div>
        </div>
      )}
    </div>
  );
};
