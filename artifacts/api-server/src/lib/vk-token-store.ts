import { pool } from "@workspace/db";

let _memoryToken: string | null = null;

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function getVkUserToken(): Promise<string | null> {
  if (_memoryToken) return _memoryToken;

  const envToken = process.env.VK_ACCESS_TOKEN;
  if (envToken) return envToken;

  try {
    await ensureTable();
    const res = await pool.query(
      "SELECT value FROM app_settings WHERE key = 'vk_user_token'",
    );
    if (res.rows.length > 0) {
      _memoryToken = res.rows[0].value as string;
      return _memoryToken;
    }
  } catch {}

  return null;
}

export async function setVkUserToken(token: string): Promise<void> {
  _memoryToken = token;
  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('vk_user_token', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [token],
    );
  } catch (e) {
    console.error("Failed to persist VK token:", e);
  }
}

export async function clearVkUserToken(): Promise<void> {
  _memoryToken = null;
  try {
    await pool.query("DELETE FROM app_settings WHERE key = 'vk_user_token'");
  } catch {}
}
