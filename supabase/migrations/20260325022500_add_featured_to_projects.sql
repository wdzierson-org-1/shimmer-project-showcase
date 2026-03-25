ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
