import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PricingRuleDto } from '@eul/api-client';
import { useCan } from '@/features/auth/can';
import { formatMoney } from '@/shared/lib/format';
import { Card } from '@/shared/ui/card';
import { YesNo } from '@/shared/ui/form';
import { PageTitle } from '@/shared/ui/page-title';
import { EmptyState, ErrorState, SkeletonRows } from '@/shared/ui/states';
import { usePricingRules } from './api';
import { PriceCheck } from './price-check';
import { PricingRuleDialog } from './pricing-rule-dialog';

export function PricingPage() {
  const { t } = useTranslation();
  const canWrite = useCan('pricing.write');
  const rules = usePricingRules();
  const [editing, setEditing] = useState<PricingRuleDto | null>(null);

  return (
    <section className="space-y-5">
      <div>
        <PageTitle>{t('pricing.title')}</PageTitle>
        <p className="mt-1 text-sm text-text-muted">{t('pricing.subtitle')}</p>
      </div>

      <Card>
        {rules.isPending ? (
          <SkeletonRows rows={5} />
        ) : rules.isError ? (
          <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />
        ) : rules.data.length === 0 ? (
          <EmptyState message={t('pricing.empty')} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-medium">{t('pricing.class')}</th>
                <th className="py-2 pr-4 text-right font-medium">{t('pricing.baseFare')}</th>
                <th className="py-2 pr-4 text-right font-medium">{t('pricing.perKm')}</th>
                <th className="py-2 pr-4 text-right font-medium">{t('pricing.perMinute')}</th>
                <th className="py-2 pr-4 text-right font-medium">{t('pricing.minimumFare')}</th>
                <th className="py-2 pr-4 font-medium">{t('pricing.status')}</th>
                {canWrite && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {rules.data.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{r.categoryName}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(r.baseFareMinor, r.currency)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(r.perKmMinor, r.currency)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(r.perMinuteMinor, r.currency)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatMoney(r.minimumFareMinor, r.currency)}</td>
                  <td className="space-x-1 py-2.5 pr-4 whitespace-nowrap">
                    <YesNo value={r.isActive} yes={t('common.active')} no={t('common.inactive')} />
                    <YesNo value={r.isConfirmed} yes={t('common.confirmed')} no={t('common.unconfirmed')} />
                  </td>
                  {canWrite && (
                    <td className="py-2.5 text-right">
                      <button type="button" onClick={() => setEditing(r)} className="text-sm underline-offset-2 hover:underline">
                        {t('common.edit')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {rules.data && rules.data.length > 0 && <PriceCheck rules={rules.data} />}
      <PricingRuleDialog rule={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
