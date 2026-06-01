/**
 * Gemini client with automatic model fallback.
 *
 * gemini-2.5-flash — latest preview, высокое качество, НО малая квота (часто 503)
 * gemini-2.0-flash — stable GA, надёжный, хорошая пропускная способность
 * gemini-1.5-flash — старый но очень стабильный, почти никогда не падает
 *
 * generateWithFallback() пробует модели по порядку и переходит к следующей
 * при 503 (перегрузка) или 429 (квота исчерпана для этой модели).
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Все модели ниже — БЕСПЛАТНЫЕ (Google AI Studio free tier).
// Порядок: лучшее качество первым; при 503/перегрузке переходим к следующей.
//   gemini-2.5-flash  — preview, лучшее качество, НО часто 503 на бесплатном тарифе
//   gemini-2.0-flash  — stable GA, надёжный, 15 RPM бесплатно
//   gemini-1.5-flash  — старый, но самый стабильный, почти никогда не падает
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

function isRetryableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("503") ||
    msg.includes("Service Unavailable") ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  );
}

export async function generateWithFallback(
  apiKey: string,
  prompt: string,
): Promise<string> {
  let lastError: unknown;

  for (const modelName of MODEL_CHAIN) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e: unknown) {
      lastError = e;
      if (isRetryableError(e)) {
        // Модель перегружена — пробуем следующую
        console.warn(`[gemini] Model ${modelName} unavailable, trying next...`);
        continue;
      }
      // Другие ошибки (невалидный ключ и т.п.) — сразу пробрасываем
      throw e;
    }
  }

  // Все модели не смогли ответить
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
