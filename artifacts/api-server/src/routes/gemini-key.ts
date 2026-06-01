import { Router, type IRouter } from "express";
import { getGeminiKey, setGeminiKey, clearGeminiKey } from "../lib/gemini-key-store";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: IRouter = Router();

router.post("/gemini-key/save", async (req, res): Promise<void> => {
  const { key } = req.body as { key?: string };
  if (!key?.trim()) {
    res.status(400).json({ error: "key required" });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(key.trim());
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    await model.generateContent("OK");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = (e as { status?: number }).status;
    // 429 = квота исчерпана, 503 = перегружен, 404 = модель переименована —
    // в любом из этих случаев ключ рабочий, просто сохраняем его
    const isKeyValid =
      status === 429 ||
      status === 503 ||
      status === 404 ||
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("Too Many Requests") ||
      msg.includes("503") ||
      msg.includes("overloaded") ||
      msg.includes("high demand") ||
      msg.includes("not found for API version") ||
      msg.includes("404");

    if (isKeyValid) {
      await setGeminiKey(key.trim());
      res.json({ ok: true });
      return;
    }
    res.status(400).json({ error: `Ключ не прошёл проверку: ${msg.slice(0, 200)}` });
    return;
  }

  await setGeminiKey(key.trim());
  res.json({ ok: true });
});

router.get("/gemini-key/status", async (_req, res): Promise<void> => {
  const key = await getGeminiKey();
  res.json({ connected: !!key });
});

router.post("/gemini-key/disconnect", async (_req, res): Promise<void> => {
  await clearGeminiKey();
  res.json({ ok: true });
});

export default router;
