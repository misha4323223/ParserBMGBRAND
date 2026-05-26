import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AiSearchClientsBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/ai-search", async (req, res): Promise<void> => {
  const parsed = AiSearchClientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query } = parsed.data;

  const systemPrompt = `Ты — AI-ассистент для CRM системы бренда Booomerangs (тульский бренд одежды).
Твоя задача: на основе своих знаний найти потенциальных оптовых клиентов — магазины, шоурумы, бутики, стрит-шопы, которые могут быть заинтересованы в закупке одежды.

Для каждой найденной компании укажи:
- companyName: название (обязательно)
- city: город
- phone: телефон (если известен)
- website: сайт (если известен)
- category: тип (стрит-шоп, бутик, онлайн-магазин, шоурум, маркетплейс)
- description: 1-2 предложения почему подходят Booomerangs
- sourceUrl: ссылка-источник (если известна)
- instagram: ссылка или @никнейм (если известна)
- vk: ссылка или id группы ВКонтакте (если известна)
- telegram: ссылка или @никнейм телеграм (если известна)

Верни СТРОГО JSON:
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
      "instagram": "...",
      "vk": "...",
      "telegram": "..."
    }
  ],
  "explanation": "краткое объяснение на русском"
}

Верни 3–10 наиболее релевантных компаний. Без названия — пропусти. Пустые поля оставляй как null.`;

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
    vk?: string | null;
    telegram?: string | null;
  }> = [];
  let explanation = "Поиск завершён";

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedJson = JSON.parse(jsonMatch[0]);
      internetResults = Array.isArray(parsedJson.results) ? parsedJson.results : [];
      explanation = parsedJson.explanation ?? explanation;
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
