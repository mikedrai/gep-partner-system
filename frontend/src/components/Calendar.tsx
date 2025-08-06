import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { schedulesApi } from '../services/supabaseApi.ts';


interface CalendarProps {
  view?: 'month' | 'week' | 'day';
}

const Calendar: React.FC<CalendarProps> = ({ view = 'month' }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get date range for current view
  const getDateRange = () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const { start, end } = getDateRange();

  // Fetch scheduled visits/events
  const { data: events = [], isLoading } = useQuery<any[]>(
    ['calendar-events', start, end],
    () => schedulesApi.getByDateRange(start, end),
    {
      select: (data) => {
        return data.map((visit: any) => ({
          id: visit.id,
          title: `${visit.schedules?.service_type || 'Visit'} - ${visit.schedules?.installations?.clients?.company_name || 'Unknown Client'}`,
          date: visit.visit_date,
          time: visit.start_time,
          type: visit.schedules?.service_type === 'occupational_doctor' ? 'inspection' : 'consultation',
          partner: visit.schedules?.partners?.name || 'Unknown Partner',
          client: visit.schedules?.installations?.clients?.company_name || 'Unknown Client',
          location: visit.schedules?.installations?.address || 'Unknown Location',
          status: visit.status || 'scheduled'
        }));
      }
    }
  );

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDateForComparison = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = events.filter(event => 
        event.date === date.toISOString().split('T')[0]
      );

      days.push({
        date: date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === currentDateForComparison.toDateString(),
        events: dayEvents
      });
    }
    
    return days;
  };

  const days = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getEventColor = (type: string, status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-800';
    if (status === 'cancelled') return 'bg-red-100 text-red-800';
    
    switch (type) {
      case 'inspection': return 'bg-blue-100 text-blue-800';
      case 'consultation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div
              key={index}
              className={`min-h-[100px] p-2 border rounded-md cursor-pointer hover:bg-gray-50 ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
              } ${
                day.isToday ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedDate(day.date)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium ${
                  day.isToday ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day.date.getDate()}
                </span>
                {day.events.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
                    {day.events.length}
                  </span>
                )}
              </div>
              
              {/* Events */}
              <div className="space-y-1">
                {day.events.slice(0, 2).map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className={`px-2 py-1 text-xs rounded-md truncate ${getEventColor(event.type, event.status)}`}
                    title={`${event.time} - ${event.title}`}
                  >
                    {event.time.slice(0, 5)} {event.client}
                  </div>
                ))}
                {day.events.length > 2 && (
                  <div className="text-xs text-gray-500 px-2">
                    +{day.events.length - 2} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Events for {selectedDate.toLocaleDateString()}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {events
                .filter(event => event.date === selectedDate.toISOString().split('T')[0])
                .map((event, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getEventColor(event.type, event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Time:</strong> {event.time}</p>
                      <p><strong>Partner:</strong> {event.partner}</p>
                      <p><strong>Location:</strong> {event.location}</p>
                    </div>
                  </div>
                ))}
              
              {events.filter(event => event.date === selectedDate.toISOString().split('T')[0]).length === 0 && (
                <p className="text-gray-500 text-center py-8">No events scheduled for this date.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;