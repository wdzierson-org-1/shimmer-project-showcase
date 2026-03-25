ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
