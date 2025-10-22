import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RegionalBadgeProps {
  region: string | null;
  className?: string;
}

const REGION_STYLES = {
  West: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300',
  Central: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-300',
  Northeast: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300',
  Southeast: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-300',
};

export const RegionalBadge = ({ region, className }: RegionalBadgeProps) => {
  if (!region) return null;

  const style = REGION_STYLES[region as keyof typeof REGION_STYLES] || 'bg-muted';

  return (
    <Badge 
      variant="outline" 
      className={cn(style, className)}
    >
      {region}
    </Badge>
  );
};