import Image from 'next/image';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Container, GoldLink, OutlineLink } from '../ui';

/** Building blocks for the content pages (services, business, fleet, about, FAQ, contact…). Tokens only. */

export interface Crumb {
  href?: string;
  label: string;
}

/** "Home › Services › Airport transfers". The last crumb is the current page (no link). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations('pages.common');
  return (
    <nav aria-label={t('breadcrumbs')} className="text-xs text-site-on-dark-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} aria-hidden />}
            {c.href ? (
              <Link href={c.href} className="hover:text-site-gold">{c.label}</Link>
            ) : (
              <span aria-current="page" className="text-site-on-dark">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Dark page header with an optional background photo. `children` = extra actions under the text. */
export function PageHero({
  eyebrow,
  title,
  text,
  image,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  image?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-site-dark text-site-on-dark">
      {image && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-site-dark via-site-dark/85 to-site-dark/30" aria-hidden />
        </>
      )}
      <Container className="relative py-16 sm:py-20">
        {crumbs && <Breadcrumbs items={crumbs} />}
        <div className="mt-6 max-w-2xl">
          {eyebrow && <p className="text-xs font-semibold tracking-[0.18em] text-site-gold uppercase">{eyebrow}</p>}
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{title}</h1>
          {text && <p className="mt-4 text-lg leading-relaxed text-site-on-dark-muted">{text}</p>}
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
      </Container>
    </section>
  );
}

/** Standard light section with an optional heading. */
export function Section({ id, title, intro, children, tone = 'surface' }: { id?: string; title?: string; intro?: string; children: ReactNode; tone?: 'surface' | 'warm' }) {
  return (
    <section id={id} className={`scroll-mt-24 py-16 ${tone === 'warm' ? 'bg-site-warm' : 'bg-site-surface'}`}>
      <Container>
        {title && <h2 className="font-display text-3xl text-text">{title}</h2>}
        {intro && <p className="mt-3 max-w-3xl text-text-muted">{intro}</p>}
        <div className={title || intro ? 'mt-8' : ''}>{children}</div>
      </Container>
    </section>
  );
}

/** Ticked list of short points. */
export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 rounded-card border border-border bg-site-card p-4 text-sm leading-relaxed text-text">
          <Check size={18} aria-hidden className="mt-0.5 shrink-0 text-site-gold-text" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps. */
export function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="grid gap-6 md:grid-cols-3">
      {items.map((s, i) => (
        <li key={s.title} className="rounded-card border border-border bg-site-card p-6">
          <span className="grid size-9 place-items-center rounded-full bg-site-dark font-semibold text-site-gold tabular-nums">{i + 1}</span>
          <h3 className="mt-4 font-display text-lg text-text">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export interface Faq {
  q: string;
  a: string;
}

/** Native <details> accordion (works without JavaScript, keyboard accessible). */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-border rounded-card border border-border bg-site-card">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-text">
            {f.q}
            <ChevronRight size={18} aria-hidden className="shrink-0 transition group-open:rotate-90" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** schema.org FAQPage for search engines (only for questions shown on the page). */
export function FaqJsonLd({ items }: { items: Faq[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  // JSON.stringify output is safe in a script tag once "<" is escaped.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

/** Closing call to action used at the bottom of every content page. */
export function CtaBand({ secondaryHref = '/contact' }: { secondaryHref?: string }) {
  const t = useTranslations('pages.common.cta');
  return (
    <section className="bg-site-dark-2 text-site-on-dark">
      <Container className="flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl">{t('title')}</h2>
          <p className="mt-2 text-site-on-dark-muted">{t('text')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <GoldLink href="/book">
            {t('book')} <ArrowRight size={16} aria-hidden />
          </GoldLink>
          <OutlineLink href={secondaryHref}>{t('contact')}</OutlineLink>
        </div>
      </Container>
    </section>
  );
}
