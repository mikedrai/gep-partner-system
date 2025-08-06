import React, { useState, useEffect } from 'react';
import { traceabilityService, TraceabilityEvent, AssignmentTraceRecord } from '../services/traceabilityService.ts';

const TraceabilityDashboard: React.FC = () => {
  const [events, setEvents] = useState<TraceabilityEvent[]>([]);
  const [assignmentTraces, setAssignmentTraces] = useState<AssignmentTraceRecord[]>([]);
  const [selectedView, setSelectedView] = useState<'events' | 'assignments' | 'reports'>('events');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterActorType, setFilterActorType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string } | null>(null);
  const [entityReport, setEntityReport] = useState<any>(null);

  useEffect(() => {
    loadTraceabilityData();
  }, []);

  const loadTraceabilityData = () => {
    const allEvents = traceabilityService.getAllEvents();
    const allTraces = traceabilityService.getAssignmentTraces();
    
    setEvents(allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setAssignmentTraces(allTraces.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const handleEntityClick = (type: string, id: string) => {
    setSelectedEntity({ type, id });
    const report = traceabilityService.generateTraceabilityReport(type, id);
    setEntityReport(report);
  };

  const handleExportData = (format: 'json' | 'csv') => {
    traceabilityService.exportTraceabilityData(format);
  };

  const handleCleanupOldEvents = () => {
    if (window.confirm('This will remove events older than 90 days. Continue?')) {
      traceabilityService.cleanupOldEvents(90);
      loadTraceabilityData();
    }
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesEventType = filterEventType === 'all' || event.event_type === filterEventType;
    const matchesActorType = filterActorType === 'all' || event.actor_type === filterActorType;
    const matchesSearch = searchTerm === '' || 
      event.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(event.event_data).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesEventType && matchesActorType && matchesSearch;
  });

  const getEventTypeColor = (eventType: string) => {
    const colorMap: { [key: string]: string } = {
      'customer_request_created': 'bg-blue-100 text-blue-800',
      'ai_recommendation_generated': 'bg-purple-100 text-purple-800',
      'partner_assignment_requested': 'bg-orange-100 text-orange-800',
      'partner_response': 'bg-green-100 text-green-800',
      'assignment_confirmed': 'bg-green-100 text-green-800',
      'assignment_declined': 'bg-red-100 text-red-800',
      'change_request_submitted': 'bg-yellow-100 text-yellow-800',
      'change_request_approved': 'bg-green-100 text-green-800',
      'change_request_rejected': 'bg-red-100 text-red-800',
      'visit_completed': 'bg-green-100 text-green-800',
      'visit_cancelled': 'bg-red-100 text-red-800'
    };
    return colorMap[eventType] || 'bg-gray-100 text-gray-800';
  };

  const getActorTypeIcon = (actorType: string) => {
    const iconMap: { [key: string]: string } = {
      'admin': '👤',
      'partner': '🩺',
      'system': '⚙️',
      'ai': '🤖'
    };
    return iconMap[actorType] || '❓';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const uniqueEventTypes = [...new Set(events.map(e => e.event_type))];
  const uniqueActorTypes = [...new Set(events.map(e => e.actor_type))];

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Traceability Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Complete audit trail of all system interactions and requests
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={() => handleExportData('csv')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            📊 Export CSV
          </button>
          <button
            onClick={() => handleExportData('json')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            📄 Export JSON
          </button>
          <button
            onClick={handleCleanupOldEvents}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            🧹 Cleanup Old
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedView('events')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedView === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔍 All Events ({events.length})
          </button>
          <button
            onClick={() => setSelectedView('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedView === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Assignment Traces ({assignmentTraces.length})
          </button>
          <button
            onClick={() => setSelectedView('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedView === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Analytics
          </button>
        </nav>
      </div>

      {/* Events View */}
      {selectedView === 'events' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <select
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Event Types</option>
                  {uniqueEventTypes.map(type => (
                    <option key={type} value={type}>{formatEventType(type)}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={filterActorType}
                  onChange={(e) => setFilterActorType(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Actor Types</option>
                  {uniqueActorTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">
                  Showing {filteredEvents.length} of {events.length} events
                </span>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">{getActorTypeIcon(event.actor_type)}</span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getEventTypeColor(event.event_type)}`}>
                        {formatEventType(event.event_type)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(event.status)}`}>
                        {event.status.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">{formatTimestamp(event.timestamp)}</span>
                    </div>
                    
                    <div className="text-sm text-gray-900 font-medium mb-1">
                      {event.actor_name}
                    </div>
                    
                    {event.notes && (
                      <div className="text-sm text-gray-600 mb-2">
                        {event.notes}
                      </div>
                    )}

                    {/* Related Entities */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {event.related_entities.customer_request_id && (
                        <button
                          onClick={() => handleEntityClick('customer_request', event.related_entities.customer_request_id!)}
                          className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
                        >
                          📋 Request #{event.related_entities.customer_request_id}
                        </button>
                      )}
                      {event.related_entities.partner_id && (
                        <button
                          onClick={() => handleEntityClick('partner', event.related_entities.partner_id!)}
                          className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs rounded hover:bg-green-100"
                        >
                          🩺 Partner {event.related_entities.partner_id}
                        </button>
                      )}
                      {event.related_entities.assignment_id && (
                        <button
                          onClick={() => handleEntityClick('assignment', event.related_entities.assignment_id!)}
                          className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded hover:bg-purple-100"
                        >
                          📝 Assignment {event.related_entities.assignment_id}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700">Event Data</summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto max-w-sm">
                        {JSON.stringify(event.event_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            ))}

            {filteredEvents.length === 0 && (
              <div className="text-center py-8 bg-white rounded-lg border">
                <div className="text-gray-400 mb-2">🔍</div>
                <p className="text-gray-500">No events found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment Traces View */}
      {selectedView === 'assignments' && (
        <div className="space-y-4">
          {assignmentTraces.map((trace) => (
            <div key={trace.assignment_id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {trace.customer_name} → {trace.partner_name}
                  </h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      trace.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      trace.status === 'declined' ? 'bg-red-100 text-red-800' :
                      trace.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {trace.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(trace.created_at)}
                    </span>
                    <span className="text-sm text-gray-600">
                      €{trace.estimated_cost} • {trace.estimated_hours}h
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleEntityClick('assignment', trace.assignment_id)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  View Timeline
                </button>
              </div>

              {/* Timeline Preview */}
              <div className="border-l-2 border-gray-200 ml-2 pl-4">
                {trace.events.slice(0, 3).map((event, idx) => (
                  <div key={event.id} className="mb-3 last:mb-0">
                    <div className="flex items-center space-x-2 text-sm">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(event.status).includes('green') ? 'bg-green-400' : 
                                      getStatusColor(event.status).includes('yellow') ? 'bg-yellow-400' : 'bg-gray-400'}`}></span>
                      <span className="text-gray-600">{formatTimestamp(event.timestamp)}</span>
                      <span className="font-medium">{formatEventType(event.event_type)}</span>
                    </div>
                    {event.notes && (
                      <div className="text-xs text-gray-500 ml-4 mt-1">{event.notes}</div>
                    )}
                  </div>
                ))}
                {trace.events.length > 3 && (
                  <div className="text-xs text-gray-500 ml-4">+{trace.events.length - 3} more events...</div>
                )}
              </div>
            </div>
          ))}

          {assignmentTraces.length === 0 && (
            <div className="text-center py-8 bg-white rounded-lg border">
              <div className="text-gray-400 mb-2">📋</div>
              <p className="text-gray-500">No assignment traces found</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics View */}
      {selectedView === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Type Distribution */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Event Type Distribution</h3>
            <div className="space-y-2">
              {uniqueEventTypes.map(type => {
                const count = events.filter(e => e.event_type === type).length;
                const percentage = (count / events.length * 100).toFixed(1);
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{formatEventType(type)}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{count}</span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assignment Status Summary */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment Status Summary</h3>
            <div className="space-y-2">
              {['pending_confirmation', 'confirmed', 'declined', 'completed', 'cancelled'].map(status => {
                const count = assignmentTraces.filter(t => t.status === status).length;
                const percentage = assignmentTraces.length > 0 ? (count / assignmentTraces.length * 100).toFixed(1) : '0';
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{status.replace('_', ' ').toUpperCase()}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{count}</span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow border p-6 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Health & Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{events.length}</div>
                <div className="text-sm text-gray-500">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {events.filter(e => e.status === 'success').length}
                </div>
                <div className="text-sm text-gray-500">Successful Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {events.filter(e => e.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-500">Pending Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {events.filter(e => e.status === 'failed').length}
                </div>
                <div className="text-sm text-gray-500">Failed Events</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entity Report Modal */}
      {selectedEntity && entityReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedEntity.type.charAt(0).toUpperCase() + selectedEntity.type.slice(1)} Trace Report
              </h2>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Report Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Events:</span>
                  <div className="font-medium">{entityReport.summary.total_events}</div>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <div className="font-medium">{entityReport.summary.duration_days} days</div>
                </div>
                <div>
                  <span className="text-gray-500">Event Types:</span>
                  <div className="font-medium">{entityReport.summary.event_types.length}</div>
                </div>
                <div>
                  <span className="text-gray-500">Actors:</span>
                  <div className="font-medium">{entityReport.summary.actors_involved.length}</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Complete Timeline</h3>
              <div className="border-l-2 border-gray-200 ml-2 pl-4 space-y-4">
                {entityReport.timeline.map((event: TraceabilityEvent) => (
                  <div key={event.id} className="pb-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full mt-1 ${
                        event.status === 'success' ? 'bg-green-400' :
                        event.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getEventTypeColor(event.event_type)}`}>
                            {formatEventType(event.event_type)}
                          </span>
                          <span className="text-sm text-gray-500">{formatTimestamp(event.timestamp)}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {getActorTypeIcon(event.actor_type)} {event.actor_name}
                        </div>
                        {event.notes && (
                          <div className="text-sm text-gray-600 mb-2">{event.notes}</div>
                        )}
                        <details className="text-xs text-gray-500">
                          <summary className="cursor-pointer hover:text-gray-700">Event Details</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.event_data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TraceabilityDashboard;