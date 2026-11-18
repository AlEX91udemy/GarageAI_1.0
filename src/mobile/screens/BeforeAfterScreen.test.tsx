import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BeforeAfterScreen } from "./BeforeAfterScreen";

let container: HTMLDivElement;
let root: Root;
const createdUrls: string[] = [];
const revokedUrls: string[] = [];

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  createdUrls.length = 0;
  revokedUrls.length = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => {
      const url = `blob:photo-${createdUrls.length}`;
      createdUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => revokedUrls.push(url)),
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function selectFile(label: string, file: File) {
  const input = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  act(() => {
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

it("shows a truthful empty state and compares only the selected car photos", () => {
  const onBack = vi.fn();
  act(() => root.render(<BeforeAfterScreen vehicle={{ id: "car-42", make: "Lada", model: "Vesta", year: 2024, engine: "1.6", transmission: "MT", currentMileage: 1000, lastMileageUpdate: "2026-09-11" }} onBack={onBack} />));
  expect(container.textContent).toContain("Для сравнения нужны фотографии");
  expect(container.textContent).not.toContain("45 000");
  expect(container.querySelectorAll("img")).toHaveLength(0);

  selectFile("Фото до", new File(["before"], "before.jpg", { type: "image/jpeg" }));
  expect(container.querySelector("img")).toBeNull();
  selectFile("Фото после", new File(["after"], "after.jpg", { type: "image/jpeg" }));
  expect(container.querySelectorAll("img")).toHaveLength(2);
  expect(container.querySelector<HTMLImageElement>("img[alt='До доработок']")?.src).toBe("blob:photo-0");
  expect(container.querySelector<HTMLImageElement>("img[alt='После доработок']")?.src).toBe("blob:photo-1");

  act(() => container.querySelector<HTMLButtonElement>("button")!.click());
  expect(onBack).toHaveBeenCalledOnce();
});

it("rejects unsupported image types and files larger than 9 MB", () => {
  act(() => root.render(<BeforeAfterScreen vehicle={{ id: "car-42", make: "Lada", model: "Vesta", year: 2024, engine: "1.6", transmission: "MT", currentMileage: 1000, lastMileageUpdate: "2026-09-11" }} onBack={vi.fn()} />));
  selectFile("Фото до", new File(["data"], "photo.gif", { type: "image/gif" }));
  expect(container.querySelector("[role=alert]")?.textContent).toContain("JPEG, PNG или WebP");
  expect(container.querySelector("img")).toBeNull();

  selectFile("Фото до", new File([new Uint8Array(9 * 1024 * 1024 + 1)], "huge.png", { type: "image/png" }));
  expect(container.querySelector("[role=alert]")?.textContent).toContain("9 МБ");
  expect(container.querySelector("img")).toBeNull();
});

it("releases selected object URLs when a screen unmounts", () => {
  act(() => root.render(<BeforeAfterScreen vehicle={{ id: "car-42", make: "Lada", model: "Vesta", year: 2024, engine: "1.6", transmission: "MT", currentMileage: 1000, lastMileageUpdate: "2026-09-11" }} onBack={vi.fn()} />));
  selectFile("Фото до", new File(["before"], "before.jpg", { type: "image/jpeg" }));
  selectFile("Фото после", new File(["after"], "after.jpg", { type: "image/jpeg" }));
  act(() => root.unmount());
  expect(revokedUrls).toEqual(["blob:photo-0", "blob:photo-1"]);
});
