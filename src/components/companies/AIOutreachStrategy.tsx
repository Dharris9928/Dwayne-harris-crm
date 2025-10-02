import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Lightbulb, Target, Shield, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OutreachStrategy {
  primaryApproach: {
    channel: string;
    reasoning: string;
  };
  valuePropositions: string[];
  talkingPoints: string[];
  touchpointSequence: Array<{
    step: number;
    timing: string;
    channel: string;
    message: string;
  }>;
  personalizationElements?: string[];
  objectionHandling?: Array<{
    objection: string;
    response: string;
  }>;
}

interface AIOutreachStrategyProps {
  companyId: string;
  companyName: string;
}

export function AIOutreachStrategy({ companyId, companyName }: AIOutreachStrategyProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [strategy, setStrategy] = useState<OutreachStrategy | null>(null);

  const generateStrategy = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-outreach-strategy', {
        body: { companyId }
      });

      if (error) throw error;

      setStrategy(data.strategy);
      toast({
        title: 'Strategy Generated',
        description: 'AI created a personalized outreach strategy',
      });
    } catch (error: any) {
      console.error('Strategy generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate strategy',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    const icons: any = {
      'Email': '📧',
      'Phone': '📞',
      'LinkedIn': '💼',
      'In-Person': '🤝'
    };
    return icons[channel] || '💬';
  };

  if (!strategy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            AI Outreach Strategy
          </CardTitle>
          <CardDescription>
            Generate a personalized outreach plan for {companyName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Button
              onClick={generateStrategy}
              disabled={generating}
              size="lg"
            >
              <MessageSquare className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
              {generating ? 'Generating Strategy...' : 'Generate Outreach Strategy'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          AI Outreach Strategy
        </CardTitle>
        <CardDescription>
          Personalized strategy for {companyName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="approach" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="approach">Approach</TabsTrigger>
            <TabsTrigger value="sequence">Sequence</TabsTrigger>
            <TabsTrigger value="messaging">Messaging</TabsTrigger>
            <TabsTrigger value="objections">Objections</TabsTrigger>
          </TabsList>

          {/* Primary Approach Tab */}
          <TabsContent value="approach" className="space-y-4">
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Recommended Channel</h3>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getChannelIcon(strategy.primaryApproach.channel)}</span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {strategy.primaryApproach.channel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {strategy.primaryApproach.reasoning}
              </p>
            </div>

            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Key Value Propositions</h3>
              </div>
              <ul className="space-y-2">
                {strategy.valuePropositions.map((prop, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary font-medium">{idx + 1}.</span>
                    {prop}
                  </li>
                ))}
              </ul>
            </div>

            {strategy.personalizationElements && strategy.personalizationElements.length > 0 && (
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-3">Personalization Elements</h3>
                <div className="flex flex-wrap gap-2">
                  {strategy.personalizationElements.map((element, idx) => (
                    <Badge key={idx} variant="secondary">
                      {element}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Touchpoint Sequence Tab */}
          <TabsContent value="sequence" className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Touchpoint Sequence</h3>
            </div>
            {strategy.touchpointSequence.map((touchpoint) => (
              <div key={touchpoint.step} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Step {touchpoint.step}</Badge>
                  <Badge variant="secondary">{touchpoint.channel}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{touchpoint.timing}</span>
                </div>
                <p className="text-sm text-muted-foreground">{touchpoint.message}</p>
              </div>
            ))}
          </TabsContent>

          {/* Messaging Tab */}
          <TabsContent value="messaging" className="space-y-4">
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-medium mb-3">Talking Points</h3>
              <ul className="space-y-2">
                {strategy.talkingPoints.map((point, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          {/* Objections Tab */}
          <TabsContent value="objections" className="space-y-3">
            {strategy.objectionHandling && strategy.objectionHandling.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Objection Handling</h3>
                </div>
                {strategy.objectionHandling.map((item, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium text-orange-600 mb-2">
                      ❓ {item.objection}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      💡 {item.response}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No objection handling strategies provided
              </p>
            )}
          </TabsContent>
        </Tabs>

        <Button
          variant="outline"
          onClick={generateStrategy}
          disabled={generating}
          className="w-full mt-4"
        >
          {generating ? 'Regenerating...' : 'Regenerate Strategy'}
        </Button>
      </CardContent>
    </Card>
  );
}