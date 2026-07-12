
-- 1) Username on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_.]{3,30}$');

-- 2) Lookup function (SECURITY DEFINER, only returns user_id — never email)
CREATE OR REPLACE FUNCTION public.lookup_user_by_username(_username TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE lower(username) = lower(_username) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_username(TEXT) TO authenticated;

-- 3) Mentions table
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('contract','debt')),
  source_id UUID NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','refused')),
  response_token UUID NOT NULL DEFAULT gen_random_uuid(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (source_type, source_id, mentioned_user_id)
);
CREATE INDEX IF NOT EXISTS mentions_owner_idx ON public.mentions(owner_user_id);
CREATE INDEX IF NOT EXISTS mentions_mentioned_idx ON public.mentions(mentioned_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS mentions_response_token_idx ON public.mentions(response_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentions TO authenticated;
GRANT ALL ON public.mentions TO service_role;

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own mentions"
ON public.mentions FOR ALL
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Mentioned user can view accepted mentions"
ON public.mentions FOR SELECT
USING (auth.uid() = mentioned_user_id AND status = 'accepted');

CREATE TRIGGER update_mentions_updated_at
BEFORE UPDATE ON public.mentions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
