import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { AtSign } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { listContacts, type Contact } from '@/lib/contacts';

interface Props {
  value: string;
  onChange: (v: string) => void;
  language: Language;
}

export default function MentionsInput({ value, onChange, language }: Props) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [caret, setCaret] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const label = language === 'fr' ? 'Mentionner par @pseudonyme (optionnel)'
    : language === 'ar' ? 'الإشارة عبر @اسم مستعار (اختياري)'
    : 'Mention by @username (optional)';
  const hint = language === 'fr'
    ? 'Ces personnes recevront un mail et pourront accepter ou refuser d\'être associées. Astuce : tapez @ pour voir vos contacts.'
    : language === 'ar'
      ? 'سيتلقى هؤلاء بريدًا لقبول أو رفض الربط. نصيحة: اكتب @ لعرض جهات اتصالك.'
      : 'They will receive an email and can accept or refuse to be linked. Tip: type @ to see your contacts.';

  useEffect(() => {
    if (!user) return;
    listContacts(user.id).then(setContacts).catch(() => {});
  }, [user]);

  // Detect current @token before caret
  const { token, tokenStart } = useMemo(() => {
    const before = value.slice(0, caret);
    const m = before.match(/@([a-zA-Z0-9_.]*)$/);
    if (!m) return { token: null as string | null, tokenStart: -1 };
    return { token: m[1].toLowerCase(), tokenStart: caret - m[0].length };
  }, [value, caret]);

  const suggestions = useMemo(() => {
    if (token === null) return [];
    const already = new Set(
      value.split(/[\s,;]+/).map((s) => s.trim().replace(/^@+/, '').toLowerCase()).filter(Boolean),
    );
    return contacts
      .filter((c) => c.contact_username.startsWith(token) && !already.has(c.contact_username))
      .slice(0, 6);
  }, [contacts, token, value]);

  useEffect(() => {
    setOpen(suggestions.length > 0 && token !== null);
    setActiveIdx(0);
  }, [suggestions.length, token]);

  function applySuggestion(c: Contact) {
    if (tokenStart < 0) return;
    const before = value.slice(0, tokenStart);
    const after = value.slice(caret);
    const insertion = `@${c.contact_username}`;
    const needsSpace = after.length === 0 || !/^\s/.test(after);
    const nextVal = before + insertion + (needsSpace ? ' ' : '') + after;
    onChange(nextVal);
    const nextCaret = (before + insertion + (needsSpace ? ' ' : '')).length;
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(nextCaret, nextCaret);
        setCaret(nextCaret);
      }
    });
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applySuggestion(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-gold/20 bg-gold/5 p-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gold uppercase tracking-wider">
        <AtSign className="h-3.5 w-3.5" />{label}
      </label>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => { onChange(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); }}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => setCaret((e.target as HTMLInputElement).selectionStart ?? 0)}
          onClick={(e) => setCaret((e.target as HTMLInputElement).selectionStart ?? 0)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="@alice @bob"
          className="bg-background/60"
        />
        {open && (
          <ul
            role="listbox"
            className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-gold/30 bg-popover shadow-lg"
          >
            {suggestions.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); applySuggestion(c); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`cursor-pointer px-3 py-2 text-sm flex items-center gap-2 ${
                  i === activeIdx ? 'bg-gold/15 text-gold' : 'hover:bg-muted/60'
                }`}
              >
                <AtSign className="h-3.5 w-3.5 opacity-60" />
                <span className="font-medium">{c.contact_username}</span>
                {c.label && <span className="text-xs text-muted-foreground truncate">— {c.label}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
    </div>
  );
}
