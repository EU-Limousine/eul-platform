import { MapPinned } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';

/**
 * Placeholder: live chauffeur positions need the driver app (on-duty location, CLAUDE.md §4.8).
 * Arrives in phase 1E. Shows nothing fake meanwhile.
 */
export function LiveMapCard() {
  const { t } = useTranslation();
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg">{t('overview.liveMap.title')}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid h-full min-h-48 place-items-center rounded-lg border border-dashed bg-muted/50 p-6 text-center">
          <div>
            <MapPinned className="mx-auto text-muted-foreground" size={32} aria-hidden />
            <p className="mt-3 text-sm font-medium">{t('overview.liveMap.soon')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('overview.liveMap.hint')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
