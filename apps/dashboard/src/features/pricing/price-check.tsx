import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PricingRuleDto } from '@eul/api-client';
import { formatMoney } from '@/shared/lib/format';
import { Card } from '@/shared/ui/card';
import { inputClass } from '@/shared/ui/form';
import { usePricePreview } from './api';

/** "What would this trip cost?" — the API calculates; nothing is priced in the browser. */
export function PriceCheck({ rules }: { rules: PricingRuleDto[] }) {
  const { t } = useTranslation();
  const [ruleId, setRuleId] = useState(rules[0]?.id ?? '');
  const [km, setKm] = useState('25');
  const [minutes, setMinutes] = useState('30');

  const distanceMeters = Math.round(Number(km) * 1000);
  const durationSeconds = Math.round(Number(minutes) * 60);
  const valid = !!ruleId && Number.isFinite(distanceMeters) && distanceMeters >= 0 && Number.isFinite(durationSeconds) && durationSeconds >= 0;
  const preview = usePricePreview(ruleId, distanceMeters, durationSeconds, valid);
  const p = preview.data;

  return (
    <Card title={t('pricing.check')}>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-text-muted">{t('pricing.class')}</span>
          <select className={inputClass} value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
            {rules.map((r) => (
              <option key={r.id} value={r.id}>{r.categoryName} ({r.currency})</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-text-muted">{t('pricing.distanceKm')}</span>
          <input className={inputClass} inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-text-muted">{t('pricing.minutes')}</span>
          <input className={inputClass} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      </div>

      {p && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4" aria-live="polite">
          <dt className="text-text-muted">{t('pricing.baseFare')}</dt>
          <dd className="tabular-nums">{formatMoney(p.baseFareMinor, p.currency)}</dd>
          <dt className="text-text-muted">{t('pricing.distancePart')}</dt>
          <dd className="tabular-nums">{formatMoney(p.distanceMinor, p.currency)}</dd>
          <dt className="text-text-muted">{t('pricing.timePart')}</dt>
          <dd className="tabular-nums">{formatMoney(p.timeMinor, p.currency)}</dd>
          <dt className="text-text-muted">{t('pricing.minimumFare')}</dt>
          <dd className="tabular-nums">{formatMoney(p.minimumFareMinor, p.currency)}</dd>
          <dt className="font-semibold">{t('pricing.total')}</dt>
          <dd className="font-semibold tabular-nums">
            {formatMoney(p.totalMinor, p.currency)}
            {p.minimumApplied && <span className="ml-2 text-xs font-normal text-text-muted">({t('pricing.minimumApplied')})</span>}
          </dd>
        </dl>
      )}
    </Card>
  );
}
