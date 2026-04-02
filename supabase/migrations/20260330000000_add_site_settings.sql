-- Create site_settings table for editable about/contact content
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (public content)
CREATE POLICY "Anyone can read site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins can write site settings
CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Trigger to keep updated_at current
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default about content
INSERT INTO public.site_settings (key, value) VALUES
  ('about_headline', 'Principal Product Designer specializing in AI-native experiences.'),
  ('about_bio', 'I sit at the intersection of design and engineering — I love to design, and I love to build. I''ve spent my career shipping software for healthcare, AI, and consumer products at companies like Google, Salesforce, and Included Health. I''m drawn to the hard problems: building AI interfaces that feel intuitive, designing systems that scale, and bridging the gap between what''s technically possible and what''s genuinely useful.'),
  ('about_email', ''),
  ('about_resume_url', ''),
  ('about_calendar_url', '');
