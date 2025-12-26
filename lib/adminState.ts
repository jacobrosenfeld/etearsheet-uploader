/**
 * Admin state storage using Vercel Blob
 * Stores persistent admin-specific state separate from config
 */

import { put, list } from '@vercel/blob';

const ADMIN_STATE_KEY = process.env.ADMIN_STATE_BLOB_KEY || 'admin-state/admin-state.json';

export type AdminState = {
  lastDismissedVersion: string;
  updatedAt: string;
};

/**
 * Get the admin state blob URL if it exists
 */
async function findAdminStateUrl(): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: 'admin-state/' });
    
    // Look for exact match first
    const exactMatch = blobs.find(b => b.pathname === ADMIN_STATE_KEY);
    if (exactMatch) return exactMatch.url;
    
    // Look for any admin state files
    const stateBlobs = blobs.filter(b => 
      b.pathname.includes('admin-state') && 
      b.pathname.includes('.json')
    );
    
    if (stateBlobs.length > 0) {
      // Sort by created date and return the newest
      stateBlobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      return stateBlobs[0].url;
    }
    
    return null;
  } catch (e) {
    console.warn('Error finding admin state URL:', e);
    return null;
  }
}

/**
 * Read admin state from Vercel Blob
 * Returns default state if not found or on error
 */
export async function readAdminState(): Promise<AdminState> {
  try {
    const url = await findAdminStateUrl();
    
    if (!url) {
      // Return default state
      return {
        lastDismissedVersion: '0.0.0',
        updatedAt: new Date().toISOString()
      };
    }
    
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`Failed to read admin state from Blob (${res.status})`);
      return {
        lastDismissedVersion: '0.0.0',
        updatedAt: new Date().toISOString()
      };
    }
    
    const state = await res.json() as AdminState;
    return state;
  } catch (e) {
    console.error('Error reading admin state:', e);
    // Return default state as fallback
    return {
      lastDismissedVersion: '0.0.0',
      updatedAt: new Date().toISOString()
    };
  }
}

/**
 * Write admin state to Vercel Blob
 * @param state - Admin state to persist
 */
export async function writeAdminState(state: AdminState): Promise<void> {
  try {
    const body = JSON.stringify(state, null, 2);
    await put(ADMIN_STATE_KEY, body, {
      access: 'public',
      contentType: 'application/json',
    });
  } catch (e) {
    console.error('Error writing admin state:', e);
    throw new Error('Failed to save admin state');
  }
}

/**
 * Update the last dismissed version
 * @param version - Version string (e.g., "1.2.1")
 */
export async function updateLastDismissedVersion(version: string): Promise<void> {
  const state = await readAdminState();
  state.lastDismissedVersion = version;
  state.updatedAt = new Date().toISOString();
  await writeAdminState(state);
}
