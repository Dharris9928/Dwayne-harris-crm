import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CompaniesFilterSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function CompaniesFilterSidebar({ isCollapsed, onToggle }: CompaniesFilterSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusOptions = ["Lead", "Contacted", "Engaged", "Pilot", "Active", "Inactive", "Lost"];
  const priorityOptions = ["P1: Strategic", "P2: High Value", "P3: Standard"];
  const builderSegments = [
    "Production Builders",
    "Custom Builders",
    "Remodelers",
    "Multi-Family",
    "Commercial"
  ];
  const contractorSegments = [
    "Retrofit Specialists",
    "New Construction",
    "Service & Repair",
    "Commercial HVAC"
  ];

  const handleFilterClick = (filterType: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(filterType, value);
    setSearchParams(newParams);
  };

  const isActiveFilter = (filterType: string, value: string) => {
    return searchParams.get(filterType) === value;
  };

  if (isCollapsed) {
    return (
      <div className="w-[50px] border-r border-border bg-card p-2 flex flex-col items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[280px] border-r border-border bg-card p-4 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Filters</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Status Filter */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
        <div className="space-y-1">
          {statusOptions.map((status) => (
            <Button
              key={status}
              variant={isActiveFilter("status", status) ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start text-sm",
                isActiveFilter("status", status) && "bg-accent"
              )}
              onClick={() => handleFilterClick("status", status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Priority Filter */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Priority</h4>
        <div className="space-y-1">
          {priorityOptions.map((priority) => (
            <Button
              key={priority}
              variant={isActiveFilter("priority", priority) ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start text-sm",
                isActiveFilter("priority", priority) && "bg-accent"
              )}
              onClick={() => handleFilterClick("priority", priority)}
            >
              {priority.split(":")[0]}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Builder Segment Filter */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Builder Segment</h4>
        <div className="space-y-1">
          {builderSegments.map((segment) => (
            <Button
              key={segment}
              variant={isActiveFilter("builder_segment", segment) ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start text-sm",
                isActiveFilter("builder_segment", segment) && "bg-accent"
              )}
              onClick={() => handleFilterClick("builder_segment", segment)}
            >
              {segment}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Contractor Segment Filter */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Contractor Segment</h4>
        <div className="space-y-1">
          {contractorSegments.map((segment) => (
            <Button
              key={segment}
              variant={isActiveFilter("contractor_segment", segment) ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start text-sm",
                isActiveFilter("contractor_segment", segment) && "bg-accent"
              )}
              onClick={() => handleFilterClick("contractor_segment", segment)}
            >
              {segment}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
