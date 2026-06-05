import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookmarkPlus, Bookmark, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SavedFilter {
  id: string;
  name: string;
  filters: any;
}

interface SavedFiltersProps {
  currentFilters: any;
  onApplyFilter: (filters: any) => void;
}

export function SavedFilters({ currentFilters, onApplyFilter }: SavedFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = () => {
    const saved = localStorage.getItem("companies-saved-filters");
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading saved filters:", error);
      }
    }
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this filter",
        variant: "destructive",
      });
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: currentFilters,
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem("companies-saved-filters", JSON.stringify(updated));

    toast({
      title: "Filter Saved",
      description: `"${filterName}" has been saved`,
    });

    setShowSaveDialog(false);
    setFilterName("");
  };

  const deleteFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem("companies-saved-filters", JSON.stringify(updated));

    toast({
      title: "Filter Deleted",
      description: "Saved filter has been removed",
    });
  };

  const hasActiveFilters = Object.keys(currentFilters).some(key => currentFilters[key]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Bookmark className="h-4 w-4 mr-2" />
            Saved Filters
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setShowSaveDialog(true)}
              disabled={!hasActiveFilters}
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Save Current Filter
            </Button>
          </div>

          {savedFilters.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-1">
                {savedFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent cursor-pointer group"
                  >
                    <span
                      className="text-sm flex-1"
                      onClick={() => onApplyFilter(filter.filters)}
                    >
                      {filter.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => deleteFilter(filter.id, e)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {savedFilters.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No saved filters yet
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>
              Give this filter combination a name so you can reuse it later
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="filter-name">Filter Name</Label>
            <Input
              id="filter-name"
              placeholder="e.g., High Priority Builders"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveCurrentFilter();
                }
              }}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveCurrentFilter}>Save Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
