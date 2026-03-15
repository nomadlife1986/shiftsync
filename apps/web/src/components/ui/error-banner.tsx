'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  message,
  title = 'Something went wrong',
  onDismiss,
  className = '',
}: ErrorBannerProps) {
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 ${className}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-xs text-red-700">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 transition-colors hover:text-red-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
