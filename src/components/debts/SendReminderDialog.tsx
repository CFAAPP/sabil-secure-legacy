import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Share2, Copy, Check } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';
import type { DebtItem } from './DebtCard';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  debt: DebtItem | null;
}

export default function SendReminderDialog({ open, onOpenChange, language, debt }: Props) {
  const t = useTranslation(language);
  const { toast } = useToast();
  const [msgChoice, setMsgChoice] = useState('1');
  const [customMsg, setCustomMsg] = useState('');
  const [recipient, setRecipient] = useState('');
  const [copied, setCopied] = useState(false);

  if (!debt) return null;

  const msg1 = t('reminderMsg1').replace('{name}', debt.name).replace('{amount}', debt.amount).replace('{currency}', debt.currency);
  const msg2 = t('reminderMsg2').replace('{name}', debt.name).replace('{amount}', debt.amount).replace('{currency}', debt.currency).replace('{date}', debt.due_date || '-');

  const getMessage = () => {
    if (msgChoice === '1') return msg1;
    if (msgChoice === '2') return msg2;
    return customMsg;
  };

  const handleShare = async () => {
    const text = getMessage();
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch { /* user cancelled */ }
    } else {
      await handleCopy();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getMessage());
    setCopied(true);
    toast({ title: t('messageCopied') });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{t('sendReminder')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('reminderMessage')}</Label>
            <RadioGroup value={msgChoice} onValueChange={setMsgChoice}>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="1" id="msg1" className="mt-1" />
                <Label htmlFor="msg1" className="font-normal text-sm leading-relaxed">{msg1}</Label>
              </div>
              {debt.due_date && (
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="2" id="msg2" className="mt-1" />
                  <Label htmlFor="msg2" className="font-normal text-sm leading-relaxed">{msg2}</Label>
                </div>
              )}
              <div className="flex items-start gap-2">
                <RadioGroupItem value="custom" id="msg-custom" className="mt-1" />
                <Label htmlFor="msg-custom" className="font-normal text-sm">{t('reminderCustomMsg')}</Label>
              </div>
            </RadioGroup>
            {msgChoice === 'custom' && (
              <Textarea value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} rows={3} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t('reminderRecipient')}</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={t('reminderRecipientPlaceholder')} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleShare} className="flex-1">
              <Share2 className="mr-2 h-4 w-4" />{t('shareVia')}
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
