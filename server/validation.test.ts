import { describe, expect, it } from "vitest";
import { sanitizeDiagnosticResult, validateDiagnosticResult } from "./validation";

const validResult = {
  primaryDiagnosis: "Возможна неисправность подшипника",
  urgency: "medium",
  safetyAssessment: "Остановитесь при ухудшении управляемости; требуется очная проверка.",
  likelyCauses: [{ cause: "Подшипник" }, { cause: "Шина" }],
  possibleCauses: [{ cause: "Ступичный подшипник", explanation: "Гипотеза по симптомам", checkMethod: "Осмотр на подъёмнике" }],
  diagnosticSteps: ["Проверьте люфт на подъёмнике"],
};

describe("AI diagnostic response validation", () => {
  it("accepts a structured diagnosis with a safety assessment", () => {
    expect(validateDiagnosticResult(validResult)).toBe(true);
  });

  it("rejects a response without a safety assessment", () => {
    const { safetyAssessment: _safetyAssessment, ...unsafe } = validResult;
    expect(validateDiagnosticResult(unsafe)).toBe(false);
  });

  it("rejects malformed causes without requiring unsupported probability scores", () => {
    expect(validateDiagnosticResult({ ...validResult, likelyCauses: [{ cause: " " }] })).toBe(false);
    expect(validateDiagnosticResult({ ...validResult, likelyCauses: "not an array" })).toBe(false);
    expect(validateDiagnosticResult({ ...validResult, possibleCauses: [{ cause: "X", explanation: " ", checkMethod: "Осмотр" }] })).toBe(false);
  });

  it("removes unsupported AI-generated prices and part fitment", () => {
    const sanitized = sanitizeDiagnosticResult({
      ...validResult, estimatedCostRange: "5 000 — 12 000 ₽", estimatedCost: 6500, confidence: 95,
      recommendedParts: [{ name: "Bearing", partNumber: "OEM-123", brand: "Example" }],
      possibleCauses: [{ cause: "Шум шины", probability: "Высокая", confidence: 80, explanation: "Гипотеза", checkMethod: "Осмотр" }],
    });
    expect(sanitized).not.toHaveProperty("estimatedCostRange");
    expect(sanitized).not.toHaveProperty("estimatedCost");
    expect(sanitized).not.toHaveProperty("recommendedParts");
    expect(sanitized).not.toHaveProperty("confidence");
    expect((sanitized.likelyCauses as Array<Record<string, unknown>>)[0]).not.toHaveProperty("probability");
    expect((sanitized.possibleCauses as Array<Record<string, unknown>>)[0]).not.toHaveProperty("probability");
    expect((sanitized.possibleCauses as Array<Record<string, unknown>>)[0]).not.toHaveProperty("confidence");
    expect(sanitized.primaryDiagnosis).toBe(validResult.primaryDiagnosis);
  });
});
