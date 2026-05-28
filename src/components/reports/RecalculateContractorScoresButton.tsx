import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RecalculateContractorScoresButtonProps {
  onComplete?: () => void;
}

type ChunkResponse = {
  processed: number;
  success: number;
  errors: number;
  by_channel: { Builder: number; Contractor: number; Other: number };
  by_tier: { P1: number; P2: number; P3: number; Unscored: number };
  errored_companies: { id: string; name: string; error: string }[];
  nextCursor: string | null;
};

const CHUNK_LIMIT = 500;

export function RecalculateContractorScoresButton({ onComplete }: RecalculateContractorScoresButtonProps) {
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState('');
  const { toast } = useToast();

  const handleRecalculateAll = async () => {
    setCalculating(true);
    setProgress('Starting...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const totals = {
        processed: 0, success: 0, errors: 0,
        Builder: 0, Contractor: 0, Other: 0,
        P1: 0, P2: 0, P3: 0, Unscored: 0,
        errored: [] as { id: string; name: string; error: string }[],
      };

      let cursor: string | null = null;
      let chunkCount = 0;

      do {
        chunkCount++;
        setProgress(`Chunk ${chunkCount} · ${totals.processed} scored`);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recalculate-contractor-scores`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cursor, limit: CHUNK_LIMIT }),
          }
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Chunk ${chunkCount} failed (HTTP ${response.status})`);
        }

        const chunk: ChunkResponse = await response.json();
        totals.processed += chunk.processed;
        totals.success += chunk.success;
        totals.errors += chunk.errors;
        totals.Builder += chunk.by_channel?.Builder ?? 0;
        totals.Contractor += chunk.by_channel?.Contractor ?? 0;
        totals.Other += chunk.by_channel?.Other ?? 0;
        totals.P1 += chunk.by_tier?.P1 ?? 0;
        totals.P2 += chunk.by_tier?.P2 ?? 0;
        totals.P3 += chunk.by_tier?.P3 ?? 0;
        totals.Unscored += chunk.by_tier?.Unscored ?? 0;
        totals.errored.push(...(chunk.errored_companies ?? []).slice(0, 25));

        cursor = chunk.nextCursor;
      } while (cursor);

      toast({
        title: 'v2.0 Recalculation Complete',
        description:
          `Scored ${totals.success}/${totals.processed} companies ` +
          `(${totals.Builder} builder · ${totals.Contractor} contractor · ${totals.Other} other). ` +
          `P1:${totals.P1} · P2:${totals.P2} · P3:${totals.P3} · Unscored:${totals.Unscored}` +
          (totals.errors > 0 ? ` · ${totals.errors} errors` : ''),
      });

      if (onComplete) onComplete();
    } catch (error: any) {
      console.error('Error recalculating v2 scores:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to recalculate v2.0 scores',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
      setProgress('');
    }
  };

  return (
    <Button onClick={handleRecalculateAll} disabled={calculating} variant="outline" size="sm">
      <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
      {calculating ? progress || 'Recalculating v2.0...' : 'Recalculate v2.0 Scores (All Companies)'}
    </Button>
  );
}
