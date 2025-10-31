import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface FieldMapping {
  csvColumn: string;
  crmField: string;
  confidence: number;
  parseStrategy: string;
  notes?: string;
}

interface ParsedRow {
  rowIndex: number;
  parsedData: any;
  confidence: number;
  warnings: string[];
  detectedIndustry?: string;
  accepted: boolean;
}

interface AIImportReviewStepProps {
  fieldMappings: FieldMapping[];
  parsedRows: ParsedRow[];
  onUpdateRows: (rows: ParsedRow[]) => void;
  overallConfidence: number;
  recommendations: string[];
  onImport: () => void;
  onBack: () => void;
}

export function AIImportReviewStep({
  fieldMappings,
  parsedRows,
  onUpdateRows,
  overallConfidence,
  recommendations,
  onImport,
  onBack
}: AIImportReviewStepProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'warnings'>('all');
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; field: string } | null>(null);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return <Badge className="bg-green-500">High {confidence}%</Badge>;
    if (confidence >= 70) return <Badge className="bg-yellow-500">Medium {confidence}%</Badge>;
    return <Badge variant="destructive">Low {confidence}%</Badge>;
  };

  const filteredRows = parsedRows.filter(row => {
    if (filterMode === 'low') return row.confidence < 70;
    if (filterMode === 'warnings') return row.warnings.length > 0;
    return true;
  });

  const acceptedCount = parsedRows.filter(r => r.accepted).length;
  const highQuality = parsedRows.filter(r => r.confidence >= 90).length;
  const mediumQuality = parsedRows.filter(r => r.confidence >= 70 && r.confidence < 90).length;
  const lowQuality = parsedRows.filter(r => r.confidence < 70).length;
  const withWarnings = parsedRows.filter(r => r.warnings.length > 0).length;

  const handleCellEdit = (rowIdx: number, field: string, value: string) => {
    const updated = [...parsedRows];
    updated[rowIdx].parsedData[field] = value;
    onUpdateRows(updated);
    setEditingCell(null);
  };

  const toggleRowAccepted = (rowIdx: number) => {
    const updated = [...parsedRows];
    updated[rowIdx].accepted = !updated[rowIdx].accepted;
    onUpdateRows(updated);
  };

  const acceptAllHighConfidence = () => {
    const updated = parsedRows.map(row => ({
      ...row,
      accepted: row.confidence >= 90
    }));
    onUpdateRows(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Overall Confidence</p>
          <div className="mt-2">{getConfidenceBadge(overallConfidence)}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">High Quality</p>
          <p className="text-2xl font-bold text-green-600">{highQuality}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">Needs Review</p>
          <p className="text-2xl font-bold text-yellow-600">{lowQuality}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">With Warnings</p>
          <p className="text-2xl font-bold text-destructive">{withWarnings}</p>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            AI Recommendations
          </h4>
          <ul className="text-sm space-y-1">
            {recommendations.map((rec, idx) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs for Field Mappings and Data Review */}
      <Tabs defaultValue="data" className="w-full">
        <TabsList>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
          <TabsTrigger value="data">Review Data ({acceptedCount} selected)</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="space-y-4">
          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-4 space-y-2">
              {fieldMappings.map((mapping, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">"{mapping.csvColumn}" → {mapping.crmField}</p>
                      {mapping.notes && <p className="text-xs text-muted-foreground">{mapping.notes}</p>}
                    </div>
                  </div>
                  {getConfidenceBadge(mapping.confidence)}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={filterMode === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterMode('all')}
              >
                All Rows ({parsedRows.length})
              </Button>
              <Button 
                size="sm" 
                variant={filterMode === 'low' ? 'default' : 'outline'}
                onClick={() => setFilterMode('low')}
              >
                Low Confidence ({lowQuality})
              </Button>
              <Button 
                size="sm" 
                variant={filterMode === 'warnings' ? 'default' : 'outline'}
                onClick={() => setFilterMode('warnings')}
              >
                With Warnings ({withWarnings})
              </Button>
            </div>
            <Button size="sm" onClick={acceptAllHighConfidence}>
              Accept All High Confidence
            </Button>
          </div>

          {/* Data Table */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Confidence</TableHead>
                  {fieldMappings.slice(0, 5).map(m => (
                    <TableHead key={m.crmField}>{m.crmField}</TableHead>
                  ))}
                  <TableHead>Warnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.rowIndex} className={!row.accepted ? 'opacity-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={row.accepted}
                        onCheckedChange={() => toggleRowAccepted(row.rowIndex)}
                      />
                    </TableCell>
                    <TableCell>{row.rowIndex + 1}</TableCell>
                    <TableCell>{getConfidenceBadge(row.confidence)}</TableCell>
                    {fieldMappings.slice(0, 5).map(m => (
                      <TableCell key={m.crmField} className="max-w-[200px]">
                        {editingCell?.rowIdx === row.rowIndex && editingCell?.field === m.crmField ? (
                          <Input
                            defaultValue={row.parsedData[m.crmField] || ''}
                            onBlur={(e) => handleCellEdit(row.rowIndex, m.crmField, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCellEdit(row.rowIndex, m.crmField, e.currentTarget.value);
                              }
                            }}
                            autoFocus
                            className="h-8"
                          />
                        ) : (
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                            onClick={() => setEditingCell({ rowIdx: row.rowIndex, field: m.crmField })}
                          >
                            <span className="truncate">{row.parsedData[m.crmField] || '-'}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      {row.warnings.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {row.warnings.length} warning(s)
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onImport} disabled={acceptedCount === 0}>
          Import {acceptedCount} Record(s)
        </Button>
      </div>
    </div>
  );
}
