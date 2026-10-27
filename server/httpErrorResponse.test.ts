import { describe, expect, it } from "vitest";
import { safeHttpErrorResponse } from "./httpErrorResponse";

describe("safe HTTP error responses", () => {
  it("returns a stable JSON-safe message for malformed JSON", () => {
    expect(safeHttpErrorResponse({ type: "entity.parse.failed", message: "secret payload fragment" })).toEqual({
      status: 400,
      message: "Некорректный JSON в теле запроса.",
    });
  });

  it("maps oversized bodies to 413", () => {
    expect(safeHttpErrorResponse({ type: "entity.too.large", status: 413 })).toEqual({
      status: 413,
      message: "Тело запроса слишком большое.",
    });
    expect(safeHttpErrorResponse({ status: 413 })).toEqual({
      status: 413,
      message: "Тело запроса слишком большое.",
    });
  });

  it("maps unsupported encodings to 415", () => {
    expect(safeHttpErrorResponse({ type: "encoding.unsupported" }).status).toBe(415);
    expect(safeHttpErrorResponse({ type: "charset.unsupported" }).status).toBe(415);
  });

  it("does not expose unexpected error details", () => {
    expect(safeHttpErrorResponse(new Error("database password leaked"))).toEqual({
      status: 500,
      message: "Внутренняя ошибка сервера.",
    });
  });
});
