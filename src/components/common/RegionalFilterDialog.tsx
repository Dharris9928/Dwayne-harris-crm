import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPin, X } from "lucide-react";

interface RegionalFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: RegionalFilters) => void;
  initialFilters?: RegionalFilters;
}

export interface RegionalFilters {
  filterType: 'region' | 'state' | 'metro' | 'city';
  regions?: string[];
  states?: string[];
  metros?: string[];
  cities?: string[];
}

const REGIONS = {
  West: {
    color: 'bg-purple-500',
    states: ['CA', 'OR', 'WA', 'NV', 'AZ', 'UT', 'ID', 'MT', 'WY', 'CO', 'NM', 'AK', 'HI']
  },
  Central: {
    color: 'bg-red-500',
    states: ['TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'MN', 'IA', 'MO', 'AR', 'LA', 'WI', 'IL', 'IN', 'MI', 'OH']
  },
  Northeast: {
    color: 'bg-blue-500',
    states: ['PA', 'NY', 'NJ', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME', 'DE', 'MD', 'WV', 'VA']
  },
  Southeast: {
    color: 'bg-green-500',
    states: ['KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS']
  }
};

const MAJOR_METROS = [
  'Atlanta', 'Austin', 'Boston', 'Charlotte', 'Chicago', 'Dallas', 'Denver', 'Houston',
  'Los Angeles', 'Miami', 'Minneapolis', 'New York', 'Philadelphia', 'Phoenix',
  'Portland', 'San Diego', 'San Francisco', 'Seattle', 'Washington DC'
];

export const RegionalFilterDialog = ({ 
  open, 
  onOpenChange, 
  onApplyFilters,
  initialFilters 
}: RegionalFilterDialogProps) => {
  const [filterType, setFilterType] = useState<RegionalFilters['filterType']>(
    initialFilters?.filterType || 'region'
  );
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initialFilters?.regions || []);
  const [selectedStates, setSelectedStates] = useState<string[]>(initialFilters?.states || []);
  const [selectedMetros, setSelectedMetros] = useState<string[]>(initialFilters?.metros || []);

  const handleRegionToggle = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const handleStateToggle = (state: string) => {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  const handleMetroToggle = (metro: string) => {
    setSelectedMetros(prev =>
      prev.includes(metro) ? prev.filter(m => m !== metro) : [...prev, metro]
    );
  };

  const handleApply = () => {
    onApplyFilters({
      filterType,
      regions: filterType === 'region' ? selectedRegions : undefined,
      states: filterType === 'state' ? selectedStates : undefined,
      metros: filterType === 'metro' ? selectedMetros : undefined,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedRegions([]);
    setSelectedStates([]);
    setSelectedMetros([]);
    onApplyFilters({
      filterType: 'region',
      regions: [],
      states: [],
      metros: []
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Regional Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filter Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Search By</Label>
            <RadioGroup value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="region" id="region" />
                  <Label htmlFor="region" className="cursor-pointer flex-1">Region</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="state" id="state" />
                  <Label htmlFor="state" className="cursor-pointer flex-1">State</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="metro" id="metro" />
                  <Label htmlFor="metro" className="cursor-pointer flex-1">Metro Area</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer opacity-50">
                  <RadioGroupItem value="city" id="city" disabled />
                  <Label htmlFor="city" className="cursor-pointer flex-1">City (Coming Soon)</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Region Selection */}
          {filterType === 'region' && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Regions</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(REGIONS).map(([region, data]) => (
                  <div
                    key={region}
                    className={`flex items-center space-x-3 border rounded-lg p-4 hover:bg-accent cursor-pointer ${
                      selectedRegions.includes(region) ? 'border-primary bg-accent' : ''
                    }`}
                    onClick={() => handleRegionToggle(region)}
                  >
                    <Checkbox
                      checked={selectedRegions.includes(region)}
                      onCheckedChange={() => handleRegionToggle(region)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${data.color}`} />
                        <span className="font-medium">{region}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {data.states.length} states
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* State Selection */}
          {filterType === 'state' && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Select States</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(REGIONS).map(([region, data]) => (
                  <div key={region} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <div className={`w-2 h-2 rounded-full ${data.color}`} />
                      {region}
                    </div>
                    {data.states.map(state => (
                      <div
                        key={state}
                        className={`flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer ${
                          selectedStates.includes(state) ? 'bg-accent' : ''
                        }`}
                        onClick={() => handleStateToggle(state)}
                      >
                        <Checkbox
                          checked={selectedStates.includes(state)}
                          onCheckedChange={() => handleStateToggle(state)}
                        />
                        <span className="text-sm">{state}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metro Area Selection */}
          {filterType === 'metro' && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Metro Areas</Label>
              <div className="grid grid-cols-2 gap-2">
                {MAJOR_METROS.map(metro => (
                  <div
                    key={metro}
                    className={`flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer ${
                      selectedMetros.includes(metro) ? 'border-primary bg-accent' : ''
                    }`}
                    onClick={() => handleMetroToggle(metro)}
                  >
                    <Checkbox
                      checked={selectedMetros.includes(metro)}
                      onCheckedChange={() => handleMetroToggle(metro)}
                    />
                    <span>{metro}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {(selectedRegions.length > 0 || selectedStates.length > 0 || selectedMetros.length > 0) && (
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold mb-2 block">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {selectedRegions.map(region => (
                  <Badge key={region} variant="secondary">
                    {region}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleRegionToggle(region)} />
                  </Badge>
                ))}
                {selectedStates.map(state => (
                  <Badge key={state} variant="secondary">
                    {state}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleStateToggle(state)} />
                  </Badge>
                ))}
                {selectedMetros.map(metro => (
                  <Badge key={metro} variant="secondary">
                    {metro}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleMetroToggle(metro)} />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};