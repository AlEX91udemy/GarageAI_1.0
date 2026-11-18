export function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isValidYear(value: unknown): boolean {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1886 && year <= new Date().getFullYear() + 1;
}

export function isValidDate(value: unknown): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function asTrimmedString(value: unknown, maxLength = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function asNonNegativeNumber(value: unknown, max = 1_000_000_000): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > max) return null;
  return num;
}

export function asStrictNonNegativeNumber(value: unknown, max = 1_000_000_000): number | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > max) return null;
  return num;
}

export function validateDiagnosticResult(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  if (typeof result.primaryDiagnosis !== "string" || !result.primaryDiagnosis.trim()) return false;
  if (!["high", "medium", "low"].includes(String(result.urgency))) return false;
  if (typeof result.safetyAssessment !== "string" || !result.safetyAssessment.trim()) return false;
  if (!Array.isArray(result.likelyCauses) || !Array.isArray(result.diagnosticSteps)) return false;
  if (result.possibleCauses !== undefined && (!Array.isArray(result.possibleCauses) || result.possibleCauses.some((cause) => {
    if (!cause || typeof cause !== "object" || Array.isArray(cause)) return true;
    const item = cause as Record<string, unknown>;
    return (
      typeof item.cause !== "string" || !item.cause.trim() ||
      typeof item.explanation !== "string" || !item.explanation.trim() ||
      typeof item.checkMethod !== "string" || !item.checkMethod.trim()
    );
  }))) return false;
  return (
    result.likelyCauses.every((cause) => {
      if (!cause || typeof cause !== "object") return false;
      const item = cause as Record<string, unknown>;
      return typeof item.cause === "string" && item.cause.trim().length > 0;
    }) && result.diagnosticSteps.every((step) => typeof step === "string")
  );
}

/** AI has no verified regional price or fitment source, so never return these as facts. */
export function sanitizeDiagnosticResult(value: Record<string, unknown>): Record<string, unknown> {
  const { confidence: _confidence, estimatedCostRange: _estimatedCostRange, estimatedCost: _estimatedCost, recommendedParts: _recommendedParts, ...safeResult } = value;
  for (const key of ["likelyCauses", "possibleCauses"]) {
    const causes = safeResult[key];
    if (!Array.isArray(causes)) continue;
    safeResult[key] = causes.map((cause) => {
      if (!cause || typeof cause !== "object" || Array.isArray(cause)) return cause;
      const { probability: _probability, confidence: _causeConfidence, ...unscoredCause } = cause as Record<string, unknown>;
      return unscoredCause;
    });
  }
  return safeResult;
}

export function validateCredentials(input: unknown): { username?: string; password?: string; error?: string } {
  const body = (input || {}) as Record<string, unknown>;
  const username = asTrimmedString(body.username, 32).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return { error: "Логи: 3-32 символа, латиница, цифры, точка, дефис или подчёркивание" };
  }
  if (password.length < 8 || password.length > 200) {
    return { error: "Пароль должен содержать от 8 до 200 символов" };
  }
  return { username, password };
}
