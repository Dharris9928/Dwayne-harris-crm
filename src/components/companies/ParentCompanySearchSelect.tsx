import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface ParentCompanySearchSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  excludeCompanyId?: string;
}

export function ParentCompanySearchSelect({ 
  value, 
  onValueChange,
  excludeCompanyId 
}: ParentCompanySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Fetch selected company
  const { data: selectedCompany } = useQuery({
    queryKey: ['parent-company', value],
    queryFn: async () => {
      if (!value) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, company_type')
        .eq('id', value)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!value,
  });

  // Fetch companies for search
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['parent-companies-search', debouncedSearch, excludeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('id, company_name, company_type')
        .or('company_type.eq.parent,company_type.eq.standalone')
        .order('company_name');

      if (excludeCompanyId) {
        query = query.neq('id', excludeCompanyId);
      }

      if (debouncedSearch) {
        query = query.ilike('company_name', `%${debouncedSearch}%`);
      }

      // Limit results for performance
      query = query.limit(50);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCompany ? (
            <span className="truncate">
              {selectedCompany.company_name}
              {selectedCompany.company_type === 'parent' && (
                <span className="text-xs text-muted-foreground ml-2">(Parent)</span>
              )}
            </span>
          ) : (
            'Select parent company...'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search companies..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Loading...' : 'No company found.'}
            </CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === company.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{company.company_name}</span>
                    {company.company_type === 'parent' && (
                      <span className="text-xs text-muted-foreground">(Parent Company)</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
