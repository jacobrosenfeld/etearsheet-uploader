'use client';
import { useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

/**
 * Reusable confirmation dialog component
 * Supports keyboard navigation (Escape to cancel, Enter to confirm)
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default'
}: ConfirmDialogProps) {
  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const confirmButtonClass = variant === 'danger'
    ? 'flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors'
    : 'flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
        <div className="mb-4">
          <h2 
            id="confirm-dialog-title"
            className="text-xl font-bold text-gray-900 mb-2"
          >
            {title}
          </h2>
          <p 
            id="confirm-dialog-description"
            className="text-gray-600"
          >
            {message}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded transition-colors"
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={confirmButtonClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
