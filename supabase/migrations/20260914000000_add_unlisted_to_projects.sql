-- Unlisted projects stay publicly readable by direct link but are left out of
-- listings, featured grids, the Ask AI retrieval, and vector search results.
-- This is distinct from `visible = false`, which row-level security hides entirely.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS unlisted boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.match_projects_by_query(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  content text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.project_id,
    pe.content,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM public.project_embeddings pe
  JOIN public.projects p ON p.id = pe.project_id
  WHERE 1 - (pe.embedding <=> query_embedding) > match_threshold
    -- Include all projects for admins, only visible projects for others
    AND (p.visible = true OR has_role(auth.uid(), 'admin'::app_role))
    -- Unlisted projects are shared by direct link only
    AND p.unlisted = false
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
