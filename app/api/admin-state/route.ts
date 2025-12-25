/**
 * API endpoint for admin state and version notifications
 * Handles reading/writing dismissal state and calculating unseen versions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { readAdminState, updateLastDismissedVersion } from '@/lib/adminState';
import { parseChangelog, getVersionSummary, getVersionTitle } from '@/lib/changelog';
import { compareVersions } from '@/lib/semver';
import fs from 'fs/promises';
import path from 'path';
import packageJson from '../../../package.json';

/**
 * GET /api/admin-state
 * Returns current admin state and unseen versions
 */
export async function GET() {
  try {
    const role = await getRole();
    
    // Only admins can access
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const state = await readAdminState();
    const currentVersion = packageJson.version;
    
    // Read and parse changelog
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    const changelogContent = await fs.readFile(changelogPath, 'utf-8');
    const entries = parseChangelog(changelogContent);
    
    // Find unseen versions
    // Unseen = versions > lastDismissedVersion AND <= currentVersion
    const unseenVersions = entries.filter(entry => {
      const isGreaterThanDismissed = compareVersions(entry.version, state.lastDismissedVersion) === 1;
      const isLessOrEqualCurrent = compareVersions(entry.version, currentVersion) !== 1;
      return isGreaterThanDismissed && isLessOrEqualCurrent;
    });
    
    // Format unseen versions for display
    const unseenNotifications = unseenVersions.map(entry => ({
      version: entry.version,
      date: entry.date,
      title: getVersionTitle(entry),
      summary: getVersionSummary(entry, 5),
      sections: entry.sections
    }));
    
    // Get recent versions for notification panel (max 3)
    const recentVersions = entries.slice(0, 3).map(entry => ({
      version: entry.version,
      date: entry.date,
      title: getVersionTitle(entry),
      summary: getVersionSummary(entry, 3),
      sections: entry.sections
    }));
    
    return NextResponse.json({
      state,
      currentVersion,
      unseenVersions: unseenNotifications,
      recentVersions,
      hasUnseen: unseenVersions.length > 0
    });
  } catch (error) {
    console.error('Error fetching admin state:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch admin state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin-state
 * Update admin state (dismiss current version)
 */
export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    
    // Only admins can update
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { action, version } = body;
    
    if (action === 'dismiss') {
      const versionToDismiss = version || packageJson.version;
      await updateLastDismissedVersion(versionToDismiss);
      
      return NextResponse.json({ 
        success: true,
        message: `Dismissed version ${versionToDismiss}`
      });
    }
    
    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });
  } catch (error) {
    console.error('Error updating admin state:', error);
    return NextResponse.json({ 
      error: 'Failed to update admin state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
