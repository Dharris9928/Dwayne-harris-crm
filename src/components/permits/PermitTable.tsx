import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Building, MapPin, Calendar, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { PermitDetailsDialog } from "./PermitDetailsDialog";

interface Permit {
  id: string;
  permit_number: string | null;
  project_name: string;
  builder_name: string | null;
  city: string;
  state: string;
  num_units: number | null;
  estimated_value: number | null;
  filed_date: string | null;
  status: string | null;
  is_matched_to_company: boolean;
  is_high_value: boolean;
  builder_company: any;
}

interface PermitTableProps {
  permits: Permit[];
  onRefetch: () => void;
}

export const PermitTable = ({ permits, onRefetch }: PermitTableProps) => {
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [sortField, setSortField] = useState<keyof Permit | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof Permit) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPermits = useMemo(() => {
    if (!sortField) return permits;

    return [...permits].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [permits, sortField, sortDirection]);

  const renderSortIcon = (field: keyof Permit) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 ml-1" /> : 
      <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const SortableHeader = ({ field, children }: { field: keyof Permit; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        {renderSortIcon(field)}
      </div>
    </TableHead>
  );

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="project_name">Project</SortableHeader>
              <SortableHeader field="builder_name">Builder</SortableHeader>
              <SortableHeader field="city">Location</SortableHeader>
              <SortableHeader field="num_units">Units</SortableHeader>
              <SortableHeader field="estimated_value">Value</SortableHeader>
              <SortableHeader field="filed_date">Filed Date</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPermits.map((permit) => (
              <TableRow key={permit.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{permit.project_name}</div>
                    {permit.permit_number && (
                      <div className="text-xs text-muted-foreground">
                        #{permit.permit_number}
                      </div>
                    )}
                    {permit.is_high_value && (
                      <Badge variant="destructive" className="text-xs">
                        High Value
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {permit.builder_company ? (
                      <>
                        <div className="font-medium">{permit.builder_company.company_name}</div>
                        <Badge variant="secondary" className="text-xs">
                          Matched
                        </Badge>
                      </>
                    ) : (
                      <>
                        <div>{permit.builder_name || 'Unknown'}</div>
                        <Badge variant="outline" className="text-xs">
                          Unmatched
                        </Badge>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{permit.city}, {permit.state}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    <span>{permit.num_units || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{formatCurrency(permit.estimated_value)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{formatDate(permit.filed_date)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {permit.status && (
                    <Badge variant="outline">{permit.status}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPermit(permit)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedPermit && (
        <PermitDetailsDialog
          permit={selectedPermit}
          open={!!selectedPermit}
          onOpenChange={(open) => !open && setSelectedPermit(null)}
          onUpdate={onRefetch}
        />
      )}
    </>
  );
};
