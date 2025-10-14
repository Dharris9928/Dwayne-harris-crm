import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractorSearchSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
}

export function ContractorSearchSelect({ value, onValueChange }: ContractorSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: contractors, isLoading } = useQuery({
    queryKey: ['contractors-search', search],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('id, company_name, industry_type')
        .or('industry_type.eq.HVAC,industry_type.eq.Plumbing,industry_type.eq.Electrical,industry_type.eq.General Contractor,industry_type.eq.Home Builder')
        .order('company_name');

      if (search) {
        query = query.ilike('company_name', `%${search}%`);
      }

      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const selectedContractor = contractors?.find((c: any) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedContractor ? selectedContractor.company_name : "Select contractor..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search contractors..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>
            {isLoading ? "Loading..." : "No contractor found."}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {contractors?.map((contractor: any) => (
              <CommandItem
                key={contractor.id}
                value={contractor.id}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === contractor.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{contractor.company_name}</span>
                  {contractor.industry_type && (
                    <span className="text-xs text-muted-foreground">
                      {contractor.industry_type}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
