-- Fix remaining security issues from the linter

-- Fix function search path issues for match functions
CREATE OR REPLACE FUNCTION public.match_content_by_query(query_embedding vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, content_id uuid, content text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
    AND c.visible = true
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_projects_by_query(query_embedding vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5)
RETURNS TABLE(id uuid, project_id uuid, content text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.project_id,
    pe.content,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM public.project_embeddings pe
  WHERE 1 - (pe.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$function$;