ALTER TABLE public.project_images
  ADD COLUMN IF NOT EXISTS caption TEXT;
