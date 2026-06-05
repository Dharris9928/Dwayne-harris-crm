import { useState } from 'react';
import { ChevronRight, ChevronDown, Building2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ListViewProps {
  data: any[];
  onSelectItem: (item: any) => void;
}

export function ListView({ data, onSelectItem }: ListViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Organize data into parent-child hierarchy
  const parentCompanies = data.filter(c => c.company_type === 'parent' || !c.parent_company_id);
  const subsidiaries = data.filter(c => c.company_type === 'subsidiary' && c.parent_company_id);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getSubsidiaries = (parentId: string) => {
    return subsidiaries.filter(s => s.parent_company_id === parentId);
  };

  const getPriorityVariant = (priority: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (priority) {
      case 'P1':
        return 'destructive';
      case 'P2':
        return 'default';
      case 'P3':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 p-4 bg-muted border-b border-border font-semibold text-sm text-muted-foreground">
        <div className="col-span-5">Company</div>
        <div className="col-span-2">Location</div>
        <div className="col-span-1">Score</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Priority</div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-border">
        {parentCompanies.map((parent) => {
          const subs = getSubsidiaries(parent.id);
          const isExpanded = expandedItems.has(parent.id);
          const hasChildren = subs.length > 0;

          return (
            <div key={parent.id}>
              {/* Parent Row */}
              <div 
                className="grid grid-cols-12 gap-4 p-4 hover:bg-accent cursor-pointer items-center transition-colors"
                onClick={() => {
                  if (hasChildren) toggleExpand(parent.id);
                  onSelectItem(parent);
                }}
              >
                <div className="col-span-5 flex items-center gap-2">
                  {hasChildren && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(parent.id);
                      }}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {!hasChildren && <div className="w-6" />}
                  
                  <Building2 className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-semibold">{parent.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {parent.industry_type}
                      {hasChildren && ` • ${subs.length} ${subs.length === 1 ? 'subsidiary' : 'subsidiaries'}`}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-sm text-muted-foreground">
                  {parent.city && parent.state ? `${parent.city}, ${parent.state}` : parent.state}
                </div>

                <div className="col-span-1">
                  <span className="font-bold text-primary">{parent.lead_score || 0}</span>
                </div>

                <div className="col-span-2">
                  <Badge variant="outline">{parent.status}</Badge>
                </div>

                <div className="col-span-2">
                  <Badge variant={getPriorityVariant(parent.priority_tier)}>
                    {parent.priority_tier}
                  </Badge>
                </div>
              </div>

              {/* Subsidiary Rows */}
              {isExpanded && subs.map((sub) => (
                <div
                  key={sub.id}
                  className="grid grid-cols-12 gap-4 p-4 pl-16 hover:bg-accent cursor-pointer items-center bg-muted/50 transition-colors"
                  onClick={() => onSelectItem(sub)}
                >
                  <div className="col-span-5 flex items-center gap-2">
                    <Users className="h-4 w-4 text-[hsl(var(--status-engaged))]" />
                    <div>
                      <div className="font-medium">{sub.company_name}</div>
                      <div className="text-xs text-muted-foreground">{sub.industry_type}</div>
                    </div>
                  </div>

                  <div className="col-span-2 text-sm text-muted-foreground">
                    {sub.city && sub.state ? `${sub.city}, ${sub.state}` : sub.state}
                  </div>

                  <div className="col-span-1">
                    <span className="font-bold text-primary">{sub.lead_score || 0}</span>
                  </div>

                  <div className="col-span-2">
                    <Badge variant="outline">{sub.status}</Badge>
                  </div>

                  <div className="col-span-2">
                    <Badge variant={getPriorityVariant(sub.priority_tier)}>
                      {sub.priority_tier}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
