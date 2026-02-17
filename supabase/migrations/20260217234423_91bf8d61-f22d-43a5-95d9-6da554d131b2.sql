
-- Fix share_token default encoding (base64url not supported, use base64 instead)
ALTER TABLE public.debt_share_links
  ALTER COLUMN share_token SET DEFAULT encode(extensions.gen_random_bytes(24), 'base64');

-- Fix approval_token default encoding
ALTER TABLE public.debt_modification_requests
  ALTER COLUMN approval_token SET DEFAULT encode(extensions.gen_random_bytes(24), 'base64');
