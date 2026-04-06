import { Router, type IRouter } from "express";
import { db, clientsTable } from "@workspace/db";
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

  const allClients = await db.select().from(clientsTable);

  const clientsSummary = allClients.map((c) =>
    [
      `ID: ${c.id}`,
      `Компания: ${c.companyName}`,
      c.contactName ? `Контакт: ${c.contactName}` : null,
      c.phone ? `Тел: ${c.phone}` : null,
      c.city ? `Город: ${c.city}` : null,
      c.region ? `Регион: ${c.region}` : null,
      c.category ? `Категория: ${c.category}` : null,
      `Статус: ${c.status}`,
      c.orderVolume ? `Объём заказа: ${c.orderVolume}` : null,
      c.notes ? `Заметки: ${c.notes}` : null,
    ]
      .filter(Boolean)
      .join(", ")
  ).join("\n");

  let internetContext = "";
  try {
    const searchQuery = `Booomerangs одежда оптовые клиенты ${query}`;
    const tavilyResult = await tavilyClient.search(searchQuery, {
      searchDepth: "basic",
      maxResults: 5,
      includeAnswer: true,
    });

    if (tavilyResult.answer) {
      internetContext = `\nДанные из интернета по запросу:\n${tavilyResult.answer}\n`;
    }
    if (tavilyResult.results && tavilyResult.results.length > 0) {
      const snippets = tavilyResult.results
        .slice(0, 3)
        .map((r) => `- ${r.title}: ${r.content?.slice(0, 200) ?? ""}`)
        .join("\n");
      internetContext += `\nИсточники:\n${snippets}`;
    }
  } catch (err) {
    internetContext = "";
  }

  const systemPrompt = `Ты — AI-ассистент для CRM системы бренда Booomerangs (тульский бренд одежды).
Тебе дана база клиентов и запрос менеджера по оптовым продажам.
Твоя задача: найти подходящих клиентов по запросу и вернуть JSON с результатами.
${internetContext ? `\nКонтекст из интернета (используй для уточнения критериев поиска):${internetContext}` : ""}

База клиентов:
${clientsSummary}

Верни ответ строго в формате JSON:
{
  "matchedIds": [список ID подходящих клиентов],
  "explanation": "краткое объяснение на русском, почему выбраны именно эти клиенты"
}

Если никто не подходит, верни пустой массив и объяснение.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Запрос менеджера: ${query}`,
      },
    ],
    system: systemPrompt,
  });

  const block = message.content[0];
  const rawText = block.type === "text" ? block.text : "{}";

  let matchedIds: number[] = [];
  let explanation = "Нет объяснения";

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      matchedIds = Array.isArray(parsed.matchedIds) ? parsed.matchedIds : [];
      explanation = parsed.explanation ?? explanation;
    }
  } catch {
    explanation = "Не удалось обработать ответ ИИ";
  }

  const matchedClients = allClients.filter((c) => matchedIds.includes(c.id));

  res.json({
    clients: matchedClients,
    explanation,
    query,
  });
});

export default router;
