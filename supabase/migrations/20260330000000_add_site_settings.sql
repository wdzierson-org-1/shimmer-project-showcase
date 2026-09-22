CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (bio, etc.)
CREATE POLICY "Public can read site_settings"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- Only authenticated admins can write
CREATE POLICY "Admins can update site_settings"
  ON public.site_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

INSERT INTO public.site_settings (key, value) VALUES (
  'about_bio',
  'With a 20+ year career that spans design and technology leadership roles at Google, Yahoo!, and Grand Rounds/Included Health, Will Dzierson is an accomplished design technologist and AI entrepreneur. Noodle, his recent healthcare AI venture, aims to revolutionize personal health management by leveraging cutting-edge AI technologies like LLMs and RAG-based models to streamline patient data interpretation and interaction, empowering patients to collect, manage, interpret, and derive value from their own information.

Will''s prior experience includes pioneering AI-driven design solutions at Obvious Ventures and heading design teams at Grand Rounds, where he successfully scaled teams and improved user experience across health tech products. He has contributed to significant innovations in mobile design, including projects at Google that reshaped how millions of users interact with core services like Search, Local, News, and Calendar. Will''s unique blend of expertise in healthcare, AI, design, and software development positions him at the forefront of the health tech industry.'
) ON CONFLICT (key) DO NOTHING;
