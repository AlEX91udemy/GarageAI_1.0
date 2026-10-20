import type { MaintenanceCategory } from "../types";

export interface ServiceWorkOption {
  title: string;
  category: MaintenanceCategory;
  aliases: string[];
}

export const SERVICE_WORK_CATALOG: ServiceWorkOption[] = [
  { title: "Замена моторного масла и масляного фильтра", category: "ТО и замена жидкостей", aliases: ["масло", "масляный фильтр", "замена масла", "то"] },
  { title: "Замена воздушного фильтра двигателя", category: "ТО и замена жидкостей", aliases: ["воздушный фильтр", "фильтр двигателя"] },
  { title: "Замена салонного фильтра", category: "ТО и замена жидкостей", aliases: ["салонный фильтр", "фильтр салона"] },
  { title: "Замена топливного фильтра", category: "ТО и замена жидкостей", aliases: ["топливный фильтр"] },
  { title: "Замена свечей зажигания", category: "Двигатель", aliases: ["свечи", "свечи зажигания"] },
  { title: "Замена ремня ГРМ", category: "Двигатель", aliases: ["грм", "ремень грм", "цепь грм"] },
  { title: "Диагностика двигателя", category: "Двигатель", aliases: ["чек двигателя", "ошибка двигателя", "диагностика мотора"] },
  { title: "Ремонт двигателя", category: "Двигатель", aliases: ["капремонт двигателя", "мотор"] },
  { title: "Замена охлаждающей жидкости", category: "Система охлаждения", aliases: ["антифриз", "охлаждающая жидкость"] },
  { title: "Замена термостата", category: "Система охлаждения", aliases: ["термостат"] },
  { title: "Замена радиатора охлаждения", category: "Система охлаждения", aliases: ["радиатор"] },
  { title: "Замена тормозных колодок", category: "Тормозная система", aliases: ["колодки", "передние колодки", "задние колодки"] },
  { title: "Замена тормозных дисков", category: "Тормозная система", aliases: ["тормозные диски", "диски"] },
  { title: "Замена тормозной жидкости", category: "Тормозная система", aliases: ["тормозуха"] },
  { title: "Диагностика тормозной системы", category: "Тормозная система", aliases: ["скрип тормозов", "тормоза"] },
  { title: "Замена амортизаторов", category: "Подвеска и рулевое", aliases: ["амортизаторы", "стойки"] },
  { title: "Замена шаровой опоры", category: "Подвеска и рулевое", aliases: ["шаровая"] },
  { title: "Замена ступичного подшипника", category: "Подвеска и рулевое", aliases: ["ступичный подшипник", "подшипник ступицы"] },
  { title: "Развал-схождение", category: "Подвеска и рулевое", aliases: ["сход развал", "развал"] },
  { title: "Замена сцепления", category: "Трансмиссия и сцепление", aliases: ["сцепление"] },
  { title: "Замена масла в коробке передач", category: "Трансмиссия", aliases: ["масло в коробке", "акпп", "мкпп", "вариатор"] },
  { title: "Диагностика трансмиссии", category: "Трансмиссия", aliases: ["коробка передач", "пинается коробка"] },
  { title: "Заправка кондиционера", category: "Климатическая система", aliases: ["кондиционер", "фреон"] },
  { title: "Ремонт системы кондиционирования", category: "Климатическая система", aliases: ["не холодит", "климат"] },
  { title: "Замена аккумулятора", category: "Электрика и датчики", aliases: ["аккумулятор", "акб", "батарея"] },
  { title: "Замена датчика", category: "Электрика и датчики", aliases: ["датчик", "электрика"] },
  { title: "Ремонт генератора", category: "Электрика и датчики", aliases: ["генератор"] },
  { title: "Ремонт стартера", category: "Электрика и датчики", aliases: ["стартер"] },
  { title: "Ремонт выхлопной системы", category: "Выхлопная система", aliases: ["глушитель", "выхлоп", "катализатор"] },
  { title: "Шиномонтаж", category: "Шины и диски", aliases: ["переобувка", "шины", "колеса"] },
  { title: "Балансировка колес", category: "Шины и диски", aliases: ["балансировка"] },
  { title: "Ремонт прокола шины", category: "Шины и диски", aliases: ["прокол", "ремонт колеса"] },
  { title: "Ремонт кузова", category: "Кузов и стекла", aliases: ["кузовной ремонт", "вмятина"] },
  { title: "Замена лобового стекла", category: "Кузов и стекла", aliases: ["лобовое стекло", "стекло"] },
  { title: "Мойка автомобиля", category: "Другое", aliases: ["мойка", "химчистка"] },
  { title: "Технический осмотр", category: "Другое", aliases: ["техосмотр", "то автомобиля"] },
];

export function searchServiceWorks(query: string, limit = 8): ServiceWorkOption[] {
  const normalized = query.trim().toLocaleLowerCase("ru");
  if (!normalized) return [];

  return SERVICE_WORK_CATALOG
    .map((work) => {
      const title = work.title.toLocaleLowerCase("ru");
      const category = work.category.toLocaleLowerCase("ru");
      const aliases = work.aliases.map((alias) => alias.toLocaleLowerCase("ru"));
      const fields = [title, ...aliases];
      const exact = fields.some((field) => field === normalized);
      const prefix = fields.some((field) => field.startsWith(normalized));
      const wordPrefix = fields.some((field) => field.split(/\s+/).some((word) => word.startsWith(normalized)));
      const contains = fields.some((field) => field.includes(normalized)) || category.includes(normalized);
      const score = exact ? 4 : prefix ? 3 : wordPrefix ? 2 : contains ? 1 : 0;
      return { work, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.work.title.localeCompare(b.work.title, "ru"))
    .slice(0, limit)
    .map(({ work }) => work);
}
