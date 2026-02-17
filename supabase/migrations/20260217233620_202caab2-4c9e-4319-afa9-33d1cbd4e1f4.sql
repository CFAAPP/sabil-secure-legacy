
-- Create storage bucket for debt proof files (screenshots, videos, audio)
INSERT INTO storage.buckets (id, name, public) VALUES ('debt-proofs', 'debt-proofs', false);

-- RLS: Users can upload their own proofs (folder = user_id)
CREATE POLICY "Users can upload own proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'debt-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can view their own proofs
CREATE POLICY "Users can view own proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'debt-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can delete their own proofs
CREATE POLICY "Users can delete own proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'debt-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Table to track proof attachments per debt
CREATE TABLE public.debt_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio'
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debt proofs"
ON public.debt_proofs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debt proofs"
ON public.debt_proofs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own debt proofs"
ON public.debt_proofs FOR DELETE
USING (auth.uid() = user_id);
