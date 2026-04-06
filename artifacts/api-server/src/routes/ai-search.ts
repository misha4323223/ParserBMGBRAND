import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AiSearchClientsBody } from "@workspace/api-zod";
import { tavily } from "@tavily/core";

const router: IRouter = Router();

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });

router.post("/ai-search", async (req, res): Promise<void> => {
  const parsed = AiSearchClientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query } = parsed.data;

  const searchQueries = [
    `${query} оптовые магазины одежда купить`,
    `${query} магазин одежды контакты телефон`,
  ];

  let allSearchContent = "";

  for (const searchQ of searchQueries) {
    try {
      const tavilyResult = await tavilyClient.search(searchQ, {
        searchDepth: "advanced",
        maxResults: 5,
        includeAnswer: true,
        includeRawContent: false,
      });

      if (tavilyResult.answer) {
        allSearchContent += `\nОтвет по запросу "${searchQ}":\n${tavilyResult.answer}\n`;
      }

      if (tavilyResult.results?.length) {
        for (const r of tavilyResult.results.slice(0, 5)) {
          allSearchContent += `\n--- Источник: ${r.url}\nЗаголовок: ${r.title}\nОписание: ${r.content?.slice(0, 500) ?? ""}\n`;
        }
      }
    } catch (err) {
      console.error("Tavily search error:", err);
    }
  }

  if (!allSearchContent) {
    res.json({
      internetResults: [],
      explanation: "Не удалось получить данные из интернета. Попробуйте другой запрос.",
      query,
    });
    return;
  }

  const systemPrompt = `Ты — AI-ассистент для CRM системы бренда Booomerangs (тульский бренд одежды).
Твоя задача: на основе данных из интернета найти потенциальных оптовых клиентов — магазины, шоурумы, бутики, маркетплейсы, стрит-шопы которые могут быть заинтересованы в закупке одежды.

Данные из интернета:
${allSearchContent}

Извлеки из этих данных конкретные компании/магазины. Для каждой компании верни:
- companyName: название компании/магазина (обязательно)
- city: город (если есть)
- phone: телефон (если есть)
- website: сайт (если есть)
- category: тип магазина (например: стрит-шоп, бутик, онлайн-магазин, маркетплейс, шоурум)
- description: краткое описание (1-2 предложения почему они подходят)
- sourceUrl: ссылка на источник (если есть)
- instagram: инстаграм (если есть)

Верни ответ СТРОГО в формате JSON:
{
  "results": [
    {
      "companyName": "...",
      "city": "...",
      "phone": "...",
      "website": "...",
      "category": "...",
      "description": "...",
      "sourceUrl": "...",
      "instagram": "..."
    }
  ],
  "explanation": "краткое объяснение на русском что было найдено и почему эти компании подходят"
}

Верни от 3 до 10 наиболее релевантных компаний. Если компания не имеет названия — пропусти её.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Найди потенциальных клиентов по запросу: ${query}`,
      },
    ],
    system: systemPrompt,
  });

  const block = message.content[0];
  const rawText = block.type === "text" ? block.text : "{}";

  let internetResults: Array<{
    companyName: string;
    city?: string | null;
    phone?: string | null;
    website?: string | null;
    category?: string | null;
    description?: string | null;
    sourceUrl?: string | null;
    instagram?: string | null;
  }> = [];
  let explanation = "Поиск завершён";

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      internetResults = Array.isArray(parsed.results) ? parsed.results : [];
      explanation = parsed.explanation ?? explanation;
    }
  } catch {
    explanation = "Не удалось обработать ответ ИИ";
  }

  res.json({
    internetResults,
    explanation,
    query,
  });
});

export default router;
