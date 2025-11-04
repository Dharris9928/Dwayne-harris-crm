import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, Eye, Edit, Ban } from 'lucide-react';
import { SlidePreviewCarousel } from '@/components/presentations/SlidePreviewCarousel';
import { PresentationTable } from '@/components/presentations/PresentationTable';
import { AISlideBuilder } from '@/components/presentations/AISlideBuilder';
import { PresentationAnalytics } from '@/components/presentations/PresentationAnalytics';

export default function Presentation() {
  const navigate = useNavigate();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [outline, setOutline] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any[]>([]);
  const [savedPresentationId, setSavedPresentationId] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState('');

  // Redirect if not admin
  if (!roleLoading && roleData?.role !== 'admin') {
    navigate('/');
    return null;
  }

  const handleGenerateSlides = async () => {
    if (!outline.trim()) {
      toast({
        title: 'Outline required',
        description: 'Please paste your presentation outline',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-presentation', {
        body: { outline },
      });

      if (error) throw error;

      setGeneratedSlides(data.slides);
      setConversation(data.conversation);
      
      toast({
        title: 'Slides generated!',
        description: `Created ${data.slides.length} slides with Google branding`,
      });
    } catch (error: any) {
      console.error('Generate error:', error);
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePresentation = async () => {
    if (generatedSlides.length === 0) {
      toast({
        title: 'No slides to save',
        description: 'Generate slides first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const title = generatedSlides[0]?.title || 'Untitled Presentation';
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('presentations')
        .insert({
          title,
          slides: generatedSlides,
          ai_conversation: conversation,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSavedPresentationId(data.id);
      const link = `${window.location.origin}/present/${data.token}`;
      setShareableLink(link);

      toast({
        title: 'Presentation saved!',
        description: 'Shareable link generated (expires in 14 days)',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast({
      title: 'Link copied!',
      description: 'Shareable presentation link copied to clipboard',
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-google">Presentation Manager</h1>
        <p className="text-muted-foreground">Create and manage AI-powered presentations with Google branding</p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="manage">Manage Existing</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-google">AI Slide Generator</CardTitle>
              <CardDescription>Paste your outline and let AI create Google-branded slides</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your presentation outline here...&#10;&#10;Example:&#10;Title: Q4 Sales Performance&#10;&#10;Section 1: Overview&#10;- Key metrics&#10;- Team achievements&#10;&#10;Section 2: Results&#10;- Revenue growth&#10;- New customers"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                className="min-h-[200px] font-google"
              />

              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateSlides} 
                  disabled={isGenerating || !outline.trim()}
                  className="font-google"
                >
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Slides with AI
                </Button>

                {generatedSlides.length > 0 && (
                  <Button 
                    onClick={handleSavePresentation}
                    variant="secondary"
                    className="font-google"
                  >
                    Save & Get Link
                  </Button>
                )}
              </div>

              {shareableLink && (
                <Card className="bg-muted">
                  <CardContent className="pt-6 space-y-2">
                    <p className="text-sm font-medium font-google">Shareable Link (expires in 14 days):</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareableLink}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm bg-background border rounded-md font-google"
                      />
                      <Button size="sm" variant="outline" onClick={copyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {generatedSlides.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-google">Preview ({generatedSlides.length} slides)</CardTitle>
              </CardHeader>
              <CardContent>
                <SlidePreviewCarousel slides={generatedSlides} />
              </CardContent>
            </Card>
          )}

          {savedPresentationId && (
            <AISlideBuilder 
              presentationId={savedPresentationId}
              onSlidesUpdated={setGeneratedSlides}
            />
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <PresentationTable />
          <PresentationAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}