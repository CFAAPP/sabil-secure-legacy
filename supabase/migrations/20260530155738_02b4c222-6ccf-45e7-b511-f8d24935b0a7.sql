
-- Contracts table (zero-knowledge encrypted)
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contract_type TEXT NOT NULL,
  iv TEXT NOT NULL,
  title_encrypted TEXT NOT NULL,
  contract_date_encrypted TEXT,
  parties_encrypted TEXT,
  execution_delay_encrypted TEXT,
  clauses_encrypted TEXT,
  penalties_encrypted TEXT,
  witnesses_encrypted TEXT,
  notes_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contracts" ON public.contracts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contracts" ON public.contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contracts" ON public.contracts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contracts" ON public.contracts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Attachments table
CREATE TABLE public.contract_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.contract_attachments TO authenticated;
GRANT ALL ON public.contract_attachments TO service_role;

ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contract attachments" ON public.contract_attachments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contract attachments" ON public.contract_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contract attachments" ON public.contract_attachments
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for contract media (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('contract-attachments', 'contract-attachments', false);

CREATE POLICY "Users can view own contract files" ON storage.objects
  FOR SELECT USING (bucket_id = 'contract-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own contract files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'contract-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own contract files" ON storage.objects
  FOR DELETE USING (bucket_id = 'contract-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
