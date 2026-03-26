-- Drop all existing policies on project_images to eliminate conflicts
DROP POLICY IF EXISTS "Project images are publicly viewable" ON public.project_images;
DROP POLICY IF EXISTS "Admins can manage project images" ON public.project_images;
DROP POLICY IF EXISTS "Anyone can view project images" ON public.project_images;

-- Public read: anyone can view images for visible projects
CREATE POLICY "Project images are publicly viewable"
ON public.project_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND (p.visible = true OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Admin write: admins can insert, update, delete
CREATE POLICY "Admins can manage project images"
ON public.project_images
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
