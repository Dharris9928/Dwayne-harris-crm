import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePerspective } from '@/hooks/usePerspective';
import { useUserRole } from '@/hooks/useUserRole';
import { RequestAccessButton } from '@/components/common/RequestAccessButton';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  companyResults?: CompanySearchResult[];
}

interface CompanySearchResult {
  id: string;
  company_name: string;
  industry_type: string;
  segment: string;
  city: string;
  state: string;
  lead_score: number | null;
  priority_tier: string | null;
  website_url: string | null;
  total_employees: number | null;
  hasAccess: boolean;
}

const EXAMPLE_QUERIES = [
  "Show me HVAC contractors in Texas",
  "Find luxury builders with high scores",
  "Any companies I'm assigned to in California?",
  "Premium specialists with websites"
];

function getPriorityVariant(tier: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (tier) {
    case 'P1': return 'destructive';
    case 'P2': return 'default';
    case 'P3': return 'secondary';
    default: return 'outline';
  }
}

function WelcomeMessage({ onSelectExample }: { onSelectExample: (query: string) => void }) {
  return (
    <div className="space-y-4 mb-4">
      <p className="text-sm text-muted-foreground">
        Hi! I can help you find companies in your database. Try asking:
      </p>
      <div className="space-y-2">
        {EXAMPLE_QUERIES.map((example) => (
          <Button
            key={example}
            variant="outline"
            className="w-full text-left justify-start text-sm h-auto py-2 px-3"
            onClick={() => onSelectExample(example)}
          >
            {example}
          </Button>
        ))}
      </div>
    </div>
  );
}

function CompanyResultCard({ 
  company, 
  onView 
}: { 
  company: CompanySearchResult; 
  onView: (id: string) => void;
}) {
  return (
    <Card className="mb-2 hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{company.company_name}</h4>
            <p className="text-xs text-muted-foreground">
              {company.city}, {company.state}
            </p>
          </div>
          {company.priority_tier && (
            <Badge variant={getPriorityVariant(company.priority_tier)} className="text-xs ml-2 flex-shrink-0">
              {company.priority_tier}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-3 text-xs text-muted-foreground mb-2">
          {company.lead_score !== null && <span>Score: {company.lead_score}</span>}
          {company.total_employees && <span>👥 {company.total_employees}</span>}
        </div>
        
        {company.hasAccess ? (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8" onClick={() => onView(company.id)}>
              View
            </Button>
            {company.website_url && (
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                <a href={company.website_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">No access</p>
            <RequestAccessButton 
              tableName="companies"
              recordId={company.id}
              recordName={company.company_name}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessageBubble({ 
  message, 
  onViewCompany 
}: { 
  message: Message; 
  onViewCompany: (id: string) => void;
}) {
  return (
    <div className={`mb-4 ${message.role === 'user' ? 'text-right' : ''}`}>
      <div className={`inline-block max-w-[85%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg px-3 py-2`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      {message.companyResults && message.companyResults.length > 0 && (
        <div className="mt-3 space-y-2">
          {message.companyResults.map((company) => (
            <CompanyResultCard 
              key={company.id} 
              company={company} 
              onView={onViewCompany}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProspectingAIChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { perspective } = usePerspective('my_records', 'companies');
  const { data: userRoleData } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const resultsCount = messages.filter(m => m.companyResults && m.companyResults.length > 0).length;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const viewCompany = (companyId: string) => {
    navigate('/companies', { state: { editCompanyId: companyId } });
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMsg: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    let companyResults: CompanySearchResult[] | undefined;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prospect-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            perspective,
            userRole: userRoleData?.role
          })
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add credits to continue.');
        }
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      assistantContent = data.message || '';
      companyResults = data.companyResults;

      // Add message with company results
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: assistantContent,
          companyResults: companyResults && companyResults.length > 0 ? companyResults : undefined
        }
      ]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating bubble (closed) */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 p-0"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
          {resultsCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-xs">
              {resultsCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Chat window (open) */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[400px] h-[600px] shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="border-b flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Prospecting</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <WelcomeMessage onSelectExample={sendMessage} />
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} onViewCompany={viewCompany} />
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </div>
            )}
          </ScrollArea>

          <CardFooter className="border-t flex-shrink-0 p-3">
            <form onSubmit={handleSubmit} className="flex gap-2 w-full">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about companies..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
