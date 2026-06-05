import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AISlideBuilderProps {
  presentationId: string;
  onSlidesUpdated: (slides: any[]) => void;
}

export function AISlideBuilder({ presentationId, onSlidesUpdated }: AISlideBuilderProps) {
  const { toast } = useToast();
  const [instruction, setInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  const handleEditSlides = async () => {
    if (!instruction.trim()) {
      toast({
        title: 'Instruction required',
        description: 'Please describe what you want to change',
        variant: 'destructive',
      });
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-edit-presentation', {
        body: { presentationId, instruction },
      });

      if (error) throw error;

      // Update slides in parent and database
      onSlidesUpdated(data.slides);
      
      await supabase
        .from('presentations')
        .update({ 
          slides: data.slides,
          ai_conversation: data.conversation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', presentationId);

      setConversationHistory(data.conversation);
      setInstruction('');

      toast({
        title: 'Slides updated!',
        description: 'Your changes have been applied',
      });
    } catch (error: any) {
      console.error('Edit error:', error);
      toast({
        title: 'Edit failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-google">
          <MessageSquare className="h-5 w-5" />
          AI Editor
        </CardTitle>
        <CardDescription>
          Describe changes and AI will update your slides
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conversationHistory.length > 0 && (
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-4">
              {conversationHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary/10 ml-8'
                      : 'bg-muted mr-8'
                  }`}
                >
                  <p className="text-sm font-google">
                    {msg.role === 'user' ? '👤 You' : '🤖 AI'}
                  </p>
                  <p className="text-sm mt-1 font-google">
                    {msg.content.substring(0, 150)}
                    {msg.content.length > 150 && '...'}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <Textarea
          placeholder="Example: Make the title slide use Google Red instead of Blue&#10;or: Add a new slide about pricing&#10;or: Remove the last slide"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          className="font-google"
          rows={3}
        />

        <Button
          onClick={handleEditSlides}
          disabled={isEditing || !instruction.trim()}
          className="font-google"
        >
          {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Slides with AI
        </Button>
      </CardContent>
    </Card>
  );
}