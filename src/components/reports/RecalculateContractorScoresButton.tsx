import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RecalculateContractorScoresButtonProps {
  onComplete?: () => void;
}

export function RecalculateContractorScoresButton({ onComplete }: RecalculateContractorScoresButtonProps) {
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState('');
  const { toast } = useToast();

  const handleRecalculateAll = async () => {
    setCalculating(true);
    setProgress('Starting recalculation...');

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recalculate-contractor-scores`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to recalculate scores');
      }

      const results = await response.json();

      toast({
        title: 'Recalculation Complete',
        description: `Successfully recalculated ${results.success} of ${results.total} contractors. ${results.errors > 0 ? `${results.errors} errors occurred.` : ''}`,
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error recalculating contractor scores:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to recalculate contractor scores',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
      setProgress('');
    }
  };

  return (
    <Button
      onClick={handleRecalculateAll}
      disabled={calculating}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
      {calculating ? progress || 'Recalculating...' : 'Recalculate All Contractor Scores'}
    </Button>
  );
}
