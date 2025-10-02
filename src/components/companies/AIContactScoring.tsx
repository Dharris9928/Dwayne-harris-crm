import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Star, TrendingUp, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScoredContact {
  contactId: string;
  score: number;
  strengths: string[];
  recommendedApproach: string;
  bestTimeToReach?: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface AIContactScoringProps {
  companyId: string;
  companyName: string;
  contacts: any[];
}

export function AIContactScoring({ companyId, companyName, contacts }: AIContactScoringProps) {
  const { toast } = useToast();
  const [scoring, setScoring] = useState(false);
  const [scoredContacts, setScoredContacts] = useState<ScoredContact[]>([]);

  const scoreContacts = async () => {
    if (!contacts || contacts.length === 0) {
      toast({
        title: 'No Contacts',
        description: 'Add contacts first to use AI scoring',
        variant: 'default'
      });
      return;
    }

    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-score-contacts', {
        body: { companyId, contacts }
      });

      if (error) throw error;

      setScoredContacts(data.scoredContacts);
      toast({
        title: 'Contacts Scored',
        description: `AI scored ${data.scoredContacts.length} contacts`,
      });
    } catch (error: any) {
      console.error('Contact scoring error:', error);
      toast({
        title: 'Scoring Failed',
        description: error.message || 'Failed to score contacts',
        variant: 'destructive'
      });
    } finally {
      setScoring(false);
    }
  };

  const getContactData = (contactId: string) => {
    return contacts.find(c => (c.apolloId || c.id) === contactId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-500/10 border-green-500/20';
    if (score >= 60) return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
    return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'bg-green-500/10 text-green-700 border-green-500/20';
    if (priority === 'Medium') return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  };

  if (scoredContacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            AI Contact Scoring
          </CardTitle>
          <CardDescription>
            AI-powered contact evaluation and prioritization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Button
              onClick={scoreContacts}
              disabled={scoring || !contacts || contacts.length === 0}
              size="lg"
            >
              <Star className={`h-4 w-4 mr-2 ${scoring ? 'animate-pulse' : ''}`} />
              {scoring ? 'Scoring Contacts...' : 'Score Contacts with AI'}
            </Button>
            {contacts && contacts.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Ready to score {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          AI Contact Scoring
        </CardTitle>
        <CardDescription>
          Prioritized contacts for {companyName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scoredContacts
            .sort((a, b) => b.score - a.score)
            .map((scored) => {
              const contact = getContactData(scored.contactId);
              if (!contact) return null;

              return (
                <div
                  key={scored.contactId}
                  className="border border-border rounded-lg p-4 space-y-3"
                >
                  {/* Contact Header */}
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={contact.photoUrl} />
                      <AvatarFallback>
                        {(contact.firstName || contact.first_name)?.[0]}
                        {(contact.lastName || contact.last_name)?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {contact.firstName || contact.first_name} {contact.lastName || contact.last_name}
                        </p>
                        <Badge variant="outline" className={getScoreColor(scored.score)}>
                          {scored.score}/100
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(scored.priority)}>
                          {scored.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{contact.title}</p>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Key Strengths</p>
                    </div>
                    <ul className="space-y-1 ml-6">
                      {scored.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">• {strength}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Approach */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Recommended Approach</p>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">{scored.recommendedApproach}</p>
                  </div>

                  {/* Best Time to Reach */}
                  {scored.bestTimeToReach && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Best Time to Reach</p>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">{scored.bestTimeToReach}</p>
                    </div>
                  )}
                </div>
              );
            })}

          <Button
            variant="outline"
            onClick={scoreContacts}
            disabled={scoring}
            className="w-full"
          >
            {scoring ? 'Re-scoring...' : 'Re-score Contacts'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}