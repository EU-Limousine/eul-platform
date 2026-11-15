import type { ReactNode } from 'react';

export function Card({ title, actions, children, className = '' }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-border bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Label/value rows inside a card. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-text">{children}</dd>
    </div>
  );
}
