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
    const { notificationId, action, userId } = body;

    if (!notificationId || !action || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cfg = await readConfig();
    const notifications = cfg.adminNotifications || [];

    if (action === 'dismiss') {
      // Mark notification as dismissed for this user
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        if (!notification.dismissedBy) {
          notification.dismissedBy = [];
        }
        if (!notification.dismissedBy.includes(userId)) {
          notification.dismissedBy.push(userId);
        }
      }

      await writeConfig({ ...cfg, adminNotifications: notifications });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
