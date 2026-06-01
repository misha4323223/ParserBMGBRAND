import { Router, type IRouter } from "express";
import { getVkUserToken } from "../lib/vk-token-store";
import { getGeminiKey } from "../lib/gemini-key-store";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: IRouter = Router();

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

interface VkError extends Error {
  code?: number;
}

async function vkRequest(token: string, method: string, params: Record<string, string | number>): Promise<unknown> {
  const url = new URL(`${VK_API}/${method}`);
  url.searchParams.set("v", VK_VERSION);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  const json = await res.json() as { response?: unknown; error?: { error_msg: string; error_code: number } };
  if (json.error) {
    const err: VkError = new Error(json.error.error_msg);
    err.code = json.error.error_code;
    throw err;
  }
  return json.response;
}

function isNoPermission(e: unknown): boolean {
  const code = (e as VkError).code;
  const msg = e instanceof Error ? e.message.toLowerCase() : "";
  // VK codes: 5=auth failed, 7=permission denied, 15=access denied, 901/902/917=messages-specific
  return (
    code === 5 || code === 7 || code === 15 ||
    code === 901 || code === 902 || code === 917 ||
    msg.includes("permission") || msg.includes("access denied") || msg.includes("authorization")
  );
}

// ─── Resolve screen_name → peer_id ──────────────────────────────────────────

async function resolvePeerId(token: string, rawInput: string): Promise<number> {
  const screenName = rawInput.replace(/.*vk\.com\//, "").replace(/\/$/, "").trim();
  if (!screenName) throw new Error("Не указана VK ссылка");

  // Try as user
  try {
    const res = await vkRequest(token, "users.get", { user_ids: screenName }) as Array<{ id: number }>;
    if (Array.isArray(res) && res[0]?.id) return res[0].id;
  } catch (e) {
    if (isNoPermission(e)) throw e;
  }

  // Try as group/community
  try {
    const res = await vkRequest(token, "groups.getById", { group_id: screenName }) as { groups?: Array<{ id: number }>; 0?: { id: number } };
    const items = Array.isArray(res) ? res : (res as { groups?: Array<{ id: number }> }).groups ?? [];
    const id = (items as Array<{ id: number }>)[0]?.id;
    if (id) return 2_000_000_000 + id;
  } catch (e) {
    if (isNoPermission(e)) throw e;
  }

  throw new Error(`Не удалось найти VK аккаунт: ${screenName}`);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/vk-messages/resolve  { screenName }
router.post("/vk-messages/resolve", async (req, res): Promise<void> => {
  const { screenName } = req.body as { screenName?: string };
  if (!screenName?.trim()) { res.status(400).json({ error: "screenName обязателен" }); return; }

  const token = await getVkUserToken();
  if (!token) { res.status(401).json({ error: "VK не подключён" }); return; }

  try {
    const peerId = await resolvePeerId(token, screenName);
    res.json({ peerId });
  } catch (e: unknown) {
    if (isNoPermission(e)) {
      res.status(403).json({ error: "no_messages_permission" });
    } else {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка VK" });
    }
  }
});

// POST /api/vk-messages/send  { peerId, message }
router.post("/vk-messages/send", async (req, res): Promise<void> => {
  const { peerId, message } = req.body as { peerId?: number; message?: string };
  if (!peerId || !message?.trim()) { res.status(400).json({ error: "peerId и message обязательны" }); return; }

  const token = await getVkUserToken();
  if (!token) { res.status(401).json({ error: "VK не подключён" }); return; }

  try {
    const randomId = Math.floor(Math.random() * 2_147_483_647);
    const messageId = await vkRequest(token, "messages.send", {
      peer_id: peerId,
      message: message.trim(),
      random_id: randomId,
    });
    res.json({ ok: true, messageId });
  } catch (e: unknown) {
    if (isNoPermission(e)) {
      res.status(403).json({ error: "no_messages_permission", message: "Токен VK не имеет прав на сообщения. Переподключите VK." });
    } else {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка VK" });
    }
  }
});

// GET /api/vk-messages/history?peerId=123&count=30
router.get("/vk-messages/history", async (req, res): Promise<void> => {
  const { peerId, count = "30" } = req.query as { peerId?: string; count?: string };
  if (!peerId) { res.status(400).json({ error: "peerId обязателен" }); return; }

  const token = await getVkUserToken();
  if (!token) { res.status(401).json({ error: "VK не подключён" }); return; }

  try {
    const result = await vkRequest(token, "messages.getHistory", {
      peer_id: Number(peerId),
      count: Math.min(Number(count), 50),
    }) as {
      count: number;
      items: Array<{ id: number; from_id: number; text: string; date: number; out: number }>;
    };
    res.json({ messages: (result.items ?? []).reverse(), total: result.count });
  } catch (e: unknown) {
    const code = (e as VkError).code;
    // Code 100 = "peer_id is invalid" — диалога ещё не было, возвращаем пустую историю
    if (code === 100) {
      res.json({ messages: [], total: 0 });
      return;
    }
    console.error("[vk-messages/history] VK error", { code, msg: e instanceof Error ? e.message : e });
    if (isNoPermission(e)) {
      res.status(403).json({ error: "no_messages_permission", vkCode: code });
    } else {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка VK", vkCode: code });
    }
  }
});

// POST /api/vk-messages/ai-suggest  { bloggerName, bloggerNiche, history, userRequest }
router.post("/vk-messages/ai-suggest", async (req, res): Promise<void> => {
  const { bloggerName, bloggerNiche, history, userRequest } = req.body as {
    bloggerName?: string;
    bloggerNiche?: string;
    history?: Array<{ out: number; text: string }>;
    userRequest?: string;
  };

  const key = await getGeminiKey();
  if (!key) { res.status(400).json({ error: "Gemini не подключён" }); return; }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const historyText = (history ?? [])
    .slice(-10)
    .map(m => `${m.out ? "Мы (Booomerangs)" : (bloggerName ?? "Блогер")}: ${m.text}`)
    .join("\n");

  const prompt = `Ты — менеджер по коллаборациям бренда Booomerangs (российский streetwear из Тулы).
Ты ведёшь переписку с "${bloggerName ?? "блогером"}" (${bloggerNiche ?? ""}) во ВКонтакте.

${historyText ? `История переписки:\n${historyText}\n` : "(Новый диалог, переписки ещё не было)\n"}
Задача: ${userRequest?.trim() || "написать следующее сообщение для продолжения диалога о сотрудничестве"}

Напиши короткое, живое сообщение (2-4 предложения). Без официоза. Только текст — ничего больше.`;

  try {
    const result = await model.generateContent(prompt);
    res.json({ suggestion: result.response.text().trim() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка Gemini";
    const isOverloaded = msg.includes("503") || msg.includes("overloaded") || msg.includes("high demand") || msg.includes("Service Unavailable");
    const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
    if (isOverloaded) {
      res.status(503).json({ error: "Gemini перегружен — попробуйте через несколько секунд" });
    } else if (isQuota) {
      res.status(429).json({ error: "Gemini: лимит запросов исчерпан на сегодня (бесплатный план: 20 запросов/день)" });
    } else {
      res.status(500).json({ error: msg.slice(0, 200) });
    }
  }
});

export default router;
