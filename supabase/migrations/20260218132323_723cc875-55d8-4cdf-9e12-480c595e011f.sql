
-- Create testament-audio storage bucket (private, encrypted files only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'testament-audio',
  'testament-audio',
  false,
  52428800, -- 50MB limit
  ARRAY['application/json', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for testament-audio bucket
CREATE POLICY "Users can upload own testament audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'testament-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own testament audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'testament-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own testament audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'testament-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
