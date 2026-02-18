import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Eye, Share2, TrendingDown, TrendingUp, Clock } from 'lucide-react';
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
  creditor_email: string | null;
  creditor_phone: string | null;
  paid_at: string | null;
}

function getDueDateProgress(dueDate: string | null): { pct: number; daysLeft: number; overdue: boolean } | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const total = due.getTime() - now.getTime();
  const daysLeft = Math.ceil(total / (1000 * 60 * 60 * 24));
  // Assume 90-day horizon for progress bar
  const horizon = 90;
  const pct = Math.max(0, Math.min(100, ((horizon - daysLeft) / horizon) * 100));
  return { pct, daysLeft, overdue: daysLeft < 0 };
}

interface DebtCardProps {
  debt: DebtItem;
  language: Language;
  onDetails: (debt: DebtItem) => void;
  onRemind: (debt: DebtItem) => void;
  onShare: (debt: DebtItem) => void;
}

export default function DebtCard({ debt, language, onDetails, onRemind, onShare }: DebtCardProps) {
  const t = useTranslation(language);
  const isPaid = debt.status === 'paid';
  const progress = !isPaid ? getDueDateProgress(debt.due_date) : null;

  const statusColor = isPaid
    ? 'text-emerald-400'
    : progress?.overdue
    ? 'text-red-400'
    : 'text-gold';

  const statusLabel = isPaid
    ? (language === 'fr' ? 'Payée' : 'Paid')
    : progress?.overdue
    ? (language === 'fr' ? 'En retard' : 'Overdue')
    : (language === 'fr' ? 'En cours' : 'Pending');

  const paidDateLabel = debt.paid_at
    ? new Date(debt.paid_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  const barColor = isPaid
    ? 'bg-emerald-500'
    : progress?.overdue
    ? 'bg-red-500'
    : progress && progress.daysLeft < 14
    ? 'bg-amber-400'
    : 'bg-gold';

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:border-primary/40 hover:shadow-md bg-card shadow-sm ${
        isPaid ? 'border-border/50 opacity-60' : 'border-border'
      }`}
    >
      {/* Top glow line */}
      {!isPaid && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      )}

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${
              debt.debt_type === 'i_owe' ? 'bg-red-500/10' : 'bg-emerald-500/10'
            }`}>
              {debt.debt_type === 'i_owe'
                ? <TrendingDown className="h-4 w-4 text-red-400" />
                : <TrendingUp className="h-4 w-4 text-emerald-400" />
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold text-sm truncate ${isPaid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {debt.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPaid && paidDateLabel
                  ? (language === 'fr' ? `Payée le ${paidDateLabel}` : `Paid ${paidDateLabel}`)
                  : debt.due_date
                  ? (language === 'fr' ? `Échéance ${debt.due_date}` : `Due ${debt.due_date}`)
                  : t('noDueDateLabel')}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-base text-foreground">
              {parseFloat(debt.amount).toLocaleString()} <span className="text-xs text-muted-foreground">{debt.currency}</span>
            </p>
            <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>

        {/* Timeline progress bar */}
        {!isPaid && debt.due_date && progress && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {progress.overdue
                  ? (language === 'fr' ? `${Math.abs(progress.daysLeft)}j de retard` : `${Math.abs(progress.daysLeft)}d overdue`)
                  : (language === 'fr' ? `${progress.daysLeft}j restants` : `${progress.daysLeft}d left`)
                }
              </span>
              <span>{Math.round(progress.pct)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-gold/30 hover:text-gold transition-all"
            onClick={() => onDetails(debt)}
          >
            <Eye className="mr-1.5 h-3 w-3" />{t('details')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-gold/30 hover:text-gold transition-all"
            onClick={() => onRemind(debt)}
          >
            <Bell className="mr-1.5 h-3 w-3" />{t('remind')}
          </Button>
          {debt.debt_type === 'owed_to_me' && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-gold/30 hover:text-gold transition-all"
              onClick={() => onShare(debt)}
            >
              <Share2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
