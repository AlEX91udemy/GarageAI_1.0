import React, { useState } from "react";
import { ShieldCheck, Smartphone, KeyRound, Sparkles, ArrowRight, Check } from "lucide-react";

interface AuthScreenProps {
  onSuccess: () => void;
  userEmail?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  userEmail = "SAMBUR91@gmail.com",
}) => {
  const [pin, setPin] = useState("");
  const [useEmailAuth, setUseEmailAuth] = useState(false);
  const [emailInput, setEmailInput] = useState(userEmail);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          onSuccess?.();
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="flex flex-col justify-between h-full w-full bg-neutral-950 text-white p-6 pb-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <img src="/garage-ai-mark.png" alt="" className="w-8 h-8 rounded-lg" />
          <div>
            <div className="text-xs font-bold text-white tracking-tight">Garage AI ID</div>
            <div className="text-[10px] text-neutral-400">Демо-доступ к авто</div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Демо-режим
        </span>
      </div>

      {/* Center PIN pad */}
      <div className="flex flex-col items-center my-auto">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-400 mb-4 shadow-lg">
          <KeyRound className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-black text-white tracking-tight mb-1">
          Введите PIN-код
        </h2>
        <p className="text-xs text-neutral-400 mb-6 text-center max-w-xs">
          Демонстрационный экран: принимается любой 4-значный PIN. <br />
          <span className="text-neutral-300 font-mono">{userEmail}</span>
        </p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-3.5 mb-8">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  isFilled
                    ? "bg-red-500 scale-110 shadow-sm shadow-red-500/80"
                    : "bg-neutral-800 border border-neutral-700"
                }`}
              />
            );
          })}
        </div>

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 w-64 max-w-xs">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(String(num))}
              className="w-16 h-16 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800/80 text-xl font-bold text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm mx-auto"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => onSuccess?.()}
            className="w-16 h-16 rounded-2xl text-[11px] font-bold text-neutral-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer mx-auto"
          >
            Гость
          </button>
          <button
            onClick={() => handleDigit("0")}            className="w-16 h-16 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800/80 text-xl font-bold text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm mx-auto"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer mx-auto"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Quick Biometric / Guest bypass */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onSuccess}
          className="text-xs font-medium text-red-400 hover:text-red-300 flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          Гостевой вход (демо, без биометрии)
        </button>
      </div>
    </div>
  );
};
