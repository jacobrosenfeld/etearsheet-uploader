'use client';
import { useState, useEffect } from 'react';

export type VersionNotification = {
  version: string;
  date: string;
  title: string;
  summary: string[];
  sections: { [key: string]: string[] };
};

interface VersionNotificationPopupProps {
  unseenVersions: VersionNotification[];
  currentVersion: string;
  onDismiss: () => void;
}

/**
 * One-time popup that shows all unseen versions
 * Displays when there are unseen versions
 */
export function VersionNotificationPopup({ 
  unseenVersions, 
  currentVersion, 
  onDismiss 
}: VersionNotificationPopupProps) {
  
  const getTypeIcon = (sectionName: string) => {
    switch (sectionName) {
      case 'Added':
        return '✨';
      case 'Changed':
        return '🔄';
      case 'Fixed':
        return '🐛';
      case 'Security':
        return '🔒';
      case 'Deprecated':
        return '⚠️';
      case 'Removed':
        return '🗑️';
      default:
        return '📝';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🚀</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                New Updates Available!
              </h2>
              <p className="text-sm text-gray-600">Version {currentVersion}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {unseenVersions.map((versionInfo) => (
            <div key={versionInfo.version} className="border-b pb-4 last:border-b-0">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Version {versionInfo.version}
                </h3>
                <span className="text-xs text-gray-500">{versionInfo.date}</span>
              </div>
              
              <div className="space-y-2">
                {Object.entries(versionInfo.sections).map(([sectionName, items]) => (
                  <div key={sectionName} className="ml-2">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-1">
                      <span>{getTypeIcon(sectionName)}</span>
                      <span>{sectionName}</span>
                    </h4>
                    <ul className="ml-6 space-y-1">
                      {items.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-600 list-disc">
                          {item.length > 150 ? item.substring(0, 150) + '...' : item}
                        </li>
                      ))}
                      {items.length > 3 && (
                        <li className="text-xs text-gray-500 italic">
                          +{items.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Got it!
          </button>
          <a
            href="https://github.com/jacobrosenfeld/etearsheet-uploader/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded transition-colors text-center"
          >
            View Full Changelog
          </a>
        </div>
      </div>
    </div>
  );
}

interface VersionNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  recentVersions: VersionNotification[];
  totalVersions: number;
}

/**
 * Notification panel that shows recent versions (max 3)
 */
export function VersionNotificationPanel({ 
  isOpen, 
  onClose, 
  recentVersions,
  totalVersions 
}: VersionNotificationPanelProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-lg sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Recent Updates</h2>
            <p className="text-sm text-gray-500">Latest changes and improvements</p>
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
          {recentVersions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No updates yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentVersions.map((versionInfo) => (
                <div
                  key={versionInfo.version}
                  className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">🎉</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          Version {versionInfo.version}
                        </h3>
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {versionInfo.title}
                      </p>
                      <div className="text-xs text-gray-600 space-y-1">
                        {versionInfo.summary.slice(0, 3).map((item, idx) => (
                          <p key={idx} className="truncate">{item}</p>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        <span>{formatDate(versionInfo.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {totalVersions > 3 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">
                    Showing 3 of {totalVersions} versions
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
