import {
  DEFAULT_SETTINGS,
  validateSettings,
  type SettingsKey,
  type SettingsMap,
} from "@/lib/admin/settings";
import { db, prepareAdmin } from "@/lib/admin/server/db";

export async function readSettings<K extends SettingsKey>(key: K): Promise<SettingsMap[K]> {
  await prepareAdmin();
  const rows = (await db()`SELECT value FROM game_settings WHERE key = ${key}`) as {
    value: unknown;
  }[];
  if (!rows[0]) return DEFAULT_SETTINGS[key];
  const merged =
    key === "flags"
      ? { ...DEFAULT_SETTINGS.flags, ...(rows[0].value as object) }
      : { ...DEFAULT_SETTINGS[key], ...(rows[0].value as object) };
  const valid = validateSettings(key, merged);
  return typeof valid === "string" ? DEFAULT_SETTINGS[key] : valid;
}

export async function readAllSettings(): Promise<SettingsMap> {
  const [maintenance, game, flags, moderation] = await Promise.all([
    readSettings("maintenance"),
    readSettings("game"),
    readSettings("flags"),
    readSettings("moderation"),
  ]);
  return { maintenance, game, flags, moderation };
}
