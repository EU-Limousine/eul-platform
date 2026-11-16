import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Small shared pieces for the booking steps (website look; tokens only). */
export const fieldClass =
  'w-full rounded-control border border-border bg-surface px-3 py-3 text-base text-text aria-[invalid=true]:border-danger';

export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function PrimaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="w-full rounded-control bg-brand-black px-5 py-3.5 text-base font-medium text-on-dark disabled:opacity-50 sm:w-auto"
    >
      {children}
    </button>
  );
}

export function BackButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className="px-2 py-3 text-sm text-text-muted underline-offset-4 hover:text-text hover:underline">
      {children}
    </button>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-control bg-danger-bg px-4 py-3 text-sm text-text">
      {children}
    </div>
  );
}
