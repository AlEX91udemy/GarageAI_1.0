import React from "react";

interface LicensePlateBadgeProps {
  plate?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LicensePlateBadge: React.FC<LicensePlateBadgeProps> = ({
  plate = "М777ММ 777",
  size = "md",
  className = "",
}) => {
  const clean = (plate || "").trim().toUpperCase();

  // Try to parse Russian plate format: e.g. "О742УМ 197" or "О 742 УМ 197" or "А123БВ 77"
  const ruMatch = clean.match(/^([А-ЯA-Z]\s*\d{3}\s*[А-ЯA-Z]{2})\s*(\d{2,3})?$/i);

  let mainPart = clean;
  let regionPart = "";

  if (ruMatch) {
    mainPart = ruMatch[1].replace(/\s+/g, " ");
    regionPart = ruMatch[2] || "";
  } else {
    // If there's a space or hyphen separating the region at the end
    const parts = clean.split(/[\s-]+/);
    if (parts.length > 1 && parts[parts.length - 1].length <= 3 && /^\d+$/.test(parts[parts.length - 1])) {
      regionPart = parts.pop()!;
      mainPart = parts.join(" ");
    }
  }

  const sizeClasses = {
    sm: "h-5 text-[10px] px-1.5 border-[1.5px]",
    md: "h-7 text-xs px-2 border-2",
    lg: "h-9 text-sm px-3 border-2",
  };

  const fontSizes = {
    sm: "font-mono font-black tracking-wider text-[11px]",
    md: "font-mono font-black tracking-widest text-[13px]",
    lg: "font-mono font-black tracking-widest text-[16px]",
  };

  const regSizes = {
    sm: "text-[8px] leading-tight",
    md: "text-[10px] leading-tight",
    lg: "text-xs leading-tight",
  };

  return (
    <div
      className={`license-plate inline-flex items-center bg-white text-neutral-900 rounded-md border-neutral-900 shadow-sm select-none font-sans ${sizeClasses[size]} ${className}`}
      title={clean}
    >
      <span className={`${fontSizes[size]} uppercase text-neutral-950 font-bold`}>
        {mainPart || "— — —"}
      </span>

      {regionPart && (
        <div className="flex items-center pl-1.5 ml-1.5 border-l border-neutral-400/90 h-full py-0.5">
          <div className="flex flex-col items-center justify-center">
            <span className={`font-mono font-black ${regSizes[size]}`}>
              {regionPart}
            </span>
            <div className="flex items-center gap-0.5 -mt-0.5">
              <span className="text-[7px] font-bold text-neutral-600 tracking-tighter">RUS</span>
              <span className="inline-block w-2 h-1.5 rounded-[1px] overflow-hidden border border-neutral-300">
                <span className="block h-[33%] bg-white" />
                <span className="block h-[34%] bg-blue-600" />
                <span className="block h-[33%] bg-red-600" />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
