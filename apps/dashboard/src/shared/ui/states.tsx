import { AlertCircle, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@eul/api-client';

/** Loading placeholder rows (every screen: loading, empty, error, populated). */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-control bg-canvas" />
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-text-muted">
      <Inbox size={28} aria-hidden />
      {message}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const message = error instanceof ApiError ? error.body.message : t('common.loadError');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center text-sm">
      <AlertCircle size={28} aria-hidden className="text-danger" />
      <p className="text-text">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-control border border-border px-3 py-1.5 hover:bg-canvas">
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

/** User-facing message for any API error. 409 gets the conflict text. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.body.message || fallback;
  return fallback;
}
