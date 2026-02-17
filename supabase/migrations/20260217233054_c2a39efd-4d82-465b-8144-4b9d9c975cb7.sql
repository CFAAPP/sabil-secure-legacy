
-- Add encrypted creditor contact fields to debts table
ALTER TABLE public.debts
  ADD COLUMN creditor_email_encrypted TEXT,
  ADD COLUMN creditor_phone_encrypted TEXT;
