import { pool } from "@workspace/db";

let _memoryKey: string | null = null;

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function getGeminiKey(): Promise<string | null> {
  if (_memoryKey) return _memoryKey;

  try {
    await ensureTable();
    const res = await pool.query(
      "SELECT value FROM app_settings WHERE key = 'gemini_api_key'",
    );
    if (res.rows.length > 0) {
      _memoryKey = res.rows[0].value as string;
      return _memoryKey;
    }
  } catch {}

  return process.env.GEMINI_API_KEY ?? null;
}

export async function setGeminiKey(key: string): Promise<void> {
  _memoryKey = key;
  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('gemini_api_key', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [key],
    );
  } catch (e) {
    console.error("Failed to persist Gemini key:", e);
  }
}

export async function clearGeminiKey(): Promise<void> {
  _memoryKey = null;
  try {
    await pool.query("DELETE FROM app_settings WHERE key = 'gemini_api_key'");
  } catch {}
}
