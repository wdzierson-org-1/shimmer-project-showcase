
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'about_bio')
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) setBio(data.value);
      } catch (err) {
        console.error('Error fetching settings:', err);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'about_bio', value: bio, updated_at: new Date().toISOString() });

      if (error) throw error;
      toast.success('Settings saved');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold">Site Settings</h1>
          <p className="text-muted-foreground mt-1">Edit your About page bio and other site copy</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="bg-card rounded-lg border shadow-sm p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="about-bio" className="text-base font-medium">About page bio</Label>
              <p className="text-sm text-muted-foreground">
                This text appears on the public About page. Use blank lines to separate paragraphs.
              </p>
              <Textarea
                id="about-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={12}
                className="font-light resize-y"
                placeholder="Write your bio here..."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
