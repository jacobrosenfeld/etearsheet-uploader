import { NextRequest, NextResponse } from 'next/server';
import { getRole } from '@/lib/sessions';
import { readConfig, writeConfig } from '@/lib/configStore';

export async function GET() {
  try {
    const role = await getRole();
    
    // Only admins can access notifications
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const cfg = await readConfig();
    const notifications = cfg.adminNotifications || [];

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    
    // Only admins can manage notifications
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { id, adminId } = body;

    if (!id || !adminId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cfg = await readConfig();
    const notifications = cfg.adminNotifications || [];

    // Mark notification as dismissed for this admin
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      if (!notification.dismissedBy) {
        notification.dismissedBy = [];
      }
      if (!notification.dismissedBy.includes(adminId)) {
        notification.dismissedBy.push(adminId);
      }
    }

    await writeConfig({ ...cfg, adminNotifications: notifications });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
