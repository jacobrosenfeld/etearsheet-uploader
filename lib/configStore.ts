// lib/configStore.ts
import { put, list, del, head } from '@vercel/blob';

export type PortalConfig = {
  clients: string[];
  campaigns: string[];
  publications: string[];
};

const KEY = process.env.APP_CONFIG_BLOB_KEY || 'config/upload-portal-config.json';

/**
 * Returns the blob URL if it exists, otherwise null.
 */
async function findConfigUrl(): Promise<string | null> {
  // Try a HEAD first (fast path)
  try {
    const res = await head(KEY);
    if (res?.url) return res.url;
  } catch (_) {
    // fall back to list() in case HEAD isn’t supported locally
  }

  // Fallback: list with prefix
  const { blobs } = await list({ prefix: KEY });
  const hit = blobs.find(b => b.pathname === KEY);
  return hit?.url ?? null;
}

export async function readConfig(): Promise<PortalConfig> {
  const url = await findConfigUrl();
  if (!url) {
    // Not created yet — return empty
    return { clients: [], campaigns: [], publications: [] };
  }
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to read config from Blob (${res.status})`);
  }
  const json = (await res.json()) as Partial<PortalConfig>;
  return {
    clients: json.clients ?? [],
    campaigns: json.campaigns ?? [],
    publications: json.publications ?? [],
  };
}

export async function writeConfig(nextCfg: PortalConfig): Promise<void> {
  const body = JSON.stringify(nextCfg, null, 2);
  await put(KEY, body, {
    access: 'public',
    contentType: 'application/json',
  });
}

/** Optional helper if you ever want to reset */
export async function resetConfig(): Promise<void> {
  try { await del(KEY); } catch { /* ignore */ }
}
