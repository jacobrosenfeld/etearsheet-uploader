'use client';
import { useState, useEffect } from 'react';
import { AdminNotification } from '@/lib/types';

interface NotificationPopupProps {
  notification: AdminNotification;
  userId: string;
  onDismiss: () => void;
}

export function NotificationPopup({ notification, userId, onDismiss }: NotificationPopupProps) {
  const handleDismiss = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: notification.id,
          action: 'dismiss',
          userId
        })
      });
      onDismiss();
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      onDismiss(); // Dismiss locally even if API fails
    }
  };

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'feature':
        return '🎉';
      case 'update':
        return '🔔';
      case 'announcement':
        return '📢';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-fade-in">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{getTypeIcon()}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{notification.title}</h3>
              <p className="text-xs text-gray-500">Version {notification.version}</p>
            </div>
          </div>
        </div>
        
        <p className="text-gray-700 mb-6 leading-relaxed">{notification.message}</p>
        
        <button
          onClick={handleDismiss}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const MAX_DISPLAYED_NOTIFICATIONS = 3; // Maximum notifications shown in panel

export function NotificationPanel({ isOpen, onClose, userId }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return '🎉';
      case 'update':
        return '🔔';
      case 'announcement':
        return '📢';
      default:
        return 'ℹ️';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (!isOpen) return null;

  const displayedNotifications = notifications.slice(0, MAX_DISPLAYED_NOTIFICATIONS);
  const hasMore = notifications.length > MAX_DISPLAYED_NOTIFICATIONS;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-lg sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Updates & Announcements</h2>
            <p className="text-sm text-gray-500">Stay informed about new features and changes</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedNotifications.map((notification) => {
                const isDismissed = notification.dismissedBy?.includes(userId);
                return (
                  <div
                    key={notification.id}
                    className={`border rounded-lg p-4 ${
                      isDismissed ? 'bg-gray-50 opacity-75' : 'bg-white border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{getTypeIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                          {isDismissed && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              Read
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Version {notification.version}</span>
                          <span>•</span>
                          <span>{formatDate(notification.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">
                    Showing {MAX_DISPLAYED_NOTIFICATIONS} of {notifications.length} notifications
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-600 text-center">
            <a 
              href="https://github.com/jacobrosenfeld/etearsheet-uploader/blob/main/CHANGELOG.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View full changelog
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
