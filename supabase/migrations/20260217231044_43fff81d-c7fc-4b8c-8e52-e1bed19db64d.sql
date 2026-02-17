
-- Add new columns to debts table for currency, due_date, notes
ALTER TABLE public.debts 
ADD COLUMN currency_encrypted text,
ADD COLUMN due_date_encrypted text,
ADD COLUMN notes_encrypted text,
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Remove old is_settled column (migrating to status field)
-- We keep is_settled for backward compat, will handle in code
