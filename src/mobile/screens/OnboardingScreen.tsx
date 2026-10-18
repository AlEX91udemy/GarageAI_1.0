import React, { useState } from "react";
import {
  Car,
  Gauge,
  CalendarCheck,
  Wrench,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Your Digital Garage",
      subtitle: "Ваш цифровой гараж",
      description:
        "Единое защищенное пространство для всех ваших автомобилей: пробеги, документы, технические паспорта и состояние узлов всегда под рукой.",
      badge: "Шаг 1 из 5",
      icon: <Car className="w-12 h-12 text-red-500" />,
      tag: "Мультиавтопарк",
      color: "from-red-500/20 to-neutral-900",
      accent: "border-red-500/30",
    },
    {
      title: "Know your car",
      subtitle: "Знайте каждую деталь",
      description:
        "Следите за реальным здоровьем мотора, вариатора, подвески и тормозов. Интеллектуальный расчет стоимости 1 км владения.",
      badge: "Шаг 2 из 5",
      icon: <Gauge className="w-12 h-12 text-blue-400" />,
      tag: "Телеметрия",
      color: "from-blue-500/20 to-neutral-900",
      accent: "border-blue-500/30",
    },
    {
      title: "Never miss maintenance",
      subtitle: "Никаких пропущенных ТО",
      description:
        "Заводские регламенты автопроизводителей, предиктивные напоминания по пробегу и точный журнал замен с артикулами и брендами.",
      badge: "Шаг 3 из 5",
      icon: <CalendarCheck className="w-12 h-12 text-emerald-400" />,
      tag: "Регламент ТО",
      color: "from-emerald-500/20 to-neutral-900",
      accent: "border-emerald-500/30",
    },
    {
      title: "Build and track projects",
      subtitle: "Ведите тюнинг-проекты",
      description:
        "Управляйте этапами доработок, бюджетом, фотосравнением «До и После», списком заказанных деталей и таймлайном создания вашего авто.",
      badge: "Шаг 4 из 5",
      icon: <Wrench className="w-12 h-12 text-amber-400" />,
      tag: "Тюнинг и кастом",
      color: "from-amber-500/20 to-neutral-900",
      accent: "border-amber-500/30",
    },
    {
      title: "AI understands your car",
      subtitle: "AI понимает ваш авто",
      description:
        "Встроенный Garage AI анализирует историю заказ-нарядов, ошибки OBD-II, симптомы стуков и выявляет скрытые риски до поломки.",
      badge: "Шаг 5 из 5",
      icon: <Sparkles className="w-12 h-12 text-rose-400" />,
      tag: "Garage AI",
      color: "from-rose-500/20 to-neutral-900",
      accent: "border-rose-500/30",
    },
  ];

  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col justify-between h-full w-full bg-neutral-950 text-white p-6 pb-8 select-none">
      {/* Top bar with skip button */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center font-black text-[10px]">
            GH
          </div>
          <span className="text-xs font-bold text-neutral-300">GarageHub</span>
        </div>

        <button
          onClick={onComplete}
          className="text-xs font-medium text-neutral-400 hover:text-white px-2 py-1 rounded-md transition cursor-pointer"
        >
          Пропустить
        </button>
      </div>

      {/* Main card illustration */}
      <div className="my-auto flex flex-col items-center text-center px-2">
        <div
          className={`w-36 h-36 rounded-3xl bg-gradient-to-b ${current.color} border ${current.accent} flex items-center justify-center shadow-2xl mb-8 relative transition-all duration-300`}
        >
          {current.icon}
          <div className="absolute -bottom-3 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-[10px] font-bold text-neutral-300 tracking-wide uppercase">
            {current.tag}
          </div>
        </div>

        <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">
          {current.badge}
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white mb-1">
          {current.title}
        </h2>
        <div className="text-sm font-semibold text-red-400 mb-3">
          {current.subtitle}
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed max-w-xs">
          {current.description}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col gap-4">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStep
                  ? "w-7 bg-red-500"
                  : "w-1.5 bg-neutral-800 hover:bg-neutral-700"
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleNext}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.98] transition cursor-pointer"
        >
          <span>{currentStep === steps.length - 1 ? "Войти в Гараж" : "Продолжить"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
