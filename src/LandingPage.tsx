import { ArrowRight, BrainCircuit, CarFront, CheckCircle2, Github, Wrench } from "lucide-react";

const features = [
  { icon: CarFront, title: "Цифровой гараж", text: "Все автомобили, пробег и история владения в одном рабочем пространстве." },
  { icon: Wrench, title: "Сервис и расходы", text: "Журнал ремонтов, регламент ТО, топливо, детали и задачи к выполнению." },
  { icon: BrainCircuit, title: "AI-диагностика", text: "Помощь в разборе симптомов и автомобильных документов на основе контекста машины." },
];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0b1110] text-[#f2f5f1]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <a href="/" className="flex items-center gap-3 font-semibold tracking-tight" aria-label="GarageAI">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d9f36a] text-[#16200f]"><CarFront className="h-5 w-5" /></span>
          <span>GarageAI</span>
        </a>
        <div className="flex items-center gap-5 text-sm text-[#aab7ae]">
          <a className="hidden transition hover:text-white sm:inline" href="#product">Продукт</a>
          <a className="hidden transition hover:text-white sm:inline" href="#team">О проекте</a>
          <a className="inline-flex items-center gap-2 rounded-md border border-[#34423a] px-4 py-2 text-[#e9eee9] transition hover:border-[#d9f36a]" href="/app">Открыть приложение <ArrowRight className="h-4 w-4" /></a>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-[#d9f36a]">Интеллектуальный журнал автомобиля</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">История автомобиля, которая помогает принимать решения.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#aab7ae]">GarageAI объединяет обслуживание, расходы, детали и AI-инструменты в одном спокойном рабочем пространстве для владельца автомобиля.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="/app" className="inline-flex items-center gap-2 rounded-md bg-[#d9f36a] px-5 py-3 font-semibold text-[#16200f] transition hover:bg-[#e7fb8b]">Запустить GarageAI <ArrowRight className="h-4 w-4" /></a>
            <a href="https://github.com/AlEX91udemy/GarageAI_1.0" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-[#34423a] px-5 py-3 font-medium text-[#e9eee9] transition hover:border-[#d9f36a]"><Github className="h-4 w-4" /> Исходный код</a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#aab7ae]">
            {["Работающий MVP", "Мультиавтомобильный учёт", "Web-приложение"].map((item) => <span key={item} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d9f36a]" />{item}</span>)}
          </div>
        </div>
        <div id="product" className="border border-[#34423a] bg-[#111a17] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-[#293730] pb-4 text-sm"><span className="text-[#aab7ae]">GARAGE / OVERVIEW</span><span className="text-[#d9f36a]">MVP</span></div>
          <div className="grid grid-cols-2 gap-3 py-5">
            {[['01', 'Автомобиль', 'VW Golf VII'], ['02', 'Пробег', '184 220 км'], ['03', 'Следующее ТО', 'через 2 400 км'], ['04', 'Расходы', 'зафиксированы']].map(([number, label, value]) => <div key={number} className="border border-[#293730] p-4"><span className="text-xs text-[#76877c]">{number}</span><p className="mt-5 text-xs uppercase tracking-[0.14em] text-[#aab7ae]">{label}</p><p className="mt-2 font-medium">{value}</p></div>)}
          </div>
          <div className="border border-[#293730] p-4"><div className="flex items-center justify-between text-sm"><span>AI-механик</span><span className="text-[#d9f36a]">готов к работе</span></div><div className="mt-4 h-2 bg-[#293730]"><div className="h-2 w-4/5 bg-[#d9f36a]" /></div></div>
        </div>
      </section>

      <section className="border-y border-[#293730] bg-[#101815]">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-3 lg:px-8">
          {features.map(({ icon: Icon, title, text }) => <article key={title} className="border-l border-[#566750] pl-5"><Icon className="h-5 w-5 text-[#d9f36a]" /><h2 className="mt-5 text-lg font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-[#aab7ae]">{text}</p></article>)}
        </div>
      </section>

      <section id="team" className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d9f36a]">О проекте</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">GarageAI строится как практичный инструмент для долгой жизни автомобиля.</h2><p className="mt-5 leading-7 text-[#aab7ae]">Проект развивается как независимый цифровой продукт с работающим MVP. Следующие шаги — проверить спрос, расширить базу знаний автомобилей, улучшить AI-диагностику и подготовить продукт к привлечению венчурного финансирования.</p></div>
      </section>

      <footer className="border-t border-[#293730]"><div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-[#76877c] sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 GarageAI</span><a className="inline-flex items-center gap-2 hover:text-white" href="https://github.com/AlEX91udemy/GarageAI_1.0" target="_blank" rel="noreferrer"><Github className="h-4 w-4" /> GitHub проекта</a></div></footer>
    </main>
  );
}
