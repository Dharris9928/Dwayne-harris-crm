import { useState } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  activities: any[];
  onSelectEvent?: (event: any) => void;
  onSelectSlot?: (slotInfo: any) => void;
}

const ACTIVITY_TYPE_COLORS = {
  'Email': 'hsl(var(--status-lead))',
  'Phone': 'hsl(var(--status-contacted))',
  'LinkedIn': 'hsl(217, 91%, 60%)',
  'Meeting': 'hsl(var(--status-engaged))',
  'Demo': 'hsl(var(--status-pilot))',
  'Follow-up': 'hsl(var(--primary))',
  'Other': 'hsl(var(--secondary))',
};

export function CalendarView({ activities, onSelectEvent, onSelectSlot }: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<View>('month');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const events = activities.map(activity => ({
    id: activity.id,
    title: activity.subject || `${activity.activity_type} - ${activity.company?.company_name || 'No Company'}`,
    start: new Date(activity.scheduled_date),
    end: activity.duration_minutes 
      ? new Date(new Date(activity.scheduled_date).getTime() + activity.duration_minutes * 60000)
      : new Date(new Date(activity.scheduled_date).getTime() + 3600000), // Default 1 hour
    resource: activity,
  }));

  const eventStyleGetter = (event: any) => {
    const color = ACTIVITY_TYPE_COLORS[event.resource.activity_type as keyof typeof ACTIVITY_TYPE_COLORS] || 'hsl(var(--muted-foreground))';
    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        opacity: event.resource.status === 'Completed' ? 0.7 : 1,
        border: '0px',
        display: 'block',
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event.resource);
    if (onSelectEvent) onSelectEvent(event.resource);
  };

  return (
    <>
      <div className="h-[calc(100vh-200px)] bg-card p-4 rounded-lg border border-border">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          onView={setCurrentView}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={onSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          popup
          views={['month', 'week', 'day', 'agenda']}
        />
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent.subject || 'Activity Details'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-semibold">Type:</span>
                <Badge className="ml-2">{selectedEvent.activity_type}</Badge>
              </div>
              <div>
                <span className="text-sm font-semibold">Company:</span>
                <span className="ml-2">{selectedEvent.company?.company_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-sm font-semibold">Scheduled:</span>
                <span className="ml-2">
                  {format(new Date(selectedEvent.scheduled_date), 'PPpp')}
                </span>
              </div>
              {selectedEvent.notes && (
                <div>
                  <span className="text-sm font-semibold">Notes:</span>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedEvent.notes}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-semibold">Status:</span>
                <Badge variant={selectedEvent.status === 'Completed' ? 'default' : 'secondary'} className="ml-2">
                  {selectedEvent.status}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
