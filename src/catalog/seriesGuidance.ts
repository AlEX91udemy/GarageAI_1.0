import type { Vehicle } from "../types";
import type { PublicKnowledgeSource, VehicleRecommendation } from "./types";
import { publicKnowledgeSources } from "./publicSources";

type SeriesGuidance = {
  id: string;
  make: string;
  model?: string;
  title: string;
  text: string;
  category: VehicleRecommendation["category"];
  risk: VehicleRecommendation["risk"];
  sourceIds: string[];
  keywords: string[];
};

const makeGuidance: Array<Omit<SeriesGuidance, "id" | "model"> & { id: string; make: string }> = [
  { id: "make-toyota", make: "Toyota", title: "Плановая проверка Toyota", text: "Для Toyota начинать диагностику следует с истории обслуживания, уровня жидкостей, охлаждения, тормозов и сканирования кодов. Интервалы и допуски сверяйте с руководством конкретного года, рынка и двигателя.", category: "maintenance", risk: "routine", sourceIds: ["source-toyota-manuals"], keywords: ["toyota", "то", "масло", "охлаждение"] },
  { id: "make-nissan", make: "Nissan", title: "Плановая проверка Nissan", text: "Для Nissan отдельно проверяйте состояние охлаждения, вариатора или автоматической коробки, утечки и историю замены жидкостей. Рекомендации зависят от поколения и рынка.", category: "transmission", risk: "routine", sourceIds: ["source-nissan-manuals"], keywords: ["nissan", "вариатор", "cvt", "масло"] },
  { id: "make-bmw", make: "BMW", title: "Плановая проверка BMW", text: "Для BMW полезно начинать с диагностики электронных блоков, системы охлаждения, утечек масла и состояния цепного привода. Точные операции определяются кодом двигателя и кузовом.", category: "engine", risk: "routine", sourceIds: ["source-bmw-manuals"], keywords: ["bmw", "цепь", "охлаждение", "ошибк"] },
  { id: "make-mercedes-benz", make: "Mercedes-Benz", title: "Плановая проверка Mercedes-Benz", text: "Для Mercedes-Benz сначала считывайте ошибки всех блоков, затем проверяйте охлаждение, утечки, аккумулятор и состояние автоматической коробки. Руководство подбирается по идентификатору автомобиля.", category: "diagnostics", risk: "routine", sourceIds: ["source-mercedes-manuals"], keywords: ["mercedes", "диагност", "аккумулятор", "коробк"] },
  { id: "make-volkswagen", make: "Volkswagen", title: "Плановая проверка Volkswagen", text: "Для Volkswagen учитывайте код двигателя и коробки: проверяйте охлаждение, привод ГРМ, DSG или автомат, а также электронные ошибки. Не переносите интервалы между разными моторами.", category: "transmission", risk: "routine", sourceIds: ["source-vw-manuals"], keywords: ["volkswagen", "vw", "dsg", "грм"] },
  { id: "make-kia", make: "Kia", title: "Плановая проверка Kia", text: "Для Kia сверяйте регламент по году и двигателю, уделяя внимание охлаждению, цепи или ремню ГРМ, автоматической коробке и тормозам.", category: "maintenance", risk: "routine", sourceIds: ["source-kia-manuals"], keywords: ["kia", "киа", "регламент", "грм"] },
  { id: "make-hyundai", make: "Hyundai", title: "Плановая проверка Hyundai", text: "Для Hyundai проверяйте охлаждение, привод ГРМ, состояние масла и коробки передач, а при горящем индикаторе считывайте коды до замены деталей.", category: "diagnostics", risk: "routine", sourceIds: ["source-hyundai-manuals"], keywords: ["hyundai", "хендай", "масло", "ошибк"] },
  { id: "make-mazda", make: "Mazda", title: "Плановая проверка Mazda", text: "Для Mazda контролируйте уровень масла, охлаждение, состояние подвески и автоматической коробки. Для Skyactiv и дизельных моторов используйте отдельный регламент двигателя.", category: "engine", risk: "routine", sourceIds: ["source-mazda-manuals"], keywords: ["mazda", "мазда", "skyactiv", "подвеск"] },
  { id: "make-lada", make: "LADA", title: "Плановая проверка LADA", text: "Для LADA проверяйте привод ГРМ, охлаждение, тормоза, подвеску и утечки. Объёмы жидкостей и интервалы берите из руководства конкретной модели и двигателя.", category: "maintenance", risk: "routine", sourceIds: ["source-avtovaz-manuals"], keywords: ["лада", "lada", "грм", "подвеск"] },
  { id: "make-renault", make: "Renault", title: "Плановая проверка Renault", text: "Для Renault сверяйте код двигателя и коробки, проверяйте привод ГРМ, охлаждение, электрику и состояние подвески. Для разных рынков регламенты могут отличаться.", category: "maintenance", risk: "routine", sourceIds: ["source-renault-manuals"], keywords: ["renault", "рено", "грм", "электрик"] },
  { id: "make-chery", make: "Chery", title: "Плановая проверка Chery", text: "Для Chery отдельно проверяйте роботизированную или вариаторную коробку, охлаждение, турбосистему и электронные ошибки. Подтверждайте интервалы документом нужного рынка.", category: "transmission", risk: "routine", sourceIds: ["source-chery-manuals"], keywords: ["chery", "чери", "робот", "вариатор"] },
  { id: "make-haval", make: "Haval", title: "Плановая проверка Haval", text: "Для Haval проверяйте турбодвигатель, охлаждение, роботизированную коробку, полный привод и электронные коды. Не используйте один регламент для разных двигателей.", category: "transmission", risk: "routine", sourceIds: ["source-haval-manuals"], keywords: ["haval", "хавал", "турбо", "робот"] },
];

const modelSeriesDefinitions: Array<[string, string[], string, string, SeriesGuidance["category"], string[], string[]]> = [
  ["Toyota", ["Camry", "Corolla", "RAV4", "Land Cruiser"], "Проверить охлаждение и трансмиссию", "В этой серии при жалобах на рывки или перегрев сначала проверьте уровень и состояние жидкостей, утечки, ошибки блока управления и историю обслуживания. Точную жидкость и интервал подтвердите по двигателю и коробке.", "cooling", ["source-toyota-manuals"], ["перегрев", "рывок", "масло", "охлаждение"]],
  ["Nissan", ["X-Trail", "Qashqai", "Teana", "Almera"], "Проверить CVT или автомат по истории обслуживания", "Для этой серии при вибрации, задержке включения или шуме коробки сначала исключите низкий уровень жидкости, перегрев и ошибки. T31 и T32 X-Trail нельзя считать одной конфигурацией; нужен точный год и рынок.", "transmission", ["source-nissan-manuals"], ["вариатор", "cvt", "рывок", "коробк"]],
  ["BMW", ["3 Series", "5 Series", "X3", "X5"], "Проверить охлаждение и цепной привод", "При шуме на холодную, расходе масла или перегреве проверьте систему охлаждения, утечки, фазорегуляторы и ошибки двигателя до разборки. Код мотора обязателен для точного вывода.", "engine", ["source-bmw-manuals"], ["цепь", "масло", "перегрев", "двигател"]],
  ["Mercedes-Benz", ["C-Class", "E-Class", "GLC", "GLE"], "Считать ошибки всех блоков", "Для этой серии один код двигателя не заменяет полную диагностику: считайте ошибки двигателя, коробки, ABS и кузовных блоков, затем проверьте напряжение аккумулятора и утечки.", "diagnostics", ["source-mercedes-manuals"], ["ошибк", "abs", "аккумулятор", "коробк"]],
  ["Volkswagen", ["Polo", "Passat", "Tiguan", "Golf"], "Уточнить двигатель и тип коробки", "У Polo, Passat, Tiguan и Golf разные сочетания моторов и DSG. Перед рекомендацией ремонта уточните код двигателя, тип DSG/AT и историю замены жидкости; не переносите интервал между поколениями.", "transmission", ["source-vw-manuals"], ["dsg", "грм", "масло", "коробк"]],
  ["Kia", ["Rio", "Ceed", "Sportage", "Sorento"], "Проверить охлаждение и привод ГРМ", "При неровной работе или потере тяги сначала проверьте ошибки, подсос воздуха, охлаждение и состояние привода ГРМ. Для турбомотора и атмосферной версии применяются разные проверки.", "engine", ["source-kia-manuals"], ["грм", "турбо", "охлаждение", "тяга"]],
  ["Hyundai", ["Solaris", "Elantra", "Tucson", "Santa Fe"], "Проверить масло, охлаждение и коды", "При расходе масла, перегреве или пропусках зажигания проверьте уровень жидкостей, коды, свечи и систему охлаждения. Год и двигатель обязательны для выбора регламента.", "engine", ["source-hyundai-manuals"], ["масло", "перегрев", "пропуск", "свеч"]],
  ["Mazda", ["Mazda 3", "Mazda 6", "CX-5", "CX-9"], "Учитывать двигатель Skyactiv", "Для Mazda 3, Mazda 6 и CX при жалобах на вибрацию или расход масла уточните семейство Skyactiv, проверьте ошибки, впуск, охлаждение и состояние подвески.", "diagnostics", ["source-mazda-manuals"], ["skyactiv", "вибрация", "масло", "подвеск"]],
  ["LADA", ["Granta", "Vesta", "Largus", "Niva"], "Проверить ГРМ, охлаждение и подвеску", "Для LADA этой серии начинайте с приводов ГРМ, охлаждения, тормозов, подвески и утечек. Для AMT, механики и разных двигателей регламент отличается.", "maintenance", ["source-avtovaz-manuals"], ["грм", "амт", "подвеск", "охлаждение"]],
  ["Renault", ["Logan", "Duster", "Sandero", "Kaptur"], "Уточнить двигатель и привод", "У Renault этой серии сначала уточните двигатель, коробку и привод, затем проверяйте ГРМ, охлаждение, подвеску и электрику. Duster с полным приводом требует отдельной проверки трансмиссии.", "maintenance", ["source-renault-manuals"], ["грм", "duster", "полный привод", "подвеск"]],
  ["Chery", ["Tiggo 4", "Tiggo 7", "Tiggo 8"], "Проверить турбо и робот или CVT", "При рывках, потере тяги или перегреве проверьте коды, давление и температуру, состояние жидкости коробки и охлаждение турбодвигателя. Конкретные значения требуют официального документа.", "transmission", ["source-chery-manuals"], ["турбо", "робот", "вариатор", "перегрев"]],
  ["Haval", ["Jolion", "F7", "H6"], "Проверить робот, турбину и полный привод", "Для Haval этой серии при рывках или потере мощности считайте ошибки, проверьте охлаждение, турбосистему, роботизированную коробку и муфту полного привода.", "transmission", ["source-haval-manuals"], ["робот", "турбо", "полный привод", "ошибк"]],
];

const modelGuidance: SeriesGuidance[] = modelSeriesDefinitions.flatMap(([make, models, title, text, category, sourceIds, keywords]) => models.map((model) => ({ id: `model-${make.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, make, model, title: `${title}: ${model}`, text, category, risk: "routine" as const, sourceIds, keywords })));

export const seriesGuidance: SeriesGuidance[] = [...makeGuidance, ...modelGuidance];

const normalize = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase().replace(/[ё]/g, "е") : "";
const canonicalMake = (value: unknown) => {
  const normalized = normalize(value);
  const aliases: Record<string, string> = {
    "лада": "lada", "автоваз": "lada", "ваз": "lada",
    "киа": "kia", "хендай": "hyundai", "хавал": "haval", "чери": "chery",
    "рено": "renault", "мазда": "mazda", "ниссан": "nissan",
    "мерседес": "mercedes-benz", "мерседес-бенц": "mercedes-benz",
  };
  return aliases[normalized] || normalized;
};

export function getSeriesGuidance(vehicle: Partial<Vehicle>, query = ""): VehicleRecommendation[] {
  const make = canonicalMake(vehicle.make);
  const model = normalize(vehicle.model);
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return seriesGuidance
    .filter((item) => canonicalMake(item.make) === make && (!item.model || normalize(item.model) === model))
    .filter((item) => !tokens.length || tokens.some((token) => item.keywords.some((keyword) => normalize(keyword).includes(token) || token.includes(normalize(keyword)))))
    .map((item) => {
      const sources = item.sourceIds.map((id) => publicKnowledgeSources.find((source) => source.id === id)).filter((source): source is PublicKnowledgeSource => Boolean(source));
      const level = item.model ? "model" : "make";
      return {
        id: item.id, title: item.title, text: item.text, category: item.category, risk: item.risk, confidence: "low" as const,
        sourceIds: item.sourceIds, sources, applicability: item.model
          ? `Справка по модельной серии ${item.model}; подтвердите применимость с руководством для поколения, рынка, года, двигателя и коробки.`
          : `Справка по марке ${item.make}; подтвердите применимость с руководством для модели, поколения, рынка, года, двигателя и коробки.`,
        evidenceType: item.model ? "model_series_guidance" as const : "make_guidance" as const, knowledgeLevel: level as "make" | "model",
      };
    });
}
