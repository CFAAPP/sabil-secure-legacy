
-- 1. Remove overly permissive SELECT policies (data now fetched via edge functions using service role)
DROP POLICY IF EXISTS "Anyone can read by share_token" ON public.debt_share_links;
DROP POLICY IF EXISTS "Anyone can read by approval_token" ON public.debt_modification_requests;

-- 2. Restrict INSERT on debt_modification_requests to require a valid active share link
DROP POLICY IF EXISTS "Anyone can insert modification requests" ON public.debt_modification_requests;
CREATE POLICY "Insert modification requests via active share link"
ON public.debt_modification_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.debt_share_links sl
    WHERE sl.id = share_link_id
      AND sl.debt_id = debt_modification_requests.debt_id
      AND sl.is_active = true
  )
);

-- 3. Prevent users from tampering with PIN brute-force protection fields
CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only service_role may change pin_attempts / pin_locked_until
  IF current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.pin_attempts := OLD.pin_attempts;
    NEW.pin_locked_until := OLD.pin_locked_until;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_security_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_security_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_security_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_security_fields();

-- 4. Lock down SECURITY DEFINER functions so only the system/triggers can call them
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
