export interface SafeHttpErrorResponse {
  status: number;
  message: string;
}

const BODY_PARSER_ERRORS: Record<string, SafeHttpErrorResponse> = {
  "entity.parse.failed": { status: 400, message: "Некорректный JSON в теле запроса." },
  "request.aborted": { status: 400, message: "Передача тела запроса была прервана." },
  "request.size.invalid": { status: 400, message: "Некорректный размер тела запроса." },
  "entity.too.large": { status: 413, message: "Тело запроса слишком большое." },
  "parameters.too.many": { status: 413, message: "Слишком много параметров в запросе." },
  "encoding.unsupported": { status: 415, message: "Кодировка тела запроса не поддерживается." },
  "charset.unsupported": { status: 415, message: "Кодировка текста запроса не поддерживается." },
};

/**
 * Maps known request-parser failures to stable JSON responses without leaking
 * parser internals or request payloads. Unknown errors get a generic 500.
 */
export function safeHttpErrorResponse(error: unknown): SafeHttpErrorResponse {
  if (error !== null && typeof error === "object") {
    const candidate = error as { type?: unknown; status?: unknown };
    if (typeof candidate.type === "string" && BODY_PARSER_ERRORS[candidate.type]) {
      return BODY_PARSER_ERRORS[candidate.type];
    }
    if (candidate.status === 413) {
      return { status: 413, message: "Тело запроса слишком большое." };
    }
  }
  return { status: 500, message: "Внутренняя ошибка сервера." };
}
