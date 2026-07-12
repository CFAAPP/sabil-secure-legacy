ALTER TABLE public.vault_items DROP CONSTRAINT IF EXISTS vault_items_item_type_check;
ALTER TABLE public.vault_items ADD CONSTRAINT vault_items_item_type_check
  CHECK (item_type = ANY (ARRAY['testament'::text, 'document'::text, 'note'::text, 'family_profile'::text]));