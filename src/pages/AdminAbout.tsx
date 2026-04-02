import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FormState {
  about_headline: string;
  about_bio: string;
  about_email: string;
  about_resume_url: string;
  about_calendar_url: string;
}

const KEYS: (keyof FormState)[] = [
  'about_headline',
  'about_bio',
  'about_email',
  'about_resume_url',
  'about_calendar_url',
];

const DEFAULT_FORM: FormState = {
  about_headline: '',
  about_bio: '',
  about_email: '',
  about_resume_url: '',
  about_calendar_url: '',
};

const AdminAbout = () => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', KEYS);

      if (error) {
        toast.error('Failed to load settings');
        setLoading(false);
        return;
      }

      if (data) {
        const merged = { ...DEFAULT_FORM };
        data.forEach(({ key, value }) => {
          if (key in merged) {
            (merged as Record<string, string>)[key] = value ?? '';
          }
        });
        setForm(merged);
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upserts = KEYS.map((key) => ({
        key,
        value: form[key],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(upserts, { onConflict: 'key' });

      if (error) throw error;
      toast.success('About page saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Button asChild variant="ghost" className="mb-4 -ml-2">
              <Link to="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold">About & Contact</h1>
            <p className="text-muted-foreground mt-1">
              Edit the content displayed on your public About page.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Button asChild variant="outline" size="sm">
              <a href="/about" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </a>
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            <Card>
              <CardHeader>
                <CardTitle>Positioning</CardTitle>
                <CardDescription>
                  The headline visitors see first on the About page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={form.about_headline}
                    onChange={(e) => handleChange('about_headline', e.target.value)}
                    placeholder="Principal Product Designer specializing in AI-native experiences."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bio</CardTitle>
                <CardDescription>
                  A short paragraph describing your background and focus.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={form.about_bio}
                    onChange={(e) => handleChange('about_bio', e.target.value)}
                    placeholder="I sit at the intersection of design and engineering..."
                    rows={8}
                    className="resize-y font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Markdown supported — use blank lines between paragraphs, **bold**, and [link text](url).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
                <CardDescription>
                  Leave a field blank to hide it from the public About page.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.about_email}
                    onChange={(e) => handleChange('about_email', e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="resume">Resume URL</Label>
                  <Input
                    id="resume"
                    type="url"
                    value={form.about_resume_url}
                    onChange={(e) => handleChange('about_resume_url', e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to a hosted PDF or Google Doc. Paste the direct URL.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="calendar">Calendar / booking link</Label>
                  <Input
                    id="calendar"
                    type="url"
                    value={form.about_calendar_url}
                    onChange={(e) => handleChange('about_calendar_url', e.target.value)}
                    placeholder="https://cal.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Calendly, Cal.com, or any scheduling link.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAbout;
