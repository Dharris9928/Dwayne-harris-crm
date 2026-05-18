import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

interface ImportJobQuotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ParsedRow = Record<string, string>;

const get = (row: ParsedRow, ...keys: string[]) => {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (h) => h.trim().toLowerCase() === k.trim().toLowerCase()
    );
    if (found && row[found] != null && String(row[found]).trim() !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
};

const parseDate = (s: string): string | null => {
  if (!s) return null;
  const clean = s.split(" ")[0];
  const m = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, mo, d, y] = m;
    const yr = y.length === 2 ? `20${y}` : y;
    return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(clean);
  return isNaN(dt.getTime()) ? null : dt.toISOString().split("T")[0];
};

const toInt = (s: string): number => {
  const n = parseInt((s || "").replace(/[^\d-]/g, ""), 10);
  return isNaN(n) ? 0 : n;
};

interface RowResult {
  quote_number: string | null;
  date_received: string;
  product: string | null;
  quantity: number;
  notes: string | null;
  comments: string | null;
  status: string;
}

function mapRow(row: ParsedRow): RowResult {
  const dateReceived =
    parseDate(get(row, "Date")) ||
    parseDate(get(row, "Created")) ||
    new Date().toISOString().split("T")[0];

  const p1 = get(row, "Product #1", "Product 1", "Product");
  const p2 = get(row, "Product #2", "Product 2");
  const product = [p1, p2].filter(Boolean).join(", ") || null;

  const qty =
    toInt(get(row, "Quantity")) +
    toInt(get(row, "Quantity (Product #2)", "Quantity 2"));

  const quoteNumber = get(row, "TSM Quote #", "TSM Quote#", "Quote #", "Quote Number") || null;
  const notes = get(row, "Notes") || null;

  const fields: Array<[string, string]> = [
    ["Submitter", get(row, "Name")],
    ["Project", get(row, "Project Name")],
    ["Job Type", get(row, "Job Type")],
    ["Location", get(row, "City, State, Zip")],
    ["Contact", get(row, "Your First & Last Name")],
    ["Phone", get(row, "Best Contact Phone Number")],
    ["Email", get(row, "Your Company Email Address")],
    ["TSM Rep", get(row, "My Google Nest Pro Rep")],
    ["Job Start", get(row, "Job Start Date")],
    ["Job End", get(row, "Job End Date")],
    ["Material Delivery", get(row, "Expected Material Delivery Date")],
    ["Nest Spec'd", get(row, "Is Google Nest Spec'd For This Project?")],
    ["TSM Account #", get(row, "Your TSM Account #")],
    ["Developer", get(row, "Developer")],
  ];
  const comments =
    fields
      .filter(([, v]) => v && !["n/a", "na"].includes(v.toLowerCase()))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n") || null;

  const rawStatus = (get(row, "Status") || "pending").toLowerCase();
  const status = rawStatus === "won" ? "won" : rawStatus === "lost" ? "lost" : "pending";

  return {
    quote_number: quoteNumber,
    date_received: dateReceived,
    product,
    quantity: qty > 0 ? qty : 1,
    notes,
    comments,
    status,
  };
}

export function ImportJobQuotesDialog({ open, onOpenChange }: ImportJobQuotesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    skippedNoQuote: number;
    failed: number;
  } | null>(null);

  const reset = () => {
    setFile(null);
    setIsImporting(false);
    setProgress({ current: 0, total: 0 });
    setResult(null);
  };

  const handleClose = (next: boolean) => {
    if (isImporting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const text = await file.text();
      const parsed = Papa.parse<ParsedRow>(text, {
        header: true,
        skipEmptyLines: true,
      });

      const rows = parsed.data.filter((r) => Object.values(r).some((v) => v && String(v).trim()));
      setProgress({ current: 0, total: rows.length });

      // Fetch existing quote numbers to detect updates
      const { data: existing } = await supabase
        .from("job_quotes")
        .select("id, quote_number")
        .not("quote_number", "is", null);
      const existingMap = new Map<string, string>();
      (existing || []).forEach((q: any) => {
        if (q.quote_number) existingMap.set(q.quote_number.trim().toLowerCase(), q.id);
      });

      let inserted = 0;
      let updated = 0;
      let skippedNoQuote = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i++) {
        setProgress({ current: i + 1, total: rows.length });
        try {
          const mapped = mapRow(rows[i]);

          if (mapped.quote_number) {
            const existingId = existingMap.get(mapped.quote_number.trim().toLowerCase());
            if (existingId) {
              const { error } = await supabase
                .from("job_quotes")
                .update({
                  date_received: mapped.date_received,
                  product: mapped.product,
                  quantity: mapped.quantity,
                  notes: mapped.notes,
                  comments: mapped.comments,
                  status: mapped.status,
                })
                .eq("id", existingId);
              if (error) throw error;
              updated++;
              continue;
            }
          } else {
            skippedNoQuote++;
          }

          const { error } = await supabase.from("job_quotes").insert({
            quote_number: mapped.quote_number,
            date_received: mapped.date_received,
            product: mapped.product,
            quantity: mapped.quantity,
            notes: mapped.notes,
            comments: mapped.comments,
            status: mapped.status,
            created_by: user.id,
          });
          if (error) throw error;
          inserted++;
        } catch (err: any) {
          console.error("Row import failed:", err, rows[i]);
          failed++;
        }
      }

      setResult({ inserted, updated, skippedNoQuote, failed });
      queryClient.invalidateQueries({ queryKey: ["job-quotes"] });
      toast({
        title: "Import complete",
        description: `${inserted} added, ${updated} updated${failed ? `, ${failed} failed` : ""}.`,
      });
    } catch (e: any) {
      toast({
        title: "Import failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
    >
      <DialogContent
        className="max-w-xl"
        onInteractOutside={(e) => isImporting && e.preventDefault()}
        onEscapeKeyDown={(e) => isImporting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Import Job Quotes from CSV</DialogTitle>
          <DialogDescription>
            Rows with a matching <strong>TSM Quote #</strong> will update existing quotes.
            Rows without a quote number, or with new numbers, will be added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV file</label>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={isImporting}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
              }}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              Expected columns: Name, Date, TSM Quote #, Product #1, Quantity,
              Product #2, Quantity (Product #2), Status, Notes, Job Type, Project Name,
              City/State/Zip, contact details, etc. Unknown columns are ignored.
            </AlertDescription>
          </Alert>

          {isImporting && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing {progress.current} of {progress.total}…
            </div>
          )}

          {result && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <div>✓ Added: <strong>{result.inserted}</strong></div>
                  <div>↻ Updated existing: <strong>{result.updated}</strong></div>
                  {result.skippedNoQuote > 0 && (
                    <div className="text-muted-foreground">
                      ⓘ {result.skippedNoQuote} row(s) had no TSM Quote # — added as new.
                    </div>
                  )}
                  {result.failed > 0 && (
                    <div className="text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Failed: {result.failed} (see console)
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isImporting}
            >
              {result ? "Close" : "Cancel"}
            </Button>
            <Button onClick={handleImport} disabled={!file || isImporting}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
