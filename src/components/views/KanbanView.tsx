import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Building2, MapPin, Phone, Mail, Calendar } from 'lucide-react';

interface KanbanViewProps {
  data: any[];
  onUpdate: (id: string, updates: any) => Promise<void>;
  stackByField: string; // 'status', 'priority_tier', 'segment', etc.
  cardFields?: string[]; // Fields to display on each card
}

const STATUS_COLUMNS = [
  { id: 'Lead', label: 'Lead', color: 'bg-muted' },
  { id: 'Contacted', label: 'Contacted', color: 'bg-[hsl(var(--status-lead)/0.2)]' },
  { id: 'Engaged', label: 'Engaged', color: 'bg-[hsl(var(--status-engaged)/0.2)]' },
  { id: 'Pilot', label: 'Pilot', color: 'bg-[hsl(var(--status-pilot)/0.2)]' },
  { id: 'Active', label: 'Active', color: 'bg-[hsl(var(--status-active)/0.2)]' },
  { id: 'Inactive', label: 'Inactive', color: 'bg-muted' },
  { id: 'Lost', label: 'Lost', color: 'bg-[hsl(var(--status-lost)/0.2)]' },
];

export function KanbanView({ 
  data, 
  onUpdate, 
  stackByField = 'status',
  cardFields = ['lead_score', 'priority_tier', 'state', 'last_contact_date']
}: KanbanViewProps) {
  const [columns, setColumns] = useState<Record<string, any[]>>({});

  useEffect(() => {
    organizeIntoColumns();
  }, [data, stackByField]);

  const organizeIntoColumns = () => {
    const organized: Record<string, any[]> = {};
    
    STATUS_COLUMNS.forEach(col => {
      organized[col.id] = [];
    });

    data.forEach(item => {
      const columnKey = item[stackByField] || 'Lead';
      if (organized[columnKey]) {
        organized[columnKey].push(item);
      }
    });

    setColumns(organized);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Update the item's status
    const newStatus = destination.droppableId;
    await onUpdate(draggableId, { [stackByField]: newStatus });

    // Optimistic UI update
    const newColumns = { ...columns };
    const sourceItems = [...newColumns[source.droppableId]];
    const destItems = source.droppableId === destination.droppableId 
      ? sourceItems 
      : [...newColumns[destination.droppableId]];

    const [movedItem] = sourceItems.splice(source.index, 1);
    movedItem[stackByField] = newStatus;

    if (source.droppableId === destination.droppableId) {
      sourceItems.splice(destination.index, 0, movedItem);
      newColumns[source.droppableId] = sourceItems;
    } else {
      destItems.splice(destination.index, 0, movedItem);
      newColumns[source.droppableId] = sourceItems;
      newColumns[destination.droppableId] = destItems;
    }

    setColumns(newColumns);
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
        {STATUS_COLUMNS.map(column => (
          <div key={column.id} className="flex-shrink-0 w-80">
            <div className={`${column.color} rounded-t-lg p-3 border-b-2 border-border`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{column.label}</h3>
                <Badge variant="secondary">{columns[column.id]?.length || 0}</Badge>
              </div>
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`
                    bg-muted/50 rounded-b-lg p-2 space-y-2 min-h-[200px]
                    ${snapshot.isDraggingOver ? 'bg-accent' : ''}
                  `}
                  style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
                >
                  {columns[column.id]?.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`
                            cursor-move hover:shadow-lg transition-shadow
                            ${snapshot.isDragging ? 'shadow-xl rotate-2' : ''}
                          `}
                        >
                          <CardHeader className="p-3 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm leading-tight truncate">
                                    {item.company_name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.industry_type}
                                  </p>
                                </div>
                              </div>
                              {cardFields.includes('lead_score') && (
                                <div className="text-right flex-shrink-0">
                                  <div className="text-lg font-bold text-primary">
                                    {item.lead_score || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Score</div>
                                </div>
                              )}
                            </div>
                          </CardHeader>

                          <CardContent className="p-3 pt-0 space-y-2">
                            {/* Priority Tier */}
                            {cardFields.includes('priority_tier') && item.priority_tier && (
                              <Badge
                                variant={getPriorityVariant(item.priority_tier)}
                                className="text-xs"
                              >
                                {item.priority_tier}
                              </Badge>
                            )}

                            {/* Location */}
                            {cardFields.includes('state') && (item.city || item.state) && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {item.city && item.state ? `${item.city}, ${item.state}` : item.state}
                                </span>
                              </div>
                            )}

                            {/* Contact Info */}
                            {item.primary_phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{item.primary_phone}</span>
                              </div>
                            )}

                            {item.primary_email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{item.primary_email}</span>
                              </div>
                            )}

                            {/* Last Contact */}
                            {cardFields.includes('last_contact_date') && item.last_contact_date && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Last contact {formatDistanceToNow(new Date(item.last_contact_date), { addSuffix: true })}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
