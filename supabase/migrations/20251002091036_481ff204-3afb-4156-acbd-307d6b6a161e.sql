-- Update match_content_by_query to include unpublished content for admins
CREATE OR REPLACE FUNCTION public.match_content_by_query(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  content_id uuid,
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
    ce.id,
    ce.content_id,
    ce.content,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM public.content_embeddings ce
  JOIN public.content_entries c ON c.id = ce.content_id
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
    -- Include all content for admins, only visible content for others
    AND (c.visible = true OR has_role(auth.uid(), 'admin'::app_role))
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Also update match_projects_by_query for consistency
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
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;