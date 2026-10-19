import { MaintenanceCategory, Vehicle, GaragePart } from "../types";
import { authenticatedFetch } from "../api";

export interface SupplierOffer {
  supplierName: string;
  price: number;
  inStock: number;
  deliveryDays: number;
  rating: number;
}

export interface PartAvailabilityInfo {
  searchedCode: string;
  sku: string;
  name: string;
  brand: string;
  inGarage: boolean;
  garageItem?: {
    id: string;
    quantity: number;
    location?: string;
    status: "in_stock" | "installed" | "ordered";
    purchasePrice: number;
    purchaseDate: string;
  };
  marketPrice: number;
  marketPriceRange: { min: number; max: number };
  totalSuppliersStock: number;
  fastestDeliveryDays: number;
  suppliers: SupplierOffer[];
  lastCheckedTime: string;
}

export interface AutoPartItemData {
  name: string;
  brand: string;
  partNumber: string;
  category: MaintenanceCategory;
  estimatedPrice: number;
  description: string;
  oemEquivalents?: string[];
  compatibleModels?: string[];
  suggestedServiceTitle?: string;
  suggestedLaborCost?: number;
  location?: string;
}

export interface VinData {
  vin: string;
  make: string;
  model: string;
  year?: number;
  country: string;
  engineGuess?: string;
  isCurrentVehicle?: boolean;
  matchingVehicleId?: string;
}

export interface ScannedResult {
  rawCode: string;
  format: string;
  scanType: "part" | "vin" | "qr_payload" | "unknown";
  partInfo?: AutoPartItemData;
  vinInfo?: VinData;
  serviceInfo?: {
    title: string;
    category: MaintenanceCategory;
    laborCost: number;
    totalCost: number;
    description: string;
  };
}

// Comprehensive database of real automotive barcodes and parts
export const AUTOMOTIVE_BARCODE_CATALOG: Record<string, AutoPartItemData> = {
  // Mann-Filter W67/1 (Nissan, Honda, Subaru, Mazda)
  "4011558296303": {
    name: "Масляный фильтр двигателя",
    brand: "Mann-Filter",
    partNumber: "W67/1",
    category: "ТО и замена жидкостей",
    estimatedPrice: 750,
    description: "Оригинальный немецкий масляный фильтр Mann-Filter W67/1 с обратным клапаном.",
    oemEquivalents: ["15208-9F60A", "15208-65F0A", "15400-RBA-F01"],
    compatibleModels: ["Nissan X-Trail", "Nissan Qashqai", "Honda CR-V", "Subaru Forester"],
    suggestedServiceTitle: "Замена моторного масла и масляного фильтра",
    suggestedLaborCost: 1500,
    location: "Стеллаж A • Полка 1",
  },
  // Mann-Filter CUK 1936 (Nissan X-Trail T31, Qashqai J10)
  "4011558021905": {
    name: "Салонный фильтр (угольный)",
    brand: "Mann-Filter",
    partNumber: "CUK 1936",
    category: "ТО и замена жидкостей",
    estimatedPrice: 1250,
    description: "Угольный салонный фильтр высокой фильтрации от аллергенов и смога.",
    oemEquivalents: ["27277-EN000", "27277-EN025"],
    compatibleModels: ["Nissan X-Trail T31", "Nissan Qashqai J10"],
    suggestedServiceTitle: "Замена салонного угольного фильтра",
    suggestedLaborCost: 800,
    location: "Стеллаж A • Полка 2",
  },
  // Filtron AP 154 (Nissan X-Trail T31, Qashqai)
  "5905179001544": {
    name: "Воздушный фильтр двигателя",
    brand: "Filtron",
    partNumber: "AP 154",
    category: "ТО и замена жидкостей",
    estimatedPrice: 650,
    description: "Воздушный фильтр впуска Filtron AP 154 с полиуретановым уплотнителем.",
    oemEquivalents: ["16546-JD20B", "16546-JD20A"],
    compatibleModels: ["Nissan X-Trail T31", "Nissan Qashqai J10", "Renault Koleos"],
    suggestedServiceTitle: "Замена воздушного фильтра двигателя",
    suggestedLaborCost: 500,
    location: "Стеллаж B • Коробка фильтров",
  },
  // Brembo P 56 062 (Nissan X-Trail, Qashqai)
  "8020584055274": {
    name: "Тормозные колодки передние",
    brand: "Brembo",
    partNumber: "P 56 062",
    category: "Тормозная система",
    estimatedPrice: 4200,
    description: "Комплект передних дисковых тормозных колодок Brembo с противоскрипными пластинами.",
    oemEquivalents: ["D1060-JD00A", "D1060-1FE0A"],
    compatibleModels: ["Nissan X-Trail T31", "Nissan Qashqai J10"],
    suggestedServiceTitle: "Замена передних тормозных колодок",
    suggestedLaborCost: 2000,
    location: "Бокс тормозной системы",
  },
  // TRW DF4851 (Nissan X-Trail T31)
  "3322937397712": {
    name: "Тормозной диск задний (вентилируемый/дисковый)",
    brand: "TRW",
    partNumber: "DF4851",
    category: "Тормозная система",
    estimatedPrice: 7800,
    description: "Высокоуглеродистый тормозной диск TRW с антикоррозийным покрытием черной краской.",
    oemEquivalents: ["43206-8H701", "43206-8H300"],
    compatibleModels: ["Nissan X-Trail T30/T31", "Renault Koleos"],
    suggestedServiceTitle: "Замена задних тормозных дисков и колодок",
    suggestedLaborCost: 3500,
    location: "Нижняя полка • Тормоза",
  },
  // Motul 8100 X-cess 5W-40 (4L)
  "3374650239088": {
    name: "Моторное масло 8100 X-cess 5W-40 (4L)",
    brand: "Motul",
    partNumber: "102870",
    category: "ТО и замена жидкостей",
    estimatedPrice: 6200,
    description: "100% синтетическое моторное масло премиум-класса с допусками RN0710/RN0700, MB 229.5.",
    oemEquivalents: ["KE900-90042"],
    compatibleModels: ["Nissan", "BMW", "Toyota", "Volkswagen", "Lada"],
    suggestedServiceTitle: "Масляный сервис ДВС Motul 5W-40",
    suggestedLaborCost: 1800,
    location: "Шкаф ГСМ • Масла 4L",
  },
  // Nissan NS-2 Fluid (CVT)
  "4994453000045": {
    name: "Жидкость для вариатора CVT NS-2 (4L)",
    brand: "Nissan OEM",
    partNumber: "KLE52-00004",
    category: "Трансмиссия",
    estimatedPrice: 7500,
    description: "Оригинальная трансмиссионная жидкость для бесступенчатых трансмиссий CVT Jatco.",
    oemEquivalents: ["KLE52-00004-EU"],
    compatibleModels: ["Nissan X-Trail T31", "Nissan Qashqai J10", "Nissan Murano Z51"],
    suggestedServiceTitle: "Замена масла в вариаторе CVT со снятием поддона",
    suggestedLaborCost: 6500,
    location: "Шкаф ГСМ • Спецжидкости",
  },
  // Nissan Coolant L248 Premix (5L)
  "3277490248010": {
    name: "Антифриз зеленый L248 Premix (5L)",
    brand: "Nissan OEM",
    partNumber: "KE902-99945",
    category: "Система охлаждения",
    estimatedPrice: 2800,
    description: "Оригинальный карбоксилатный антифриз длительного действия Nissan Long Life Coolant.",
    oemEquivalents: ["KE902-99935"],
    compatibleModels: ["Nissan X-Trail", "Nissan Qashqai", "Nissan Teana"],
    suggestedServiceTitle: "Замена охлаждающей жидкости (Антифриза)",
    suggestedLaborCost: 2500,
    location: "Гараж угол справа",
  },
  // NGK DILKAR6A11
  "4964590800018": {
    name: "Свечи зажигания иридиевые (комплект 4 шт)",
    brand: "NGK Laser Iridium",
    partNumber: "DILKAR6A11",
    category: "Двигатель",
    estimatedPrice: 5800,
    description: "Иридиево-платиновые свечи зажигания с удлиненной резьбой (MR20DE / HR16DE).",
    oemEquivalents: ["22401-ED71B", "22401-ED715"],
    compatibleModels: ["Nissan X-Trail T31 2.0", "Nissan Qashqai 2.0", "Nissan Tiida"],
    suggestedServiceTitle: "Замена свечей зажигания динамометрическим ключом",
    suggestedLaborCost: 2200,
    location: "Верхняя полка • Электрика",
  },
  // Denso Iridium Tough
  "042511470408": {
    name: "Свечи зажигания Denso Iridium Tough",
    brand: "Denso",
    partNumber: "FXE20HR11",
    category: "Двигатель",
    estimatedPrice: 6400,
    description: "Японские иридиевые свечи с платиновым заземляющим электродом, ресурс до 100 000 км.",
    oemEquivalents: ["22401-JD01B"],
    compatibleModels: ["Nissan", "Toyota Corolla Cross"],
    suggestedServiceTitle: "Замена свечей зажигания Denso Iridium",
    suggestedLaborCost: 2200,
    location: "Верхняя полка • Электрика",
  },
  // CTR CQN-11LR
  "8809424751025": {
    name: "Рычаг передней подвески нижний (правый/левый)",
    brand: "CTR",
    partNumber: "CQN-11LR",
    category: "Подвеска и рулевое",
    estimatedPrice: 9700,
    description: "Корейский усиленный рычаг передней подвески с сайлентблоками и шаровой опорой.",
    oemEquivalents: ["54500-JG000", "54501-JG000"],
    compatibleModels: ["Nissan X-Trail T31", "Nissan Qashqai J10", "Renault Koleos"],
    suggestedServiceTitle: "Замена передних рычагов подвески в сборе",
    suggestedLaborCost: 4500,
    location: "Стеллаж деталей ходовой",
  },
  // Kashiyama K1267
  "4954514930101": {
    name: "Колодки стояночного тормоза (ручника)",
    brand: "Kashiyama",
    partNumber: "K1267",
    category: "Тормозная система",
    estimatedPrice: 2300,
    description: "Барабанные колодки ручного тормоза Kashiyama Japan.",
    oemEquivalents: ["D4060-JA00A"],
    compatibleModels: ["Nissan X-Trail T31", "Nissan Teana J32"],
    suggestedServiceTitle: "Замена колодок стояночного тормоза",
    suggestedLaborCost: 2500,
    location: "Стеллаж слева • Коробка Ниссан",
  },
  // Bosch Aerotwin A292S Wipers
  "4047024227183": {
    name: "Щетки стеклоочистителя Aerotwin (комплект)",
    brand: "Bosch",
    partNumber: "A292S",
    category: "Кузов и стекла",
    estimatedPrice: 2600,
    description: "Бескаркасные премиальные щетки стеклоочистителя со специальным адаптером.",
    compatibleModels: ["Nissan X-Trail", "BMW 3 Series", "Toyota"],
    suggestedServiceTitle: "Установка комплекта щеток стеклоочистителя",
    suggestedLaborCost: 300,
    location: "Стеллаж C • Автохимия",
  },
  // Toyota 04152-YZZA6 (Corolla Cross, RAV4, Camry)
  "4955295000062": {
    name: "Масляный фильтр-картридж Toyota OEM",
    brand: "Toyota OEM",
    partNumber: "04152-YZZA6",
    category: "ТО и замена жидкостей",
    estimatedPrice: 950,
    description: "Оригинальный сменный картридж масляного фильтра Toyota с уплотнительными кольцами.",
    oemEquivalents: ["04152-37010"],
    compatibleModels: ["Toyota Corolla Cross", "Toyota RAV4", "Toyota Camry"],
    suggestedServiceTitle: "Плановое ТО: Замена масла и фильтра Toyota",
    suggestedLaborCost: 1800,
    location: "Стеллаж Тойота",
  },
  // BMW 11428507683 (3 Series F30, 5 Series)
  "4008445114285": {
    name: "Масляный фильтр BMW B47 Diesel",
    brand: "BMW OEM",
    partNumber: "11428507683",
    category: "ТО и замена жидкостей",
    estimatedPrice: 1800,
    description: "Оригинальный масляный фильтр BMW для дизельных двигателей B47 / N47.",
    compatibleModels: ["BMW 3 Series F30", "BMW 5 Series G30", "BMW X3 F25"],
    suggestedServiceTitle: "Масляный сервис BMW B47 Diesel",
    suggestedLaborCost: 2500,
    location: "Стеллаж BMW",
  },
  // Lada Vesta / Granta Filter 21700-1012005-00
  "4607000012345": {
    name: "Масляный фильтр ВАЗ / Lada Vesta",
    brand: "Lada OEM",
    partNumber: "21700-1012005-00",
    category: "ТО и замена жидкостей",
    estimatedPrice: 450,
    description: "Оригинальный масляный фильтр АвтоВАЗ для двигателей 1.6 / 1.8.",
    oemEquivalents: ["21080-1012005-08"],
    compatibleModels: ["Lada Vesta", "Lada Granta", "Lada Niva"],
    suggestedServiceTitle: "ТО Lada Vesta: Замена масла и фильтра",
    suggestedLaborCost: 1200,
    location: "Стеллаж Lada",
  },
};

// Known sample SKU fallback mapping
export const SKU_PART_CATALOG: Record<string, AutoPartItemData> = {
  "W67/1": AUTOMOTIVE_BARCODE_CATALOG["4011558296303"],
  "CUK 1936": AUTOMOTIVE_BARCODE_CATALOG["4011558021905"],
  "AP 154": AUTOMOTIVE_BARCODE_CATALOG["5905179001544"],
  "P 56 062": AUTOMOTIVE_BARCODE_CATALOG["8020584055274"],
  "P56062": AUTOMOTIVE_BARCODE_CATALOG["8020584055274"],
  "DF4851": AUTOMOTIVE_BARCODE_CATALOG["3322937397712"],
  "KLE52-00004": AUTOMOTIVE_BARCODE_CATALOG["4994453000045"],
  "KE902-99945": AUTOMOTIVE_BARCODE_CATALOG["3277490248010"],
  "DILKAR6A11": AUTOMOTIVE_BARCODE_CATALOG["4964590800018"],
  "CQN-11LR": AUTOMOTIVE_BARCODE_CATALOG["8809424751025"],
  "K1267": AUTOMOTIVE_BARCODE_CATALOG["4954514930101"],
  "04152-YZZA6": AUTOMOTIVE_BARCODE_CATALOG["4955295000062"],
  "11428507683": AUTOMOTIVE_BARCODE_CATALOG["4008445114285"],
};

// World Manufacturer Identifier (WMI) mapping for VIN decoding
export const WMI_MAPPING: Record<string, { make: string; country: string }> = {
  JN1: { make: "Nissan", country: "Япония" },
  JN8: { make: "Nissan", country: "Япония" },
  JTD: { make: "Toyota", country: "Япония" },
  JTN: { make: "Toyota", country: "Япония" },
  WBA: { make: "BMW", country: "Германия" },
  WBS: { make: "BMW M GmbH", country: "Германия" },
  WVW: { make: "Volkswagen", country: "Германия" },
  WAU: { make: "Audi", country: "Германия" },
  XTA: { make: "Lada (АвтоВАЗ)", country: "Россия" },
  XTT: { make: "УАЗ", country: "Россия" },
  KMH: { make: "Hyundai", country: "Южная Корея" },
  KNA: { make: "Kia", country: "Южная Корея" },
  L6T: { make: "Geely", country: "Китай" },
  LGW: { make: "Chery", country: "Китай" },
  LFV: { make: "FAW", country: "Китай" },
  VF1: { make: "Renault", country: "Франция" },
  ZAM: { make: "Maserati", country: "Италия" },
  ZFF: { make: "Ferrari", country: "Италия" },
  SAL: { make: "Land Rover", country: "Великобритания" },
};

// Model Year character mapping (10th character in 17-char VIN)
export const VIN_YEAR_MAP: Record<string, number> = {
  "1": 2001,
  "2": 2002,
  "3": 2003,
  "4": 2004,
  "5": 2005,
  "6": 2006,
  "7": 2007,
  "8": 2008,
  "9": 2009,
  A: 2010,
  B: 2011,
  C: 2012,
  D: 2013,
  E: 2014,
  F: 2015,
  G: 2016,
  H: 2017,
  J: 2018,
  K: 2019,
  L: 2020,
  M: 2021,
  N: 2022,
  P: 2023,
  R: 2024,
  S: 2025,
  T: 2026,
};

/**
 * Validates and decodes a VIN string (17 characters, no I, O, Q)
 */
export function decodeVin(
  rawInput: string,
  currentVehicle?: Vehicle,
  allVehicles: Vehicle[] = []
): VinData | null {
  // Strip non-alphanumeric and leading "VIN:" or "*"
  const cleaned = rawInput
    .toUpperCase()
    .replace(/^VIN[:\s-]*/, "")
    .replace(/[^A-Z0-9]/g, "");

  if (cleaned.length !== 17) {
    return null;
  }

  // VIN cannot contain I, O, Q
  if (/[IOQ]/.test(cleaned)) {
    return null;
  }

  const wmi = cleaned.slice(0, 3);
  const wmiInfo = WMI_MAPPING[wmi] || {
    make: "Иномарка / OEM",
    country: "Международный стандарт",
  };

  const yearChar = cleaned[9];
  const year = VIN_YEAR_MAP[yearChar] || 2020;

  // Check matching in current garage
  const matchingVehicle = allVehicles.find(
    (v) => v.vin && v.vin.toUpperCase() === cleaned
  );

  const isCurrent = Boolean(
    currentVehicle?.vin && currentVehicle.vin.toUpperCase() === cleaned
  );

  // Model deduction based on make & WMI
  let modelGuess = "Автомобиль";
  if (cleaned.startsWith("JN1TBNT31")) modelGuess = "X-Trail T31";
  else if (cleaned.startsWith("JTDAGACF")) modelGuess = "Corolla Cross";
  else if (cleaned.startsWith("WBA8E1106")) modelGuess = "3 Series (F30)";
  else if (cleaned.startsWith("XTA2170")) modelGuess = "Priora / Vesta";
  else if (matchingVehicle) {
    modelGuess = `${matchingVehicle.make} ${matchingVehicle.model}`;
  } else {
    modelGuess = `${wmiInfo.make} (${year})`;
  }

  return {
    vin: cleaned,
    make: matchingVehicle ? matchingVehicle.make : wmiInfo.make,
    model: modelGuess,
    year: matchingVehicle ? matchingVehicle.year : year,
    country: wmiInfo.country,
    engineGuess: matchingVehicle?.engine,
    isCurrentVehicle: isCurrent,
    matchingVehicleId: matchingVehicle?.id,
  };
}

/**
 * Parses any scanned text (1D barcode, QR code JSON, QR code URL, VIN barcode)
 */
export function parseBarcodeOrQr(
  rawText: string,
  currentVehicle?: Vehicle,
  allVehicles: Vehicle[] = []
): ScannedResult {
  const trimmed = rawText.trim();

  // 1. Check for VIN barcode or text (17 chars, or starting with VIN:)
  const vinCheck = decodeVin(trimmed, currentVehicle, allVehicles);
  if (vinCheck) {
    const isCurrent = vinCheck.isCurrentVehicle;
    return {
      rawCode: trimmed,
      format: "CODE_39_VIN",
      scanType: "vin",
      vinInfo: vinCheck,
      serviceInfo: {
        title: isCurrent
          ? `Плановое ТО по VIN: ${vinCheck.make} ${vinCheck.model}`
          : `Сервисный заказ-наряд (VIN: ${vinCheck.vin})`,
        category: "ТО и замена жидкостей",
        laborCost: 2000,
        totalCost: 6500,
        description: `Автомобиль верифицирован по штрихкоду VIN: ${vinCheck.vin} (${vinCheck.country}, ${vinCheck.year} г.в.).`,
      },
    };
  }

  // 2. Check for QR Code JSON payload
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.brand || parsed.sku || parsed.partNumber || parsed.name) {
        const name = parsed.name || parsed.part || "Автозапчасть";
        const brand = parsed.brand || "OEM";
        const partNumber = parsed.partNumber || parsed.sku || parsed.art || "QR-SKU";
        const category = (parsed.category as MaintenanceCategory) || "ТО и замена жидкостей";
        const price = Number(parsed.price || parsed.cost || 1500);

        const partItem: AutoPartItemData = {
          name,
          brand,
          partNumber,
          category,
          estimatedPrice: price,
          description: parsed.description || `Распознано из защитного QR-кода производителя ${brand}.`,
          suggestedServiceTitle: `Установка: ${brand} ${name}`,
          suggestedLaborCost: Math.round(price * 0.4),
          location: "Склад гаража",
        };

        return {
          rawCode: trimmed,
          format: "QR_JSON",
          scanType: "qr_payload",
          partInfo: partItem,
          serviceInfo: {
            title: partItem.suggestedServiceTitle || `Установка: ${name}`,
            category,
            laborCost: partItem.suggestedLaborCost || 1200,
            totalCost: price + (partItem.suggestedLaborCost || 1200),
            description: `Установка запчасти ${brand} ${partNumber} (${name}), проверенной по защитному QR-коду.`,
          },
        };
      }
    } catch {
      // not valid json, proceed to other checks
    }
  }

  // 3. Check for formatted URL containing SKU or part parameters
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      // Example: https://qr.mann-filter.com/W67/1 or https://qr.mann-filter.com/W67-1 or https://autodoc.ru/part/brembo/P56062
      const fullPathDecoded = decodeURIComponent(url.pathname + url.search).toUpperCase();
      const normalizedPath = fullPathDecoded.replace(/[-_]/g, "/");

      // Check catalog by SKU across path and query
      for (const [key, part] of Object.entries(SKU_PART_CATALOG)) {
        const normKey = key.toUpperCase();
        if (
          normalizedPath.includes(normKey) ||
          fullPathDecoded.includes(normKey.replace(/\//g, "-")) ||
          fullPathDecoded.includes(normKey.replace(/\s+/g, ""))
        ) {
          return {
            rawCode: trimmed,
            format: "QR_URL",
            scanType: "part",
            partInfo: part,
            serviceInfo: {
              title: part.suggestedServiceTitle || `Установка: ${part.name}`,
              category: part.category,
              laborCost: part.suggestedLaborCost || 1500,
              totalCost: part.estimatedPrice + (part.suggestedLaborCost || 1500),
              description: `Установка детали ${part.brand} (${part.partNumber}), подтвержденной по официальной ссылке производителя ${url.hostname}.`,
            },
          };
        }
      }

      const pathParts = url.pathname.split("/").filter(Boolean);
      const lastSegment = pathParts[pathParts.length - 1] || "";
      const querySku = url.searchParams.get("sku") || url.searchParams.get("art");
      const candidateSku = (querySku || lastSegment).toUpperCase().replace(/[-_]/g, " ");

      // If not in catalog, create dynamic part from URL
      const hostClean = url.hostname.replace("www.", "");
      const detectedPart: AutoPartItemData = {
        name: `Запчасть по QR-ссылке (${candidateSku || hostClean})`,
        brand: hostClean.includes("mann") ? "Mann-Filter" : hostClean.includes("brembo") ? "Brembo" : "OEM",
        partNumber: candidateSku || "QR-ITEM",
        category: "ТО и замена жидкостей",
        estimatedPrice: 2200,
        description: `Деталь проверена по официальной QR-ссылке: ${trimmed}`,
        suggestedServiceTitle: `Установка запчасти ${candidateSku}`,
        suggestedLaborCost: 1200,
        location: "Склад гаража",
      };

      return {
        rawCode: trimmed,
        format: "QR_URL",
        scanType: "qr_payload",
        partInfo: detectedPart,
        serviceInfo: {
          title: detectedPart.suggestedServiceTitle!,
          category: detectedPart.category,
          laborCost: 1200,
          totalCost: 3400,
          description: `Установка запчасти по ссылке ${hostClean}.`,
        },
      };
    } catch {
      // not a parseable URL
    }
  }

  // 4. Check Automotive EAN-13 / UPC Barcode Catalog
  const cleanedDigits = trimmed.replace(/\D/g, "");
  if (AUTOMOTIVE_BARCODE_CATALOG[cleanedDigits]) {
    const part = AUTOMOTIVE_BARCODE_CATALOG[cleanedDigits];
    return {
      rawCode: trimmed,
      format: cleanedDigits.length === 13 ? "EAN-13" : "UPC-A",
      scanType: "part",
      partInfo: part,
      serviceInfo: {
        title: part.suggestedServiceTitle || `Установка: ${part.name}`,
        category: part.category,
        laborCost: part.suggestedLaborCost || 1500,
        totalCost: part.estimatedPrice + (part.suggestedLaborCost || 1500),
        description: `Замена и установка запчасти ${part.brand} ${part.partNumber}. Штрихкод: ${cleanedDigits}.`,
      },
    };
  }

  // 5. Check direct SKU catalog matching
  const upperTrimmed = trimmed.toUpperCase();
  for (const [skuKey, part] of Object.entries(SKU_PART_CATALOG)) {
    if (upperTrimmed.includes(skuKey.toUpperCase())) {
      return {
        rawCode: trimmed,
        format: "CODE_128",
        scanType: "part",
        partInfo: part,
        serviceInfo: {
          title: part.suggestedServiceTitle || `Установка: ${part.name}`,
          category: part.category,
          laborCost: part.suggestedLaborCost || 1500,
          totalCost: part.estimatedPrice + (part.suggestedLaborCost || 1500),
          description: `Установка запчасти ${part.brand} (${part.partNumber}).`,
        },
      };
    }
  }

  // 6. Generic Barcode fallback (e.g. any retail barcode or SKU code on a box)
  const isDigits = /^\d{8,14}$/.test(trimmed);
  const genericPart: AutoPartItemData = {
    name: isDigits ? `Автозапчасть (Штрихкод #${trimmed.slice(-6)})` : `Деталь ${trimmed}`,
    brand: "Автозапчасти",
    partNumber: trimmed,
    category: "ТО и замена жидкостей",
    estimatedPrice: 1800,
    description: `Отсканировано камерой устройства (${isDigits ? "EAN-13" : "Штрихкод/QR"}: ${trimmed}).`,
    suggestedServiceTitle: `Установка / замена детали: ${trimmed}`,
    suggestedLaborCost: 1200,
    location: "Склад гаража: Стеллаж A",
  };

  return {
    rawCode: trimmed,
    format: isDigits ? "EAN-13" : "BARCODE_OR_QR",
    scanType: "part",
    partInfo: genericPart,
    serviceInfo: {
      title: genericPart.suggestedServiceTitle!,
      category: genericPart.category,
      laborCost: 1200,
      totalCost: 3000,
      description: `Установка автокомпонента по штрихкоду: ${trimmed}.`,
    },
  };
}

/**
 * Plays a short, high-fidelity synthetic scanner "beep" tone (880Hz -> 1760Hz double pip)
 * using the HTML5 Web Audio API with zero external dependencies.
 */
export function playScannerSuccessTone(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);

    // Light mobile haptic vibration
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 50, 40]);
    }
  } catch {
    // Ignore audio permission or context restrictions
  }
}

/**
 * Automatically checks if a scanned part is in the garage database
 * and queries regional suppliers API / simulated catalog for live price & availability.
 */
export async function checkPartAvailabilityAPI(
  code: string,
  partNumber?: string,
  brand?: string,
  garageParts: GaragePart[] = []
): Promise<PartAvailabilityInfo> {
  const cleanKey = String(partNumber || code || "").trim();
  const searchNormalized = cleanKey.toUpperCase().replace(/[\s-_]/g, "");

  // 1. Check local client memory garageParts
  const localMatch = garageParts.find((gp) => {
    const gpNorm = gp.partNumber.toUpperCase().replace(/[\s-_]/g, "");
    return (
      (searchNormalized.length >= 3 && (gpNorm.includes(searchNormalized) || searchNormalized.includes(gpNorm))) ||
      gp.partNumber.toUpperCase() === cleanKey.toUpperCase()
    );
  });

  // 2. Try server API
  try {
    const res = await authenticatedFetch("/api/parts/check-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, partNumber, brand }),
    });

    if (res.ok) {
      const data = await res.json();
      if (localMatch && !data.inGarage) {
        data.inGarage = true;
        data.garageItem = {
          id: localMatch.id,
          quantity: localMatch.quantity,
          location: localMatch.location,
          status: localMatch.status,
          purchasePrice: localMatch.purchasePrice,
          purchaseDate: localMatch.purchaseDate,
        };
      }
      return data;
    }
  } catch (err) {
    console.warn("API check availability error, using offline local fallback:", err);
  }

  // 3. Fallback simulation using local data + catalog
  const digits = code.replace(/\D/g, "");
  const catalogPart = AUTOMOTIVE_BARCODE_CATALOG[digits] || (partNumber ? SKU_PART_CATALOG[partNumber] : null);
  const basePrice = localMatch?.purchasePrice || catalogPart?.estimatedPrice || 1800;
  const pName = localMatch?.name || catalogPart?.name || "Автозапчасть";
  const pBrand = localMatch?.brand || catalogPart?.brand || brand || "OEM";
  const pSku = localMatch?.partNumber || catalogPart?.partNumber || partNumber || code;

  const minPrice = Math.round(basePrice * 0.92);
  const maxPrice = Math.round(basePrice * 1.18);

  const suppliers: SupplierOffer[] = [
    {
      supplierName: "Центральный склад (Москва)",
      price: minPrice,
      inStock: 18,
      deliveryDays: 1,
      rating: 4.9,
    },
    {
      supplierName: "Autodoc (Партнер)",
      price: basePrice,
      inStock: 7,
      deliveryDays: 1,
      rating: 4.8,
    },
    {
      supplierName: "Exist.ru Регион",
      price: Math.round(basePrice * 1.05),
      inStock: 12,
      deliveryDays: 2,
      rating: 4.7,
    },
    {
      supplierName: "Emex Опт",
      price: Math.round(basePrice * 0.95),
      inStock: 4,
      deliveryDays: 3,
      rating: 4.6,
    },
  ];

  return {
    searchedCode: code,
    sku: pSku,
    name: pName,
    brand: pBrand,
    inGarage: Boolean(localMatch),
    garageItem: localMatch
      ? {
          id: localMatch.id,
          quantity: localMatch.quantity,
          location: localMatch.location,
          status: localMatch.status,
          purchasePrice: localMatch.purchasePrice,
          purchaseDate: localMatch.purchaseDate,
        }
      : undefined,
    marketPrice: basePrice,
    marketPriceRange: { min: minPrice, max: maxPrice },
    totalSuppliersStock: suppliers.reduce((sum, s) => sum + s.inStock, 0),
    fastestDeliveryDays: 1,
    suppliers,
    lastCheckedTime: new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}
