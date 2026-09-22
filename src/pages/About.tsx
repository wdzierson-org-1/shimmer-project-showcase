
import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import { supabase } from '@/integrations/supabase/client';
import { Linkedin, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const About = () => {
  const [bio, setBio] = useState<string | null>(null);

  useEffect(() => {
    const fetchBio = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'about_bio')
        .single();
      if (data) setBio(data.value);
    };
    fetchBio();
  }, []);

  const paragraphs = bio ? bio.split('\n\n').filter(Boolean) : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pt-24 pb-16 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">About</p>
            <h1 className="font-serif text-4xl md:text-5xl mb-10 leading-tight" style={{ fontWeight: 200 }}>
              Will Dzierson
            </h1>
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-8">
              Design technologist &amp; AI entrepreneur
            </p>

            <div className="space-y-6 text-lg text-foreground/80 leading-relaxed font-light">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <>
                  <div className="h-5 bg-muted/40 rounded animate-pulse w-full" />
                  <div className="h-5 bg-muted/40 rounded animate-pulse w-4/5" />
                  <div className="h-5 bg-muted/40 rounded animate-pulse w-full" />
                </>
              )}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Button asChild variant="outline">
                <a href="mailto:will+hello@dzierson.com" className="flex items-center gap-2">
                  <Mail size={16} />
                  Get in touch
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://www.linkedin.com/in/will-dzierson-1081963/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Linkedin size={16} />
                  LinkedIn
                </a>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
};

export default About;
