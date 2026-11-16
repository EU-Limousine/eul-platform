import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Shared look for inputs and selects. Use with react-hook-form's register(). */
export const inputClass =
  'w-full rounded-control border border-border bg-surface px-3 py-2 text-sm aria-[invalid=true]:border-danger';

export function FormField({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control bg-danger-bg px-3 py-2 text-sm text-text">
      {message}
    </p>
  );
}

export function PrimaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center gap-2 rounded-control border border-border px-4 py-2 text-sm hover:bg-canvas disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Yes/no pill used in tables (text + colour, never colour alone). */
export function YesNo({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${value ? 'border-success/40 bg-success-bg' : 'border-border bg-canvas text-text-muted'}`}>
      {value ? yes : no}
    </span>
  );
}
