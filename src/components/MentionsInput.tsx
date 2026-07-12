import { Input } from '@/components/ui/input';
import { AtSign } from 'lucide-react';
import type { Language } from '@/lib/i18n';

interface Props {
  value: string;
  onChange: (v: string) => void;
  language: Language;
}

export default function MentionsInput({ value, onChange, language }: Props) {
  const label = language === 'fr' ? 'Mentionner par @pseudonyme (optionnel)'
    : language === 'ar' ? 'الإشارة عبر @اسم مستعار (اختياري)'
    : 'Mention by @username (optional)';
  const hint = language === 'fr'
    ? 'Ces personnes recevront un mail et pourront accepter ou refuser d\'être associées.'
    : language === 'ar'
      ? 'سيتلقى هؤلاء بريدًا لقبول أو رفض الربط.'
      : 'They will receive an email and can accept or refuse to be linked.';
  return (
    <div className="space-y-1.5 rounded-lg border border-gold/20 bg-gold/5 p-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gold uppercase tracking-wider">
        <AtSign className="h-3.5 w-3.5" />{label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="@alice @bob"
        className="bg-background/60"
      />
      <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
    </div>
  );
}
