// lib/configStore.ts
import { put, list, del } from '@vercel/blob';
import { PortalConfig } from './types';

const KEY = process.env.APP_CONFIG_BLOB_KEY || 'config/upload-portal-config.json';

/**
 * Returns the blob URL if it exists, otherwise null.
 */
async function findConfigUrl(): Promise<string | null> {
  try {
    // List all blobs with the config prefix to find any config files
    const { blobs } = await list({ prefix: 'config/' });
    
    // Look for exact match first
    const exactMatch = blobs.find(b => b.pathname === KEY);
    if (exactMatch) return exactMatch.url;
    
    // Look for any config files (in case the key changed)
    const configBlobs = blobs.filter(b => 
      b.pathname.includes('config') && 
      b.pathname.includes('.json')
    );
    
    if (configBlobs.length > 0) {
      // Sort by created date and return the newest
      configBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      return configBlobs[0].url;
    }
    
    return null;
  } catch (e) {
    console.warn('Error finding config URL:', e);
    return null;
  }
}

/**
 * Clean up any duplicate or old config blobs
 */
async function cleanupOldConfigs(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: 'config/' });
    const configBlobs = blobs.filter(b => 
      b.pathname.includes('config') && 
      b.pathname.includes('.json')
    );
    
    if (configBlobs.length <= 1) return; // Nothing to clean up
    
    // Sort by created date (newest first)
    configBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    // Keep the newest, delete the rest
    const toDelete = configBlobs.slice(1);
    for (const blob of toDelete) {
      try {
        await del(blob.url);
      } catch (e) {
        console.warn('Failed to delete old config blob:', blob.pathname);
      }
    }
  } catch (e) {
    console.warn('Failed to cleanup old configs:', e);
  }
}

export async function readConfig(): Promise<PortalConfig> {
  try {
    // Clean up any old configs first
    await cleanupOldConfigs();
    
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
  } catch (e) {
    console.error('Error reading config:', e);
    // Return empty config as fallback
    return { clients: [], campaigns: [], publications: [] };
  }
}

export async function writeConfig(nextCfg: PortalConfig): Promise<void> {
  try {
    // Clean up old configs before writing new one
    await cleanupOldConfigs();
    
    const body = JSON.stringify(nextCfg, null, 2);
    await put(KEY, body, {
      access: 'public',
      contentType: 'application/json',
    });
  } catch (e) {
    console.error('Error writing config:', e);
    throw new Error('Failed to save configuration');
  }
}

/** Optional helper if you ever want to reset */
export async function resetConfig(): Promise<void> {
  try { 
    const { blobs } = await list({ prefix: 'config/' });
    for (const blob of blobs) {
      await del(blob.url);
    }
  } catch (e) {
    console.warn('Error resetting config:', e);
  }
}