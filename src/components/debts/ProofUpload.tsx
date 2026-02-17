import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Video, Mic, X, Loader2, FileImage } from 'lucide-react';
import type { Language } from '@/lib/i18n';

interface ProofFile {
  id?: string;
  file_path: string;
  file_type: string;
  file_name: string;
  url?: string;
}

interface ProofUploadProps {
  debtId: string | null;
  userId: string;
  language: Language;
  proofs: ProofFile[];
  onProofsChange: (proofs: ProofFile[]) => void;
}

export default function ProofUpload({ debtId, userId, language, proofs, onProofsChange }: ProofUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const labels = {
    title: language === 'fr' ? '📎 Preuves de paiement' : '📎 Payment proofs',
    addImage: language === 'fr' ? 'Image' : 'Image',
    addVideo: language === 'fr' ? 'Vidéo' : 'Video',
    addAudio: language === 'fr' ? 'Audio' : 'Audio',
    uploading: language === 'fr' ? 'Envoi...' : 'Uploading...',
    noDebt: language === 'fr' ? 'Sauvegardez la dette d\'abord pour ajouter des preuves.' : 'Save the debt first to add proofs.',
  };

  const handleUpload = async (accept: string, fileType: string) => {
    if (!debtId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.capture = fileType === 'image' ? 'environment' : '';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const ext = file.name.split('.').pop();
        const path = `${userId}/${debtId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('debt-proofs')
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from('debt_proofs').insert({
          debt_id: debtId,
          user_id: userId,
          file_path: path,
          file_type: fileType,
          file_name: file.name,
        } as any);
        if (dbError) throw dbError;

        onProofsChange([...proofs, { file_path: path, file_type: fileType, file_name: file.name }]);
      } catch (err) {
        console.error('Upload error:', err);
      }
      setUploading(false);
    };
    input.click();
  };

  const handleDelete = async (proof: ProofFile) => {
    await supabase.storage.from('debt-proofs').remove([proof.file_path]);
    if (proof.id) {
      await supabase.from('debt_proofs').delete().eq('id', proof.id);
    }
    onProofsChange(proofs.filter(p => p.file_path !== proof.file_path));
  };

  if (!debtId) {
    return (
      <div className="rounded-lg border border-dashed p-3">
        <p className="text-xs text-muted-foreground text-center">{labels.noDebt}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">{labels.title}</p>

      {/* Existing proofs */}
      {proofs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {proofs.map((proof, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
              {proof.file_type === 'image' && <FileImage className="h-3 w-3" />}
              {proof.file_type === 'video' && <Video className="h-3 w-3" />}
              {proof.file_type === 'audio' && <Mic className="h-3 w-3" />}
              <span className="max-w-[120px] truncate">{proof.file_name}</span>
              <button onClick={() => handleDelete(proof)} className="ml-1 text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      <div className="flex gap-2">
        {uploading ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> {labels.uploading}
          </div>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => handleUpload('image/*', 'image')}>
              <Camera className="mr-1 h-3 w-3" /> {labels.addImage}
            </Button>
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => handleUpload('video/*', 'video')}>
              <Video className="mr-1 h-3 w-3" /> {labels.addVideo}
            </Button>
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => handleUpload('audio/*', 'audio')}>
              <Mic className="mr-1 h-3 w-3" /> {labels.addAudio}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
