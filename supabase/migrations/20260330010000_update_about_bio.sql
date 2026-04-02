-- Update about_bio with markdown content and YouTube link
UPDATE public.site_settings
SET value = 'I sit at the intersection of design and engineering — I love to design, and I love to build.

At Google, I led design on mobile experiences that [reshaped how millions of users](https://www.youtube.com/watch?v=JKxzX3p1iRs) interact with information on their phones. Since then I''ve shipped software for healthcare, AI, and consumer products at Salesforce, Included Health, Dexterity Robotics, and a dozen others.

I''m drawn to the hard problems: building AI interfaces that feel intuitive, designing systems that scale, and bridging the gap between what''s technically possible and what''s genuinely useful.'
WHERE key = 'about_bio';
