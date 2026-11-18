import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Vehicle } from "../../types";

interface BeforeAfterScreenProps {
  vehicle: Vehicle;
  onBack: () => void;
}

function usePhotoUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  return url;
}

export const BeforeAfterScreen: React.FC<BeforeAfterScreenProps> = ({ vehicle, onBack }) => {
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const beforePhoto = usePhotoUrl(beforeFile);
  const afterPhoto = usePhotoUrl(afterFile);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [sideBySide, setSideBySide] = useState(false);
  const [error, setError] = useState("");

  const selectPhoto = (file: File | undefined, setFile: (file: File) => void) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 9 * 1024 * 1024) {
      setError("Выберите JPEG, PNG или WebP размером до 9 МБ.");
      return;
    }
    setError("");
    setFile(file);
  };

  return (
    <div className="flex flex-col w-full pb-10 text-white">
      <div className="sticky top-0 z-30 bg-neutral-950/90 px-4 py-3 flex items-center justify-between border-b border-neutral-800">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
          <ArrowLeft className="w-4 h-4" />Назад
        </button>
        <h2 className="text-xs font-bold">Сравнение До / После</h2>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm">{vehicle.make} {vehicle.model}</p>
        <p className="text-xs text-neutral-400">Выберите две фотографии автомобиля. Они используются только для просмотра на этом экране и не сохраняются в гараж.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs space-y-2">
            <span>Фото до</span>
            <input aria-label="Фото до" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full" onChange={(event) => selectPhoto(event.target.files?.[0], setBeforeFile)} />
          </label>
          <label className="text-xs space-y-2">
            <span>Фото после</span>
            <input aria-label="Фото после" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full" onChange={(event) => selectPhoto(event.target.files?.[0], setAfterFile)} />
          </label>
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {beforePhoto && afterPhoto ? (
          <>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={sideBySide} onChange={(event) => setSideBySide(event.target.checked)} />
              Бок о бок
            </label>
            {sideBySide ? (
              <div className="grid grid-cols-2 gap-2">
                <img src={beforePhoto} alt="До доработок" className="w-full h-64 object-contain bg-neutral-900 rounded-2xl" />
                <img src={afterPhoto} alt="После доработок" className="w-full h-64 object-contain bg-neutral-900 rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="relative w-full h-72 rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800">
                  <img src={afterPhoto} alt="После доработок" className="absolute inset-0 w-full h-full object-contain" />
                  <img src={beforePhoto} alt="До доработок" className="absolute inset-0 w-full h-full object-contain bg-neutral-900" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} />
                  <span className="absolute top-2 left-2 bg-black/70 rounded px-2 text-xs">До</span>
                  <span className="absolute top-2 right-2 bg-black/70 rounded px-2 text-xs">После</span>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none" style={{ left: `${sliderPosition}%` }} />
                </div>
                <label className="block text-xs space-y-2">
                  <span>Граница сравнения</span>
                  <input aria-label="Граница сравнения" type="range" min="0" max="100" value={sliderPosition} onChange={(event) => setSliderPosition(Number(event.target.value))} className="w-full" />
                </label>
              </>
            )}
          </>
        ) : <p className="rounded-2xl border border-neutral-800 p-6 text-center text-sm text-neutral-400">Для сравнения нужны фотографии до и после доработок.</p>}
      </div>
    </div>
  );
};
