CREATE TABLE public.debt_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_encrypted TEXT NOT NULL,
  paid_at_encrypted TEXT NOT NULL,
  notes_encrypted TEXT,
  iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX debt_payments_debt_id_idx ON public.debt_payments(debt_id);
CREATE INDEX debt_payments_user_id_idx ON public.debt_payments(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_payments TO authenticated;
GRANT ALL ON public.debt_payments TO service_role;

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debt payments"
  ON public.debt_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debt payments"
  ON public.debt_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debt payments"
  ON public.debt_payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debt payments"
  ON public.debt_payments FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_debt_payments_updated_at
  BEFORE UPDATE ON public.debt_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();