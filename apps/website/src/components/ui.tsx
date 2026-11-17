import type { ComponentProps, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

/** Shared website building blocks. Colours come from the site theme tokens only. */

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

/** Eyebrow + serif title + optional subtitle. `tone="dark"` for dark sections. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  tone = 'light',
  align = 'left',
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center';
  action?: ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${align === 'center' ? 'flex-col items-center text-center' : ''}`}>
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-3xl'}>
        {eyebrow && (
          <p className={`text-xs font-semibold tracking-[0.18em] uppercase ${dark ? 'text-site-gold' : 'text-site-gold-text'}`}>{eyebrow}</p>
        )}
        <h2 className={`mt-2 font-display text-3xl leading-tight sm:text-4xl ${dark ? 'text-site-on-dark' : 'text-text'}`}>{title}</h2>
        {subtitle && <p className={`mt-3 ${dark ? 'text-site-on-dark-muted' : 'text-text-muted'}`}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type LinkProps = ComponentProps<typeof Link>;

/** Gold call-to-action (dark text on gold: good contrast). */
export function GoldLink({ children, className = '', ...props }: LinkProps & { children: ReactNode }) {
  return (
    <Link
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-control bg-site-gold px-6 py-3 text-sm font-semibold text-site-dark transition hover:brightness-105 ${className}`}
    >
      {children}
    </Link>
  );
}

/** Outline button for dark backgrounds. */
export function OutlineLink({ children, className = '', ...props }: LinkProps & { children: ReactNode }) {
  return (
    <Link
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-control border border-site-on-dark/60 px-6 py-3 text-sm font-semibold text-site-on-dark transition hover:bg-site-on-dark/10 ${className}`}
    >
      {children}
    </Link>
  );
}

/** "Learn more →" style text link. */
export function ArrowLink({ children, tone = 'light', ...props }: LinkProps & { children: ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <Link
      {...props}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline ${tone === 'dark' ? 'text-site-gold' : 'text-text'}`}
    >
      {children} <ArrowRight size={15} aria-hidden />
    </Link>
  );
}
