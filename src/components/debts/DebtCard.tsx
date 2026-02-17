import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Eye } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';

export interface DebtItem {
  id: string;
  debt_type: 'i_owe' | 'owed_to_me';
  name: string;
  amount: string;
  currency: string;
  due_date: string | null;
  status: 'pending' | 'paid';
  notes: string | null;
}

function getDisplayStatus(debt: DebtItem, t: ReturnType<typeof useTranslation>): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (debt.status === 'paid') return { label: t('statusPaid'), variant: 'secondary' };
  if (debt.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(debt.due_date);
    if (due < today) return { label: t('statusOverdue'), variant: 'destructive' };
  }
  return { label: t('statusPending'), variant: 'outline' };
}

interface DebtCardProps {
  debt: DebtItem;
  language: Language;
  onDetails: (debt: DebtItem) => void;
  onRemind: (debt: DebtItem) => void;
}

export default function DebtCard({ debt, language, onDetails, onRemind }: DebtCardProps) {
  const t = useTranslation(language);
  const { label, variant } = getDisplayStatus(debt, t);

  return (
    <Card className={debt.status === 'paid' ? 'opacity-60' : ''}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm truncate ${debt.status === 'paid' ? 'line-through' : ''}`}>
              {debt.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {debt.due_date || t('noDueDateLabel')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-sm">{debt.amount} {debt.currency}</p>
            <Badge variant={variant} className="text-xs mt-1">{label}</Badge>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onDetails(debt)}>
            <Eye className="mr-1 h-3 w-3" />{t('details')}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onRemind(debt)}>
            <Bell className="mr-1 h-3 w-3" />{t('remind')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
