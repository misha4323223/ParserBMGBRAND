import { Router, type IRouter } from "express";
import { getVkUserToken, setVkUserToken, clearVkUserToken } from "../lib/vk-token-store";

const router: IRouter = Router();

const VK_APP_ID = process.env.VK_APP_ID ?? "";
const VK_APP_SECRET = process.env.VK_APP_SECRET ?? "";

function getRedirectUri(req: { protocol: string; hostname: string }): string {
  const domain = process.env.REPLIT_DEV_DOMAIN ?? req.hostname;
  return `https://${domain}/api/vk-oauth/callback`;
}

router.get("/vk-oauth/start", (req, res) => {
  if (!VK_APP_ID || !VK_APP_SECRET) {
    res.status(503).send("VK_APP_ID или VK_APP_SECRET не настроены");
    return;
  }
  const redirectUri = getRedirectUri(req);
  const url = new URL("https://oauth.vk.com/authorize");
  url.searchParams.set("client_id", VK_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "groups");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("v", "5.199");
  url.searchParams.set("display", "page");
  res.redirect(url.toString());
});

router.get("/vk-oauth/callback", async (req, res) => {
  const code = req.query["code"] as string | undefined;
  const error = req.query["error"] as string | undefined;

  if (error || !code) {
    res.send(`<html><body><script>
      window.opener && window.opener.postMessage({ type: 'vk_oauth_error', error: '${error ?? "no_code"}' }, '*');
      window.close();
    </script><p>Ошибка авторизации: ${error ?? "код не получен"}. Закройте это окно.</p></body></html>`);
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);
    const tokenUrl = new URL("https://oauth.vk.com/access_token");
    tokenUrl.searchParams.set("client_id", VK_APP_ID);
    tokenUrl.searchParams.set("client_secret", VK_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenData.access_token) {
      const errMsg = tokenData.error_description ?? tokenData.error ?? "unknown";
      res.send(`<html><body><script>
        window.opener && window.opener.postMessage({ type: 'vk_oauth_error', error: '${errMsg}' }, '*');
        window.close();
      </script><p>Ошибка получения токена: ${errMsg}. Закройте это окно.</p></body></html>`);
      return;
    }

    await setVkUserToken(tokenData.access_token);

    res.send(`<html><body><script>
      window.opener && window.opener.postMessage({ type: 'vk_oauth_success' }, '*');
      window.close();
    </script><p>ВКонтакте успешно подключён! Закройте это окно.</p></body></html>`);
  } catch (err) {
    console.error("VK OAuth callback error:", err);
    res.send(`<html><body><script>
      window.opener && window.opener.postMessage({ type: 'vk_oauth_error', error: 'server_error' }, '*');
      window.close();
    </script><p>Ошибка сервера. Закройте это окно.</p></body></html>`);
  }
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
