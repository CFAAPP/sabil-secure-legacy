
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS witness1_name_encrypted text,
  ADD COLUMN IF NOT EXISTS witness1_email_encrypted text,
  ADD COLUMN IF NOT EXISTS witness1_phone_encrypted text,
  ADD COLUMN IF NOT EXISTS witness2_name_encrypted text,
  ADD COLUMN IF NOT EXISTS witness2_email_encrypted text,
  ADD COLUMN IF NOT EXISTS witness2_phone_encrypted text;
