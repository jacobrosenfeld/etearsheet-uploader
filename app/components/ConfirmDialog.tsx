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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Accent bar for danger variant */}
        {variant === 'danger' && <div className="h-1 bg-brand-secondary" />}

        <div className="p-6">
          <h2
            id="confirm-dialog-title"
            className="text-lg font-semibold text-slate-800 mb-2"
          >
            {title}
          </h2>
          <p
            id="confirm-dialog-description"
            className="text-sm text-slate-500 mb-6"
          >
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary flex-1 justify-center"
              autoFocus
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 justify-center ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
