ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sort_order integer;

CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON public.projects (sort_order ASC NULLS LAST);
