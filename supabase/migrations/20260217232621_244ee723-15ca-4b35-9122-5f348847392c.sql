
-- Table for sharing debt links with debtors
CREATE TABLE public.debt_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  -- Unencrypted copy for debtor view
  debtor_visible_name TEXT NOT NULL,
  debtor_visible_amount TEXT NOT NULL,
  debtor_visible_currency TEXT NOT NULL DEFAULT 'EUR',
  debtor_visible_due_date TEXT,
  creditor_email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_share_links ENABLE ROW LEVEL SECURITY;

-- Only the owner can manage share links
CREATE POLICY "Users can manage own share links"
  ON public.debt_share_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read for share_token lookup (debtors need this)
CREATE POLICY "Anyone can read by share_token"
  ON public.debt_share_links FOR SELECT
  USING (true);

-- Table for modification requests from debtors
CREATE TABLE public.debt_modification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL REFERENCES public.debt_share_links(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  approval_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  -- Proposed changes (nullable = no change proposed)
  proposed_amount TEXT,
  proposed_currency TEXT,
  proposed_due_date TEXT,
  proposed_status TEXT,
  proposed_notes TEXT,
  debtor_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.debt_modification_requests ENABLE ROW LEVEL SECURITY;

-- Owner can view requests for their debts
CREATE POLICY "Users can view own debt requests"
  ON public.debt_modification_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.debt_share_links sl
      WHERE sl.id = share_link_id AND sl.user_id = auth.uid()
    )
  );

-- Public insert for debtors submitting requests (no auth needed)
CREATE POLICY "Anyone can insert modification requests"
  ON public.debt_modification_requests FOR INSERT
  WITH CHECK (true);

-- Public read by approval_token (for email validation)
CREATE POLICY "Anyone can read by approval_token"
  ON public.debt_modification_requests FOR SELECT
  USING (true);
