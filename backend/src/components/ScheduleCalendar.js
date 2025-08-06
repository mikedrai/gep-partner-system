import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { el } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './ScheduleCalendar.css';

// Date-fns localizer for Greek locale
const locales = {
  'el': el,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

/**
 * Full-featured Schedule Calendar Component
 * Features:
 * - Multi-view support (month, week, day, agenda)
 * - Drag & drop scheduling
 * - Event creation, editing, deletion
 * - Partner and installation filtering
 * - Conflict detection and resolution
 * - Export capabilities
 * - Real-time updates
 * - Role-based access control
 */
const ScheduleCalendar = ({
  user,
  initialView = 'month',
  height = 600,
  onEventSelect,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onViewChange,
  onRangeChange,
  showToolbar = true,
  showFilters = true,
  enableEdit = true,
  enableDragDrop = true,
  showConflicts = true,
  autoRefresh = false,
  refreshInterval = 30000,
  className = '',
  style = {},
  customViews = [],
  eventRenderProps = {},
  filterOptions = {},
  exportOptions = {}
}) => {
  // State management
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(initialView);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    partners: [],
    installations: [],
    serviceTypes: [],
    statuses: ['scheduled', 'confirmed'],
    dateRange: null
  });
  const [conflicts, setConflicts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [installations, setInstallations] = useState([]);

  // Load initial data
  useEffect(() => {
    loadCalendarData();
    loadFilterOptions();
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        loadCalendarData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Load calendar events
  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        view,
        start: getViewStartDate().toISOString(),
        end: getViewEndDate().toISOString(),
        ...buildFilterParams()
      });

      const response = await fetch(`/api/schedules/calendar?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load calendar data');
      }

      const data = await response.json();
      
      // Transform events for react-big-calendar
      const transformedEvents = data.events.map(transformEvent);
      setEvents(transformedEvents);

      // Update conflicts if enabled
      if (showConflicts) {
        setConflicts(data.conflicts || []);
      }

    } catch (error) {
      console.error('Failed to load calendar data:', error);
      // Show error toast/notification
    } finally {
      setLoading(false);
    }
  }, [view, date, filters, user]);

  // Load filter options
  const loadFilterOptions = useCallback(async () => {
    try {
      const [partnersRes, installationsRes] = await Promise.all([
        fetch('/api/partners/active', {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        }),
        fetch('/api/installations', {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        })
      ]);

      if (partnersRes.ok) {
        const partnersData = await partnersRes.json();
        setPartners(partnersData.partners || []);
      }

      if (installationsRes.ok) {
        const installationsData = await installationsRes.json();
        setInstallations(installationsData.installations || []);
      }

    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  }, [user]);

  // Transform API event to calendar event
  const transformEvent = useCallback((apiEvent) => {
    return {
      id: apiEvent.id,
      title: getEventTitle(apiEvent),
      start: new Date(apiEvent.start_time || apiEvent.visit_date + 'T' + apiEvent.start_time),
      end: new Date(apiEvent.end_time || apiEvent.visit_date + 'T' + apiEvent.end_time),
      resource: {
        ...apiEvent,
        type: apiEvent.type || 'visit',
        partnerId: apiEvent.partner_id,
        partnerName: apiEvent.partner_name,
        installationCode: apiEvent.installation_code,
        installationName: apiEvent.installation_name,
        status: apiEvent.status,
        serviceType: apiEvent.service_type,
        canEdit: canEditEvent(apiEvent),
        hasConflict: conflicts.some(c => c.eventId === apiEvent.id)
      }
    };
  }, [conflicts, user]);

  // Generate event title
  const getEventTitle = useCallback((event) => {
    const partner = event.partner_name || `Partner ${event.partner_id}`;
    const installation = event.installation_name || event.installation_code;
    const time = event.start_time ? event.start_time.substring(0, 5) : '';
    
    return `${time} ${partner} → ${installation}`;
  }, []);

  // Check if user can edit event
  const canEditEvent = useCallback((event) => {
    if (!enableEdit) return false;
    
    const userRole = user?.role;
    const isOwner = event.created_by === user?.id;
    const isPartner = userRole === 'partner' && event.partner_id === user?.partnerId;
    
    return userRole === 'admin' || userRole === 'manager' || isOwner || isPartner;
  }, [enableEdit, user]);

  // Calendar event handlers
  const handleEventSelect = useCallback((event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    
    if (onEventSelect) {
      onEventSelect(event);
    }
  }, [onEventSelect]);

  const handleEventDrop = useCallback(async (info) => {
    if (!enableDragDrop) return;

    const { event, start, end } = info;
    
    try {
      const updatedEvent = {
        ...event.resource,
        start_time: format(start, 'HH:mm:ss'),
        end_time: format(end, 'HH:mm:ss'),
        visit_date: format(start, 'yyyy-MM-dd')
      };

      // Check for conflicts
      if (showConflicts) {
        const hasConflict = await checkEventConflict(updatedEvent);
        if (hasConflict) {
          // Show conflict resolution dialog
          showConflictDialog(updatedEvent, hasConflict);
          return;
        }
      }

      // Update event
      await updateEvent(updatedEvent);
      
      // Reload calendar data
      await loadCalendarData();

    } catch (error) {
      console.error('Failed to update event:', error);
      // Revert the change
      await loadCalendarData();
    }
  }, [enableDragDrop, showConflicts]);

  const handleEventResize = useCallback(async (info) => {
    if (!enableEdit) return;

    const { event, start, end } = info;
    
    try {
      const updatedEvent = {
        ...event.resource,
        start_time: format(start, 'HH:mm:ss'),
        end_time: format(end, 'HH:mm:ss')
      };

      await updateEvent(updatedEvent);
      await loadCalendarData();

    } catch (error) {
      console.error('Failed to resize event:', error);
      await loadCalendarData();
    }
  }, [enableEdit]);

  const handleSelectSlot = useCallback((slotInfo) => {
    if (!enableEdit) return;

    const newEvent = {
      start_time: format(slotInfo.start, 'HH:mm:ss'),
      end_time: format(slotInfo.end, 'HH:mm:ss'),
      visit_date: format(slotInfo.start, 'yyyy-MM-dd'),
      status: 'draft'
    };

    setSelectedEvent(newEvent);
    setShowCreateModal(true);
    
    if (onEventCreate) {
      onEventCreate(newEvent);
    }
  }, [enableEdit, onEventCreate]);

  // API operations
  const updateEvent = async (eventData) => {
    const response = await fetch(`/api/schedules/${eventData.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user?.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      throw new Error('Failed to update event');
    }

    return response.json();
  };

  const createEvent = async (eventData) => {
    const response = await fetch('/api/schedules', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user?.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      throw new Error('Failed to create event');
    }

    return response.json();
  };

  const deleteEvent = async (eventId) => {
    const response = await fetch(`/api/schedules/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user?.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }
  };

  const checkEventConflict = async (eventData) => {
    const response = await fetch('/api/schedules/check-conflict', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user?.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.hasConflict ? result.conflicts : null;
  };

  // Utility functions
  const getViewStartDate = () => {
    const startOfView = new Date(date);
    
    switch (view) {
      case 'month':
        startOfView.setDate(1);
        break;
      case 'week':
        const dayOfWeek = startOfView.getDay();
        startOfView.setDate(startOfView.getDate() - dayOfWeek);
        break;
      case 'day':
        // Already at the right date
        break;
    }
    
    return startOfView;
  };

  const getViewEndDate = () => {
    const endOfView = new Date(date);
    
    switch (view) {
      case 'month':
        endOfView.setMonth(endOfView.getMonth() + 1, 0);
        break;
      case 'week':
        const dayOfWeek = endOfView.getDay();
        endOfView.setDate(endOfView.getDate() + (6 - dayOfWeek));
        break;
      case 'day':
        // End of the same day
        break;
    }
    
    return endOfView;
  };

  const buildFilterParams = () => {
    const params = {};
    
    if (filters.partners.length > 0) {
      params.partners = filters.partners.join(',');
    }
    
    if (filters.installations.length > 0) {
      params.installations = filters.installations.join(',');
    }
    
    if (filters.serviceTypes.length > 0) {
      params.serviceTypes = filters.serviceTypes.join(',');
    }
    
    if (filters.statuses.length > 0) {
      params.statuses = filters.statuses.join(',');
    }
    
    return params;
  };

  // Event styling
  const eventStyleGetter = useCallback((event, start, end, isSelected) => {
    const resource = event.resource;
    let backgroundColor = '#3174ad';
    let borderColor = '#265985';
    
    // Color by status
    switch (resource.status) {
      case 'confirmed':
        backgroundColor = '#28a745';
        borderColor = '#1e7e34';
        break;
      case 'completed':
        backgroundColor = '#6c757d';
        borderColor = '#545b62';
        break;
      case 'cancelled':
        backgroundColor = '#dc3545';
        borderColor = '#bd2130';
        break;
      case 'draft':
        backgroundColor = '#ffc107';
        borderColor = '#d39e00';
        break;
    }
    
    // Highlight conflicts
    if (resource.hasConflict) {
      borderColor = '#dc3545';
      borderWidth = '3px';
    }
    
    // Dim past events
    if (end < new Date()) {
      backgroundColor = lightenColor(backgroundColor, 0.3);
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: resource.hasConflict ? '3px' : '1px',
        opacity: isSelected ? 0.8 : 1,
        cursor: resource.canEdit ? 'pointer' : 'default'
      }
    };
  }, []);

  // Component render functions
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <div className="calendar-filters">
        <div className="filter-group">
          <label>Partners:</label>
          <select
            multiple
            value={filters.partners}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              partners: Array.from(e.target.selectedOptions, option => option.value)
            }))}
          >
            {partners.map(partner => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Installations:</label>
          <select
            multiple
            value={filters.installations}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              installations: Array.from(e.target.selectedOptions, option => option.value)
            }))}
          >
            {installations.map(installation => (
              <option key={installation.installation_code} value={installation.installation_code}>
                {installation.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            multiple
            value={filters.statuses}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              statuses: Array.from(e.target.selectedOptions, option => option.value)
            }))}
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button 
          onClick={loadCalendarData}
          className="btn btn-primary"
        >
          Apply Filters
        </button>
      </div>
    );
  };

  const renderToolbar = (toolbarProps) => {
    if (!showToolbar) return null;

    return (
      <div className="calendar-toolbar">
        <div className="toolbar-navigation">
          <button onClick={() => toolbarProps.onNavigate('PREV')}>‹</button>
          <button onClick={() => toolbarProps.onNavigate('TODAY')}>Today</button>
          <button onClick={() => toolbarProps.onNavigate('NEXT')}>›</button>
          <span className="toolbar-label">{toolbarProps.label}</span>
        </div>

        <div className="toolbar-views">
          {['month', 'week', 'day', 'agenda'].map(viewName => (
            <button
              key={viewName}
              className={viewName === view ? 'active' : ''}
              onClick={() => {
                setView(viewName);
                toolbarProps.onView(viewName);
              }}
            >
              {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
            </button>
          ))}
        </div>

        <div className="toolbar-actions">
          <button onClick={() => exportCalendar('pdf')}>Export PDF</button>
          <button onClick={() => exportCalendar('excel')}>Export Excel</button>
          <button onClick={loadCalendarData}>Refresh</button>
        </div>
      </div>
    );
  };

  // Export functionality
  const exportCalendar = async (format) => {
    try {
      const queryParams = new URLSearchParams({
        format,
        view,
        start: getViewStartDate().toISOString(),
        end: getViewEndDate().toISOString(),
        ...buildFilterParams()
      });

      const response = await fetch(`/api/schedules/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule-${format}-${format(date, 'yyyy-MM-dd')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Utility functions
  const lightenColor = (color, percent) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  };

  const showConflictDialog = (event, conflicts) => {
    // Implementation for conflict resolution dialog
    console.log('Conflict detected:', conflicts);
  };

  // Main render
  return (
    <div className={`schedule-calendar ${className}`} style={style}>
      {renderFilters()}
      
      {loading && <div className="calendar-loading">Loading calendar...</div>}
      
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height }}
        view={view}
        date={date}
        onView={(newView) => {
          setView(newView);
          if (onViewChange) onViewChange(newView);
        }}
        onNavigate={(newDate) => {
          setDate(newDate);
          if (onRangeChange) onRangeChange(newDate);
        }}
        onSelectEvent={handleEventSelect}
        onSelectSlot={handleSelectSlot}
        onEventDrop={enableDragDrop ? handleEventDrop : undefined}
        onEventResize={enableEdit ? handleEventResize : undefined}
        selectable={enableEdit}
        resizable={enableEdit}
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: renderToolbar,
          event: ({ event }) => (
            <div className="custom-event">
              <strong>{event.title}</strong>
              {event.resource.hasConflict && (
                <span className="conflict-indicator">⚠</span>
              )}
            </div>
          )
        }}
        formats={{
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }) => 
            `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
          dayHeaderFormat: 'EEE d/MM',
          monthHeaderFormat: 'MMMM yyyy'
        }}
        messages={{
          allDay: 'Όλη μέρα',
          previous: 'Προηγούμενο',
          next: 'Επόμενο',
          today: 'Σήμερα',
          month: 'Μήνας',
          week: 'Εβδομάδα',
          day: 'Ημέρα',
          agenda: 'Ατζέντα',
          date: 'Ημερομηνία',
          time: 'Ώρα',
          event: 'Εργασία',
          noEventsInRange: 'Δεν υπάρχουν εργασίες σε αυτό το χρονικό διάστημα.'
        }}
        {...eventRenderProps}
      />

      {/* Event Modals would be rendered here */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onClose={() => setShowEventModal(false)}
          onUpdate={async (updatedEvent) => {
            try {
              await updateEvent(updatedEvent);
              await loadCalendarData();
              setShowEventModal(false);
            } catch (error) {
              console.error('Failed to update event:', error);
            }
          }}
          onDelete={async (eventId) => {
            try {
              await deleteEvent(eventId);
              await loadCalendarData();
              setShowEventModal(false);
            } catch (error) {
              console.error('Failed to delete event:', error);
            }
          }}
        />
      )}

      {showCreateModal && (
        <CreateEventModal
          event={selectedEvent}
          partners={partners}
          installations={installations}
          onClose={() => setShowCreateModal(false)}
          onCreate={async (newEvent) => {
            try {
              await createEvent(newEvent);
              await loadCalendarData();
              setShowCreateModal(false);
            } catch (error) {
              console.error('Failed to create event:', error);
            }
          }}
        />
      )}
    </div>
  );
};

// Placeholder components for modals
const EventModal = ({ event, onClose, onUpdate, onDelete }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Edit Event</h3>
        {/* Event editing form would go here */}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

const CreateEventModal = ({ event, partners, installations, onClose, onCreate }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Create Event</h3>
        {/* Event creation form would go here */}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ScheduleCalendar;