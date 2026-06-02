import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataQualityIndicatorProps {
  company: {
    company_name: string;
    website_url: string | null;
    primary_phone: string | null;
    primary_email: string | null;
    annual_volume: number | null;
    annual_revenue_range: string | null;
    average_home_price: number | null;
    linkedin_company_url: string | null;
    industry_type: string;
    segment: string | null;
    status: string;
  };
  compact?: boolean;
}

export function DataQualityIndicator({ company, compact = false }: DataQualityIndicatorProps) {
  const analysis = useMemo(() => {
    const criticalFields = [
      { name: 'Website', value: company.website_url, weight: 2 },
      { name: 'Phone', value: company.primary_phone, weight: 2 },
      { name: 'Email', value: company.primary_email, weight: 2 },
      { name: 'LinkedIn', value: company.linkedin_company_url, weight: 1 },
    ];

    const industryFields = company.industry_type === 'Builder' 
      ? [
          { name: 'Annual Volume', value: company.annual_volume, weight: 2 },
          { name: 'Avg Home Price', value: company.average_home_price, weight: 2 },
        ]
      : [
          { name: 'Annual Revenue', value: company.annual_revenue_range, weight: 2 },
        ];

    const segmentFields = [
      { name: 'Segment', value: company.segment, weight: 1 },
    ];

    const allFields = [...criticalFields, ...industryFields, ...segmentFields];
    
    const filledFields = allFields.filter(f => f.value !== null && f.value !== undefined && f.value !== '');
    const missingFields = allFields.filter(f => !f.value);

    const totalWeight = allFields.reduce((sum, f) => sum + f.weight, 0);
    const filledWeight = filledFields.reduce((sum, f) => sum + f.weight, 0);
    
    const completeness = Math.round((filledWeight / totalWeight) * 100);

    return {
      completeness,
      missingFields: missingFields.map(f => f.name),
      totalFields: allFields.length,
      filledFields: filledFields.length
    };
  }, [company]);

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getQualityBadge = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-700 border-green-500/20';
    if (score >= 60) return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`${getQualityBadge(analysis.completeness)} cursor-help text-xs`}
            >
              {analysis.completeness}% complete
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-semibold">Data Quality: {analysis.completeness}%</p>
              <p>{analysis.filledFields}/{analysis.totalFields} fields filled</p>
              {analysis.missingFields.length > 0 && (
                <>
                  <p className="font-medium mt-2">Missing:</p>
                  <ul className="text-muted-foreground">
                    {analysis.missingFields.map((field, idx) => (
                      <li key={idx}>• {field}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {analysis.completeness >= 80 ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <div>
            <p className="text-sm font-medium">Data Quality</p>
            <p className="text-xs text-muted-foreground">
              {analysis.filledFields}/{analysis.totalFields} fields complete
            </p>
          </div>
        </div>
        <p className={`text-2xl font-bold ${getQualityColor(analysis.completeness)}`}>
          {analysis.completeness}%
        </p>
      </div>

      <Progress value={analysis.completeness} className="h-2" />

      {analysis.missingFields.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-2">Missing Critical Fields:</p>
          <div className="flex flex-wrap gap-2">
            {analysis.missingFields.map((field, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {field}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
