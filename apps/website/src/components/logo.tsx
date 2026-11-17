import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { COMPANY, LOGO } from '@/config/site';

/** Brand mark. Temporary image until the final logo (D-11) — swap LOGO in config/site.ts. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" aria-label={COMPANY.name} className={`inline-flex shrink-0 items-center ${className}`}>
      <Image src={LOGO.src} alt={COMPANY.name} width={LOGO.width} height={LOGO.height} priority className="h-11 w-auto" />
    </Link>
  );
}
