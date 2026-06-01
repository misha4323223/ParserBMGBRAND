/**
 * Gemini client with automatic model fallback.
 *
 * gemini-2.5-flash — latest preview, высокое качество, НО малая квота (часто 503)
 * gemini-2.0-flash — stable GA, надёжный, хорошая пропускная способность
 * gemini-2.0-flash-lite — лёгкая версия, очень стабильная, бесплатный тариф
 *
 * generateWithFallback() пробует модели по порядку и переходит к следующей
 * при 503 (перегрузка), 429 (квота) или 404 (модель недоступна в этой версии API).
 *
 * enableSearch=true — включает Google Search grounding (модель ищет в Google
 * перед ответом, что даёт актуальные и точные данные вместо галлюцинаций).
 * Поддерживается gemini-2.5-flash и gemini-2.0-flash.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Все модели ниже — БЕСПЛАТНЫЕ (Google AI Studio free tier).
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const;

// Модели с поддержкой Google Search grounding
const SEARCH_SUPPORTED_MODELS = new Set(["gemini-2.5-flash", "gemini-2.0-flash"]);

// Google Search grounding tool (Gemini 2.0+)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GOOGLE_SEARCH_TOOL = { googleSearch: {} } as any;

function isRetryableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const status = (e as { status?: number }).status;
  return (
    status === 503 ||
    status === 429 ||
    status === 404 ||
    msg.includes("503") ||
    msg.includes("Service Unavailable") ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("404") ||
    msg.includes("Not Found") ||
    msg.includes("not found for API version")
  );
}

export interface GenerateOptions {
  /** Включить Google Search grounding — модель ищет в Google перед ответом */
  enableSearch?: boolean;
}

export async function generateWithFallback(
  apiKey: string,
  prompt: string,
  options: GenerateOptions = {},
): Promise<string> {
  let lastError: unknown;
  const { enableSearch = false } = options;

  for (const modelName of MODEL_CHAIN) {
    const useSearch = enableSearch && SEARCH_SUPPORTED_MODELS.has(modelName);

    // Если search не поддерживается этой моделью и нет других вариантов — пробуем без
    const attempts = useSearch ? ["with_search", "without_search"] : ["without_search"];

    for (const attempt of attempts) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const tools = attempt === "with_search" ? [GOOGLE_SEARCH_TOOL] : undefined;
        const model = genAI.getGenerativeModel({ model: modelName, tools });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        if (attempt === "with_search") {
          console.log(`[gemini] Used Google Search grounding with ${modelName}`);
        }
        return text;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        // Если search tool не поддерживается — пробуем без него
        if (
          attempt === "with_search" &&
          (msg.includes("does not support") ||
            msg.includes("tool") ||
            msg.includes("INVALID_ARGUMENT") ||
            msg.includes("400"))
        ) {
          console.warn(`[gemini] Search tool not supported for ${modelName}, retrying without`);
          continue;
        }
        lastError = e;
        if (isRetryableError(e)) {
          console.warn(`[gemini] Model ${modelName} unavailable, trying next...`);
          break; // выходим из inner loop, переходим к следующей модели
        }
        throw e;
      }
    }
  }

  throw lastError;
}

export function classifyGeminiError(e: unknown): { status: number; message: string } {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("503") || msg.includes("Service Unavailable") || msg.includes("high demand")) {
    return { status: 503, message: "Gemini перегружен — все модели недоступны. Попробуйте через минуту." };
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return { status: 429, message: "Gemini: дневной лимит запросов исчерпан (бесплатный план: ~20 запросов/день)." };
  }
  if (msg.includes("API_KEY") || msg.includes("API key") || msg.includes("401")) {
    return { status: 401, message: "Gemini: неверный API ключ. Обновите ключ в настройках." };
  }
  return { status: 500, message: msg.slice(0, 200) };
}
