-- CRITICAL SECURITY FIXES: Enable RLS and create proper access policies

-- 1. Enable RLS on all public tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;

-- 2. Create user roles enum and table for proper authentication
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- 5. PROJECTS table policies - public read for visible projects, admin write
CREATE POLICY "Anyone can view visible projects"
ON public.projects
FOR SELECT
USING (visible = true);

CREATE POLICY "Admins can manage all projects"
ON public.projects
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. PROJECT_IMAGES table policies - public read, admin write
CREATE POLICY "Anyone can view project images"
ON public.project_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_images.project_id 
    AND projects.visible = true
  )
);

CREATE POLICY "Admins can manage project images"
ON public.project_images
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 7. PROJECT_TAGS table policies - public read, admin write
CREATE POLICY "Anyone can view project tags"
ON public.project_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_tags.project_id 
    AND projects.visible = true
  )
);

CREATE POLICY "Admins can manage project tags"
ON public.project_tags
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 8. TAGS table policies - public read, admin write
CREATE POLICY "Anyone can view tags"
ON public.tags
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tags"
ON public.tags
FOR INSERT, UPDATE, DELETE
TO authenticated
WITH CHECK (public.is_admin());

-- 9. CONTENT_ENTRIES table policies - public read for visible content, admin write
CREATE POLICY "Anyone can view visible content"
ON public.content_entries
FOR SELECT
USING (visible = true);

CREATE POLICY "Admins can manage all content"
ON public.content_entries
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 10. PROJECT_EMBEDDINGS table policies - restrict access to embeddings
CREATE POLICY "Only system can access project embeddings"
ON public.project_embeddings
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can manage project embeddings"
ON public.project_embeddings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 11. CONTENT_EMBEDDINGS table policies - restrict access to embeddings
CREATE POLICY "Only system can access content embeddings"
ON public.content_embeddings
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can manage content embeddings"
ON public.content_embeddings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 12. Secure USER_PROMPTS table - remove anonymous access, require authentication
DROP POLICY IF EXISTS "Allow anonymous insertions" ON public.user_prompts;

CREATE POLICY "Authenticated users can insert prompts"
ON public.user_prompts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Keep admin read access
CREATE POLICY "Admins can view all prompts"
ON public.user_prompts
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 13. Fix database functions security - add proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_content_by_query(
  query_embedding vector, 
  match_threshold double precision DEFAULT 0.7, 
  match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, content_id uuid, content text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    AND c.visible = true
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_projects_by_query(
  query_embedding vector, 
  match_threshold double precision DEFAULT 0.7, 
  match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, project_id uuid, content text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    AND p.visible = true
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_project_content_for_embeddings(project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_content TEXT;
BEGIN
  SELECT 
    title || ' ' || 
    client || ' ' || 
    description || ' ' || 
    COALESCE(string_agg(t.name, ' '), '')
  INTO project_content
  FROM public.projects p
  LEFT JOIN public.project_tags pt ON pt.project_id = p.id
  LEFT JOIN public.tags t ON t.id = pt.tag_id
  WHERE p.id = project_id
  GROUP BY p.id, p.title, p.client, p.description;
  
  RETURN project_content;
END;
$$;

-- 14. USER_ROLES table policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 15. Create storage policies for existing buckets
CREATE POLICY "Anyone can view public project images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project_images');

CREATE POLICY "Admins can upload project images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project_images' AND public.is_admin());

CREATE POLICY "Admins can update project images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'project_images' AND public.is_admin());

CREATE POLICY "Admins can delete project images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'project_images' AND public.is_admin());

CREATE POLICY "Anyone can view public content assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'content_assets');

CREATE POLICY "Admins can upload content assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content_assets' AND public.is_admin());

CREATE POLICY "Admins can update content assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'content_assets' AND public.is_admin());

CREATE POLICY "Admins can delete content assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'content_assets' AND public.is_admin());