import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Mail, Phone, Linkedin, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface Contact {
  firstName: string;
  lastName: string;
  title: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  decisionTier: 'Primary' | 'Secondary' | 'Influencer';
  photoUrl?: string;
  apolloId: string;
}

interface ApolloContactRecommendationsProps {
  companyId: string;
  companyName: string;
  websiteUrl: string | null;
  onContactAdded?: () => void;
}

export function ApolloContactRecommendations({
  companyId,
  companyName,
  websiteUrl,
  onContactAdded
}: ApolloContactRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const { toast } = useToast();

  const extractDomain = (url: string | null) => {
    if (!url) return null;
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      return domain.replace('www.', '');
    } catch {
      return null;
    }
  };

  const searchContacts = async () => {
    setLoading(true);
    try {
      const companyDomain = extractDomain(websiteUrl);
      
      const { data, error } = await supabase.functions.invoke('apollo-contact-search', {
        body: { 
          companyId, 
          companyName,
          companyDomain
        }
      });

      if (error) throw error;

      if (data.contacts && data.contacts.length > 0) {
        setContacts(data.contacts);
        toast({
          title: 'Contacts Found',
          description: `Found ${data.contacts.length} potential contacts from Apollo.io`,
        });
      } else {
        toast({
          title: 'No Contacts Found',
          description: 'Apollo.io did not find any contacts for this company.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Apollo search error:', error);
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to search for contacts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (contact: Contact) => {
    setAdding(contact.apolloId);
    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          company_id: companyId,
          first_name: contact.firstName,
          last_name: contact.lastName,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          mobile: contact.phone,
          linkedin_url: contact.linkedinUrl,
          decision_tier: contact.decisionTier
        });

      if (error) throw error;

      toast({
        title: 'Contact Added',
        description: `${contact.firstName} ${contact.lastName} has been added to your contacts`,
      });

      // Remove from recommendations
      setContacts(prev => prev.filter(c => c.apolloId !== contact.apolloId));
      
      if (onContactAdded) onContactAdded();
    } catch (error) {
      console.error('Add contact error:', error);
      toast({
        title: 'Failed to Add Contact',
        description: error.message || 'Could not add contact',
        variant: 'destructive'
      });
    } finally {
      setAdding(null);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Primary': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'Secondary': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Apollo.io Contact Recommendations
        </CardTitle>
        <CardDescription>
          Find key decision-makers at {companyName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-6">
            <Button
              onClick={searchContacts}
              disabled={loading}
              size="lg"
            >
              <Users className={`h-4 w-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
              {loading ? 'Searching Apollo.io...' : 'Find Contacts with Apollo.io'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.apolloId}
                className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Avatar>
                  <AvatarImage src={contact.photoUrl} alt={`${contact.firstName} ${contact.lastName}`} />
                  <AvatarFallback>
                    {contact.firstName[0]}{contact.lastName[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <Badge variant="outline" className={getTierColor(contact.decisionTier)}>
                      {contact.decisionTier}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">{contact.title}</p>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => addContact(contact)}
                  disabled={adding === contact.apolloId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {adding === contact.apolloId ? 'Adding...' : 'Add'}
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={searchContacts}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Searching...' : 'Search Again'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
