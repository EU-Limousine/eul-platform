'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';

/** Phone/tablet menu. Closes on navigation and on Escape. */
export function MobileMenu({ links, bookLabel, menuLabel, closeLabel }: { links: { href: string; label: string }[]; bookLabel: string; menuLabel: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? closeLabel : menuLabel}
        onClick={() => setOpen((v) => !v)}
        className="rounded-control p-2 text-site-on-dark hover:bg-site-dark-3"
      >
        {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>
      {open && (
        <nav id="mobile-menu" aria-label={menuLabel} className="absolute inset-x-0 top-20 border-b border-site-line-dark bg-site-dark px-5 pb-6 shadow-xl">
          <ul className="space-y-1 pt-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setOpen(false)} className="block rounded-control px-3 py-3 text-site-on-dark hover:bg-site-dark-3">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/book" onClick={() => setOpen(false)} className="mt-4 block rounded-control bg-site-gold px-5 py-3 text-center font-semibold text-site-dark">
            {bookLabel}
          </Link>
        </nav>
      )}
    </div>
  );
}
