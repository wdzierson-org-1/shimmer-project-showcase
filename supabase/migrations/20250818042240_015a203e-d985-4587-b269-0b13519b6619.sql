-- Phase 1: Enable RLS on all public tables and create security policies

-- Enable RLS on all tables that don't have it
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;

-- Create profiles table with role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Public content policies (readable by everyone, manageable by admins)
CREATE POLICY "Projects are publicly viewable" ON public.projects
  FOR SELECT USING (visible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage projects" ON public.projects
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Project images are publicly viewable" ON public.project_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id AND (p.visible = true OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can manage project images" ON public.project_images
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tags are publicly viewable" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Project tags are publicly viewable" ON public.project_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage project tags" ON public.project_tags
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Content entries are publicly viewable" ON public.content_entries
  FOR SELECT USING (visible = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage content entries" ON public.content_entries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Secure embedding tables (admin only)
CREATE POLICY "Admins can manage project embeddings" ON public.project_embeddings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage content embeddings" ON public.content_embeddings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Update user_prompts policies to be more secure
DROP POLICY IF EXISTS "Allow anonymous insertions" ON public.user_prompts;
DROP POLICY IF EXISTS "Only admin can view prompts" ON public.user_prompts;

CREATE POLICY "Allow anonymous prompt insertions" ON public.user_prompts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view prompts" ON public.user_prompts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete prompts" ON public.user_prompts
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Secure the database functions
CREATE OR REPLACE FUNCTION public.generate_project_content_for_embeddings(project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;