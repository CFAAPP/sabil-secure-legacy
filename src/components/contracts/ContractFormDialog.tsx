import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation, type Language } from '@/lib/i18n';
import { Plus, Trash2, Paperclip, Image as ImageIcon, Video, Mic, Loader2, FileText, Download } from 'lucide-react';
import MentionsInput from '@/components/MentionsInput';
import { generateContractPdf } from '@/lib/contractPdf';

export type ContractType = 'commercial' | 'marriage' | 'engagement' | 'rental' | 'employment' | 'partnership' | 'loan' | 'other';

export interface Party { name: string; role: string }
export interface Witness { name: string; contact: string }

export type PenaltyDestination = 'none' | 'charity' | 'compensation';

const PENALTY_TAG = '@@PENALTY_DEST@@';

/** Encode la destination des pénalités dans le champ chiffré existant (pas de migration). */
export function encodePenalties(text: string, dest: PenaltyDestination, beneficiary: string) {
  const base = (text || '').trim();
  if (dest === 'none') return base;
  return `${base}\n${PENALTY_TAG}${dest}|${(beneficiary || '').replace(/[\n|]/g, ' ').trim()}`;
}

export function decodePenalties(raw: string): { text: string; dest: PenaltyDestination; beneficiary: string } {
  const value = raw || '';
  const idx = value.indexOf(PENALTY_TAG);
  if (idx === -1) return { text: value, dest: 'none', beneficiary: '' };
  const meta = value.slice(idx + PENALTY_TAG.length).split('\n')[0];
  const [dest, beneficiary = ''] = meta.split('|');
  return {
    text: value.slice(0, idx).trim(),
    dest: (dest === 'charity' || dest === 'compensation' ? dest : 'none') as PenaltyDestination,
    beneficiary,
  };
}

export interface ContractFormData {
  contract_type: ContractType;
  title: string;
  contract_date: string;
  parties: Party[];
  execution_delay: string;
  clauses: string;
  penalties: string;
  penalty_destination: PenaltyDestination;
  penalty_beneficiary: string;
  witnesses: Witness[];
  notes: string;
  mentions: string;
}


export interface Attachment {
  id: string;
  file_path: string;
  file_type: string;
  file_name: string;
  url?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  initial?: Partial<ContractFormData>;
  isEditing: boolean;
  saving: boolean;
  attachments: Attachment[];
  onSave: (data: ContractFormData, newFiles: File[]) => Promise<void>;
  onDelete?: () => Promise<void>;
  onDeleteAttachment?: (a: Attachment) => Promise<void>;
}

const TYPE_LABELS: Record<Language, Record<ContractType, string>> = {
  fr: {
    commercial: 'Contrat commercial',
    marriage: 'Contrat de mariage',
    engagement: 'Engagement',
    rental: 'Contrat de location',
    employment: 'Contrat de travail',
    partnership: 'Contrat de partenariat',
    loan: 'Contrat de prêt',
    other: 'Autre',
  },
  en: {
    commercial: 'Commercial contract',
    marriage: 'Marriage contract',
    engagement: 'Engagement',
    rental: 'Rental contract',
    employment: 'Employment contract',
    partnership: 'Partnership contract',
    loan: 'Loan contract',
    other: 'Other',
  },
  ar: {
    commercial: 'عقد تجاري',
    marriage: 'عقد زواج',
    engagement: 'تعهد',
    rental: 'عقد إيجار',
    employment: 'عقد عمل',
    partnership: 'عقد شراكة',
    loan: 'عقد قرض',
    other: 'أخرى',
  },
};

export default function ContractFormDialog({
  open, onOpenChange, language, initial, isEditing, saving,
  attachments, onSave, onDelete, onDeleteAttachment,
}: Props) {
  const t = useTranslation(language);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ContractFormData>({
    contract_type: 'commercial',
    title: '',
    contract_date: new Date().toISOString().slice(0, 10),
    parties: [{ name: '', role: '' }],
    execution_delay: '',
    clauses: '',
    penalties: '',
    penalty_destination: 'none',
    penalty_beneficiary: '',
    witnesses: [],
    notes: '',
    mentions: '',
  });
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open) {
      const decoded = decodePenalties(initial?.penalties || '');
      setForm({
        contract_type: (initial?.contract_type as ContractType) || 'commercial',
        title: initial?.title || '',
        contract_date: initial?.contract_date || new Date().toISOString().slice(0, 10),
        parties: initial?.parties?.length ? initial.parties : [{ name: '', role: '' }],
        execution_delay: initial?.execution_delay || '',
        clauses: initial?.clauses || '',
        penalties: decoded.text,
        penalty_destination: initial?.penalty_destination ?? decoded.dest,
        penalty_beneficiary: initial?.penalty_beneficiary ?? decoded.beneficiary,
        witnesses: initial?.witnesses || [],
        notes: initial?.notes || '',
        mentions: initial?.mentions || '',
      });
      setNewFiles([]);
    }
  }, [open, initial]);


  const L = {
    title: language === 'fr' ? 'Objet du contrat' : language === 'ar' ? 'موضوع العقد' : 'Contract subject',
    type: language === 'fr' ? 'Type de contrat' : language === 'ar' ? 'نوع العقد' : 'Contract type',
    date: language === 'fr' ? 'Date du jour' : language === 'ar' ? 'التاريخ' : 'Date',
    parties: language === 'fr' ? 'Qui est qui dans le contrat' : language === 'ar' ? 'الأطراف' : 'Who is who',
    partyName: language === 'fr' ? 'Nom' : language === 'ar' ? 'الاسم' : 'Name',
    partyRole: language === 'fr' ? 'Rôle' : language === 'ar' ? 'الدور' : 'Role',
    addParty: language === 'fr' ? 'Ajouter une partie' : language === 'ar' ? 'إضافة طرف' : 'Add party',
    delay: language === 'fr' ? "Délais d'exécution" : language === 'ar' ? 'مهلة التنفيذ' : 'Execution delay',
    clauses: language === 'fr' ? 'Clauses' : language === 'ar' ? 'البنود' : 'Clauses',
    penalties: language === 'fr' ? 'Pénalités éventuelles' : language === 'ar' ? 'الغرامات' : 'Potential penalties',
    witnesses: language === 'fr' ? 'Témoins' : language === 'ar' ? 'الشهود' : 'Witnesses',
    witnessContact: language === 'fr' ? 'Contact (email/tél.)' : language === 'ar' ? 'الاتصال' : 'Contact',
    addWitness: language === 'fr' ? 'Ajouter un témoin' : language === 'ar' ? 'إضافة شاهد' : 'Add witness',
    notes: language === 'fr' ? 'Notes' : language === 'ar' ? 'ملاحظات' : 'Notes',
    attachments: language === 'fr' ? 'Pièces jointes (photos, vidéos, audio)' : language === 'ar' ? 'المرفقات' : 'Attachments (photos, videos, audio)',
    addFiles: language === 'fr' ? 'Ajouter des fichiers' : language === 'ar' ? 'إضافة ملفات' : 'Add files',
    edit: language === 'fr' ? 'Modifier le contrat' : language === 'ar' ? 'تعديل العقد' : 'Edit contract',
    add: language === 'fr' ? 'Ajouter un contrat' : language === 'ar' ? 'إضافة عقد' : 'Add contract',
    deleteConfirm: language === 'fr' ? 'Supprimer ce contrat ?' : language === 'ar' ? 'حذف هذا العقد؟' : 'Delete this contract?',
    downloadPdf: language === 'fr' ? 'Télécharger le PDF' : language === 'ar' ? 'تنزيل PDF' : 'Download PDF',
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const hasPenalty = form.penalties.trim().length > 0;
    await onSave(
      {
        ...form,
        penalty_destination: hasPenalty ? form.penalty_destination : 'none',
        penalty_beneficiary: hasPenalty ? form.penalty_beneficiary : '',
        penalties: hasPenalty
          ? encodePenalties(form.penalties, form.penalty_destination, form.penalty_beneficiary)
          : '',
      },
      newFiles
    );
  };


  const fileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Mic className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? L.edit : L.add}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{L.type}</Label>
            <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v as ContractType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-[60]">
                {(Object.keys(TYPE_LABELS[language]) as ContractType[]).map((k) => (
                  <SelectItem key={k} value={k}>{TYPE_LABELS[language][k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{L.title} *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label>{L.date}</Label>
            <Input type="date" value={form.contract_date} onChange={(e) => setForm({ ...form, contract_date: e.target.value })} />
          </div>

          {/* Parties */}
          <div className="space-y-2">
            <Label>{L.parties}</Label>
            <div className="space-y-2">
              {form.parties.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input
                    placeholder={L.partyName}
                    value={p.name}
                    onChange={(e) => {
                      const arr = [...form.parties]; arr[i] = { ...arr[i], name: e.target.value };
                      setForm({ ...form, parties: arr });
                    }}
                  />
                  <Input
                    placeholder={L.partyRole}
                    value={p.role}
                    onChange={(e) => {
                      const arr = [...form.parties]; arr[i] = { ...arr[i], role: e.target.value };
                      setForm({ ...form, parties: arr });
                    }}
                  />
                  {form.parties.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, parties: form.parties.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, parties: [...form.parties, { name: '', role: '' }] })}>
                <Plus className="h-3.5 w-3.5 me-1" />{L.addParty}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{L.delay}</Label>
            <Input value={form.execution_delay} onChange={(e) => setForm({ ...form, execution_delay: e.target.value })} placeholder={language === 'fr' ? 'Ex: 30 jours' : language === 'ar' ? 'مثال: 30 يوم' : 'e.g. 30 days'} />
          </div>

          <div className="space-y-2">
            <Label>{L.clauses}</Label>
            <Textarea rows={4} value={form.clauses} onChange={(e) => setForm({ ...form, clauses: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>{L.penalties}</Label>
            <Textarea rows={3} value={form.penalties} onChange={(e) => setForm({ ...form, penalties: e.target.value })} />

            {form.penalties.trim().length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-[11.5px] leading-relaxed text-amber-300">
                  {language === 'fr'
                    ? "Une pénalité de retard perçue par le créancier s'apparente au ribâ (intérêt sur une dette). Pour rester conforme, elle doit être versée à une œuvre caritative, ou correspondre à un préjudice réel et documenté."
                    : language === 'ar'
                    ? 'غرامة التأخير التي يقبضها الدائن تشبه الربا. لتبقى موافقة للشرع، يجب أن تُصرف في وجوه الخير، أو أن تقابل ضرراً حقيقياً موثقاً.'
                    : 'A late-payment penalty collected by the creditor resembles riba (interest on a debt). To remain compliant, it must be paid to charity, or match a real, documented loss.'}
                </p>

                <Label className="text-xs">
                  {language === 'fr' ? 'Destination de la pénalité' : language === 'ar' ? 'وجهة الغرامة' : 'Penalty destination'}
                </Label>
                <Select
                  value={form.penalty_destination === 'none' ? 'charity' : form.penalty_destination}
                  onValueChange={(v) => setForm({ ...form, penalty_destination: v as PenaltyDestination })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover z-[60]">
                    <SelectItem value="charity">
                      {language === 'fr' ? 'Versée à une œuvre caritative (recommandé)' : language === 'ar' ? 'تُصرف لجهة خيرية (موصى به)' : 'Paid to a charity (recommended)'}
                    </SelectItem>
                    <SelectItem value="compensation">
                      {language === 'fr' ? 'Compensation d’un préjudice réel documenté' : language === 'ar' ? 'تعويض عن ضرر حقيقي موثق' : 'Compensation for a documented actual loss'}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  value={form.penalty_beneficiary}
                  onChange={(e) => setForm({ ...form, penalty_beneficiary: e.target.value })}
                  placeholder={
                    form.penalty_destination === 'compensation'
                      ? (language === 'fr' ? 'Nature du préjudice' : language === 'ar' ? 'طبيعة الضرر' : 'Nature of the loss')
                      : (language === 'fr' ? 'Nom de l’œuvre caritative' : language === 'ar' ? 'اسم الجهة الخيرية' : 'Charity name')
                  }
                />
              </div>
            )}
          </div>

          </div>

          {/* Witnesses */}
          <div className="space-y-2">
            <Label>{L.witnesses}</Label>
            <div className="space-y-2">
              {form.witnesses.map((w, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input
                    placeholder={L.partyName}
                    value={w.name}
                    onChange={(e) => {
                      const arr = [...form.witnesses]; arr[i] = { ...arr[i], name: e.target.value };
                      setForm({ ...form, witnesses: arr });
                    }}
                  />
                  <Input
                    placeholder={L.witnessContact}
                    value={w.contact}
                    onChange={(e) => {
                      const arr = [...form.witnesses]; arr[i] = { ...arr[i], contact: e.target.value };
                      setForm({ ...form, witnesses: arr });
                    }}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, witnesses: form.witnesses.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, witnesses: [...form.witnesses, { name: '', contact: '' }] })}>
                <Plus className="h-3.5 w-3.5 me-1" />{L.addWitness}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{L.notes}</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <MentionsInput
            value={form.mentions}
            onChange={(v) => setForm({ ...form, mentions: v })}
            language={language}
          />


          {/* Attachments */}
          <div className="space-y-2">
            <Label>{L.attachments}</Label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setNewFiles([...newFiles, ...Array.from(e.target.files)]);
                e.target.value = '';
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-3.5 w-3.5 me-1" />{L.addFiles}
            </Button>

            {(attachments.length > 0 || newFiles.length > 0) && (
              <div className="space-y-1 pt-2">
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded-md px-2 py-1.5">
                    {fileIcon(a.file_type)}
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline">{a.file_name}</a>
                    ) : (
                      <span className="flex-1 truncate">{a.file_name}</span>
                    )}
                    {onDeleteAttachment && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteAttachment(a)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {newFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-primary/5 rounded-md px-2 py-1.5">
                    {fileIcon(f.type)}
                    <span className="flex-1 truncate">{f.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {isEditing && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => { if (confirm(L.deleteConfirm)) onDelete(); }}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4 me-1" />{t('delete')}
            </Button>
          ) : <span />}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => generateContractPdf(form, language)}
              disabled={!form.title.trim()}
            >
              <Download className="h-4 w-4 me-1" />{L.downloadPdf}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { TYPE_LABELS };
