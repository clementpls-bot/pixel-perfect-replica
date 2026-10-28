-- Ensure the public can editor photo fields exist even when earlier migrations were skipped.
alter table public.cans
  add column if not exists back_image_url text,
  add column if not exists barcode_image_url text;

-- Refresh PostgREST's schema cache so the editor can save the new fields immediately.
notify pgrst, 'reload schema';
