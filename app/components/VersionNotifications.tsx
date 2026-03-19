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
 * One-time popup that shows the last 2 unseen versions
 * Displays when there are unseen versions
 */
export function VersionNotificationPopup({
  unseenVersions,
  currentVersion,
  onDismiss
}: VersionNotificationPopupProps) {

  const getTypeIcon = (sectionName: string) => {
    switch (sectionName) {
      case 'Added': return '✨';
      case 'Changed': return '🔄';
      case 'Fixed': return '🐛';
      case 'Security': return '🔒';
      case 'Deprecated': return '⚠️';
      case 'Removed': return '🗑️';
      default: return '📝';
    }
  };

  // Show only the last 2 unseen versions to reduce scrolling
  const displayVersions = unseenVersions.slice(0, 2);
  const hasMore = unseenVersions.length > 2;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative animate-fade-in">
        <div className="h-1 bg-gradient-to-r from-brand to-brand-hover rounded-t-2xl" />

        <div className="p-6">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close notification"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="mb-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">New Updates Available</h2>
                <p className="text-xs text-slate-400">Version {currentVersion}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {displayVersions.map((versionInfo) => (
              <div key={versionInfo.version} className="border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
                    v{versionInfo.version}
                  </span>
                  <span className="text-xs text-slate-400">{versionInfo.date}</span>
                </div>

                <div className="space-y-2">
                  {Object.entries(versionInfo.sections).map(([sectionName, items]) => (
                    <div key={sectionName} className="ml-1">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                        <span>{getTypeIcon(sectionName)}</span>
                        <span>{sectionName}</span>
                      </h4>
                      <ul className="ml-5 space-y-0.5">
                        {items.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="text-sm text-slate-600 list-disc">
                            {item.length > 150 ? item.substring(0, 150) + '…' : item}
                          </li>
                        ))}
                        {items.length > 3 && (
                          <li className="text-xs text-slate-400 italic">
                            +{items.length - 3} more…
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {hasMore && (
              <p className="text-xs text-slate-400 text-center">
                +{unseenVersions.length - 2} more version{unseenVersions.length - 2 > 1 ? 's' : ''} available
              </p>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onDismiss}
              className="btn-primary flex-1 justify-center"
            >
              Got it!
            </button>
            <a
              href="https://github.com/jacobrosenfeld/etearsheet-uploader/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex-1 justify-center text-center"
            >
              View Changelog
            </a>
          </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-fade-in">
        <div className="h-1 bg-gradient-to-r from-brand to-brand-hover rounded-t-2xl" />
        <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Recent Updates</h2>
            <p className="text-xs text-slate-400">Latest changes and improvements</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {recentVersions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No updates yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVersions.map((versionInfo) => (
                <div
                  key={versionInfo.version}
                  className="border border-slate-100 rounded-xl p-4 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                          v{versionInfo.version}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(versionInfo.date)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        {versionInfo.title}
                      </p>
                      <div className="text-xs text-slate-400 space-y-0.5">
                        {versionInfo.summary.slice(0, 3).map((item, idx) => (
                          <p key={idx} className="truncate">{item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {totalVersions > 3 && (
                <p className="text-center text-xs text-slate-400 pt-1">
                  Showing 3 of {totalVersions} versions
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-400 text-center">
            <a
              href="https://github.com/jacobrosenfeld/etearsheet-uploader/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              View full changelog on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
