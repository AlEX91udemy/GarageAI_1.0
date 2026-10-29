import { ArrowLeft, ShieldCheck, FileText, Cookie, Mail } from "lucide-react";

type LegalKind = "privacy" | "terms" | "cookies";
type Section = { heading: string; body: string[] };

const CONTENT: Record<LegalKind, { title: string; icon: typeof ShieldCheck; sections: Section[] }> = {
  privacy: { title: "Политика конфиденциальности", icon: ShieldCheck, sections: [
    { heading: "1. Общие положения", body: ["Эта политика описывает данные, которые обрабатывает GarageAI, цели обработки и права пользователя. Используя сервис, пользователь подтверждает, что ознакомился с документом.", "Контакт по вопросам данных: founder@garageai.site."] },
    { heading: "2. Данные и цели", body: ["Мы можем обрабатывать email и данные сессии; сведения об автомобилях, обслуживании, расходах и напоминаниях; загруженные фотографии чеков и заказ-нарядов; IP-адрес, тип устройства, браузер и журналы ошибок.", "Данные нужны для входа, синхронизации гаража, OCR, напоминаний, поддержки и защиты сервиса от злоупотреблений."] },
    { heading: "3. Хранение и передача", body: ["Данные хранятся в течение действия аккаунта и необходимого периода для выполнения целей, разрешения споров и соблюдения закона. Для работы сервиса могут привлекаться хостинг, хранение файлов, OCR и почтовые провайдеры; им передаётся только необходимый объём данных.", "Мы не продаём персональные данные. Передача государственным органам возможна только при наличии законного основания."] },
    { heading: "4. Права пользователя", body: ["Можно запросить доступ, исправление, ограничение или прекращение обработки, экспорт и удаление аккаунта. Напишите на founder@garageai.site; для защиты аккаунта мы можем запросить подтверждение личности."] },
    { heading: "5. Безопасность и изменения", body: ["Мы применяем разумные меры защиты, но не можем гарантировать абсолютную безопасность передачи данных через интернет. При существенных изменениях обновим дату документа и уведомим пользователя, когда это требуется."] },
  ] },
  terms: { title: "Условия использования", icon: FileText, sections: [
    { heading: "1. Сервис", body: ["GarageAI предоставляет цифровой журнал автомобиля: учёт обслуживания и расходов, напоминания, загрузку файлов, распознавание документов и справочные функции."] },
    { heading: "2. Аккаунт и файлы", body: ["Пользователь отвечает за достоверность данных, сохранность доступа, законность загружаемых материалов и наличие прав на них. Пользователь сохраняет права на файлы и разрешает GarageAI обрабатывать их только для выбранных функций."] },
    { heading: "3. Ограничения", body: ["OCR, расчёты и AI-рекомендации могут содержать ошибки и не заменяют диагностику, регламент производителя или заключение механика. Запрещены обход ограничений доступа, вредоносный код, нарушение прав третьих лиц и незаконное использование."] },
    { heading: "4. Доступность и ответственность", body: ["Сервис предоставляется «как есть». Мы принимаем разумные меры для доступности, но не обещаем отсутствие перерывов или ошибок. В пределах закона GarageAI не отвечает за решения, принятые исключительно на основе результатов сервиса."] },
    { heading: "5. Изменение и прекращение", body: ["Новые редакции публикуются с датой обновления. Пользователь может прекратить использование сервиса, а GarageAI может ограничить доступ при нарушении условий или требованиях безопасности."] },
  ] },
  cookies: { title: "Политика использования файлов cookie", icon: Cookie, sections: [
    { heading: "1. Какие технологии используются", body: ["Браузерные cookie и localStorage применяются для входа, защиты сессии, темы, выбранного режима интерфейса и локального офлайн-кэша гаража. Это необходимые технологии для работы приложения."] },
    { heading: "2. Аналитика и сторонние сервисы", body: ["На дату этой редакции GarageAI не использует рекламные cookie. Если появятся аналитические или сторонние сервисы, мы перечислим их здесь с целями, сроками хранения и способом отключения."] },
    { heading: "3. Управление", body: ["Cookie и данные сайта можно удалить или заблокировать в браузере. Блокировка необходимых технологий может отключить вход и локальный кэш. Перед установкой необязательных cookie мы покажем баннер выбора и дадим возможность изменить решение."] },
    { heading: "4. Обновление", body: ["Страница обновляется при изменении набора технологий. Вопросы направляйте на founder@garageai.site."] },
  ] },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const content = CONTENT[kind];
  const Icon = content.icon;
  return <div className="min-h-screen bg-[#F4F5F8] text-[#0F172A] dark:bg-[#0D131D] dark:text-[#F8FAFC]">
    <header className="border-b border-[#E2E8F0] bg-white/90 dark:border-[#243044] dark:bg-[#17202E]/90"><div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><a href="/" className="flex items-center gap-2.5 font-semibold"><img src="/garage-ai-mark.png" alt="" className="h-8 w-8 rounded-md border border-[#E2E8F0] bg-white p-0.5 dark:border-[#243044]" /><span>GarageAI</span></a><a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#B91C1C] hover:underline dark:text-[#EF3038]"><ArrowLeft className="h-4 w-4" /> На главную</a></div></header>
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14"><div className="mb-8 flex items-start gap-4"><span className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3A1D22] dark:text-[#F87171]"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-[#B91C1C] dark:text-[#F87171]">Документы GarageAI</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{content.title}</h1><p className="mt-2 text-sm text-[#536171] dark:text-[#94A3B8]">Последнее обновление: 29 октября 2026 года</p></div></div>
    <article className="space-y-7 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm dark:border-[#243044] dark:bg-[#17202E] sm:p-9">{content.sections.map((section) => <section key={section.heading}><h2 className="text-lg font-bold">{section.heading}</h2><div className="mt-2 space-y-2 text-sm leading-7 text-[#536171] dark:text-[#CBD5E1]">{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}</article>
    <nav aria-label="Правовые документы" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold"><a href="/privacy" className="text-[#B91C1C] hover:underline dark:text-[#F87171]">Конфиденциальность</a><a href="/terms" className="text-[#B91C1C] hover:underline dark:text-[#F87171]">Условия использования</a><a href="/cookies" className="text-[#B91C1C] hover:underline dark:text-[#F87171]">Cookie</a><a href="mailto:founder@garageai.site" className="inline-flex items-center gap-1 text-[#536171] hover:underline dark:text-[#94A3B8]"><Mail className="h-4 w-4" /> Связаться</a></nav></main>
  </div>;
}
export type { LegalKind };
