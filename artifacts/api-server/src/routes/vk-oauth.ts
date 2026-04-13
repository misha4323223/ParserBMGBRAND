import { Router, type IRouter } from "express";
import { getVkUserToken, setVkUserToken, clearVkUserToken } from "../lib/vk-token-store";

const router: IRouter = Router();

const VK_APP_ID = process.env.VK_APP_ID ?? "";

function getCallbackUri(req: { hostname: string }): string {
  const domain = process.env.REPLIT_DEV_DOMAIN ?? req.hostname;
  return `https://${domain}/vk-callback.html`;
}

router.get("/vk-oauth/start", (req, res) => {
  if (!VK_APP_ID) {
    res.status(503).send("VK_APP_ID не настроен");
    return;
  }
  const redirectUri = getCallbackUri(req);
  const url = new URL("https://oauth.vk.com/authorize");
  url.searchParams.set("client_id", VK_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "groups");
  url.searchParams.set("response_type", "token");
  url.searchParams.set("v", "5.199");
  url.searchParams.set("display", "page");
  res.redirect(url.toString());
});

router.post("/vk-oauth/token", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "token required" });
    return;
  }
  await setVkUserToken(token);
  res.json({ ok: true });
});

router.get("/vk-oauth/status", async (_req, res) => {
  const token = await getVkUserToken();
  res.json({ connected: !!token });
});

router.post("/vk-oauth/disconnect", async (_req, res) => {
  await clearVkUserToken();
  res.json({ ok: true });
});

export default router;
