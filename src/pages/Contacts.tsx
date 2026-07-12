import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/i18n';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AtSign, Trash2, UserPlus, Users } from 'lucide-react';
import { addContactByUsername, deleteContact, listContacts, updateContactLabel, type Contact } from '@/lib/contacts';

export default function Contacts() {
  const { user, language } = useAuth();
  const t = useTranslation(language);
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const L = {
    title: language === 'fr' ? 'Mes Contacts' : language === 'ar' ? 'جهات الاتصال' : 'My Contacts',
    subtitle: language === 'fr'
      ? 'Ajoutez des contacts par leur @pseudonyme pour les mentionner rapidement dans vos contrats et dettes.'
      : language === 'ar'
        ? 'أضف جهات اتصال عبر @اسم المستخدم للإشارة إليهم بسرعة في العقود والديون.'
        : 'Add contacts by their @username to quickly mention them in contracts and debts.',
    add: language === 'fr' ? 'Ajouter' : language === 'ar' ? 'إضافة' : 'Add',
    placeholder: '@alice',
    labelPh: language === 'fr' ? 'Étiquette (optionnel)' : language === 'ar' ? 'تسمية (اختياري)' : 'Label (optional)',
    empty: language === 'fr' ? 'Aucun contact pour le moment.' : language === 'ar' ? 'لا توجد جهات اتصال بعد.' : 'No contacts yet.',
    remove: language === 'fr' ? 'Supprimer' : language === 'ar' ? 'حذف' : 'Remove',
    notFound: language === 'fr' ? 'Ce pseudonyme est introuvable.' : language === 'ar' ? 'اسم المستخدم غير موجود.' : 'Username not found.',
    invalid: language === 'fr' ? 'Pseudonyme invalide.' : language === 'ar' ? 'اسم مستخدم غير صالح.' : 'Invalid username.',
    exists: language === 'fr' ? 'Ce contact existe déjà.' : language === 'ar' ? 'جهة الاتصال موجودة بالفعل.' : 'Contact already exists.',
    self: language === 'fr' ? 'Vous ne pouvez pas vous ajouter vous-même.' : language === 'ar' ? 'لا يمكنك إضافة نفسك.' : 'You cannot add yourself.',
    added: language === 'fr' ? 'Contact ajouté.' : language === 'ar' ? 'تمت الإضافة.' : 'Contact added.',
  };

  useEffect(() => {
    if (!user) return;
    listContacts(user.id).then((rows) => { setItems(rows); setLoading(false); });
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !username.trim()) return;
    setAdding(true);
    const res = await addContactByUsername(user.id, username, label);
    setAdding(false);
    if (res.ok === true) {
      setItems((prev) => [...prev, res.contact].sort((a, b) => a.contact_username.localeCompare(b.contact_username)));
      setUsername(''); setLabel('');
      toast.success(L.added);
      return;
    }
    const map: Record<string, string> = { invalid: L.invalid, not_found: L.notFound, self: L.self, exists: L.exists, error: 'Error' };
    toast.error(map[res.reason] ?? 'Error');
  }

  async function handleDelete(c: Contact) {
    await deleteContact(c.id);
    setItems((prev) => prev.filter((x) => x.id !== c.id));
  }

  async function handleLabelChange(c: Contact, next: string) {
    setItems((prev) => prev.map((x) => x.id === c.id ? { ...x, label: next } : x));
    await updateContactLabel(c.id, next);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gold-gradient uppercase tracking-wider flex items-center gap-2">
            <Users className="h-6 w-6" /> {L.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{L.subtitle}</p>
        </div>

        <form onSubmit={handleAdd} className="rounded-xl border border-gold/20 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AtSign className="h-4 w-4 text-gold" />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={L.placeholder}
              className="bg-background/60"
              required
            />
          </div>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={L.labelPh}
            className="bg-background/60"
            maxLength={60}
          />
          <Button type="submit" disabled={adding} className="w-full gap-2">
            <UserPlus className="h-4 w-4" /> {L.add}
          </Button>
        </form>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{L.empty}</p>
          ) : (
            items.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">@{c.contact_username}</p>
                  <Input
                    value={c.label ?? ''}
                    onChange={(e) => handleLabelChange(c, e.target.value)}
                    placeholder={L.labelPh}
                    className="mt-1 h-7 text-xs bg-background/60"
                    maxLength={60}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(c)}
                  aria-label={L.remove}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
