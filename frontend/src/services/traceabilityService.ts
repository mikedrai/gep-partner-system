// Comprehensive traceability service for tracking all system interactions
interface TraceabilityEvent {
  id: string;
  timestamp: string;
  event_type: 'customer_request_created' | 'ai_recommendation_generated' | 'partner_assignment_requested' | 
             'partner_response' | 'assignment_confirmed' | 'assignment_declined' | 'change_request_submitted' |
             'change_request_approved' | 'change_request_rejected' | 'visit_completed' | 'visit_cancelled';
  actor_type: 'admin' | 'partner' | 'system' | 'ai';
  actor_id: string;
  actor_name: string;
  related_entities: {
    customer_request_id?: string;
    partner_id?: string;
    assignment_id?: string;
    change_request_id?: string;
    visit_id?: string;
  };
  event_data: any;
  status: 'success' | 'pending' | 'failed';
  notes?: string;
}

interface AssignmentTraceRecord {
  assignment_id: string;
  customer_request_id: string;
  customer_name: string;
  partner_id: string;
  partner_name: string;
  created_at: string;
  status: 'pending_confirmation' | 'confirmed' | 'declined' | 'completed' | 'cancelled';
  events: TraceabilityEvent[];
  confirmation_deadline?: string;
  confirmed_at?: string;
  declined_at?: string;
  decline_reason?: string;
  completed_at?: string;
  estimated_hours: number;
  estimated_cost: number;
}

class TraceabilityService {
  private readonly EVENTS_KEY = 'traceability_events';
  private readonly ASSIGNMENTS_KEY = 'assignment_traces';
  private readonly REQUESTS_KEY = 'request_traces';

  // Log a new traceability event
  logEvent(event: Omit<TraceabilityEvent, 'id' | 'timestamp'>): TraceabilityEvent {
    const fullEvent: TraceabilityEvent = {
      ...event,
      id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // Store event
    const existingEvents = this.getAllEvents();
    existingEvents.push(fullEvent);
    localStorage.setItem(this.EVENTS_KEY, JSON.stringify(existingEvents));

    console.log('🔍 Traceability Event Logged:', fullEvent);
    return fullEvent;
  }

  // Track customer request creation
  trackCustomerRequestCreated(requestData: any): void {
    this.logEvent({
      event_type: 'customer_request_created',
      actor_type: 'admin',
      actor_id: 'admin-001',
      actor_name: 'System Administrator',
      related_entities: {
        customer_request_id: requestData.id?.toString()
      },
      event_data: {
        customer_name: requestData.client_name,
        installation_count: requestData.number_of_installations,
        total_employees: requestData.total_employees,
        work_type: requestData.work_type,
        estimated_hours: requestData.calculated_hours,
        estimated_cost: requestData.estimated_cost
      },
      status: 'success',
      notes: 'Customer request created and added to system'
    });
  }

  // Track AI recommendation generation
  trackAIRecommendationGenerated(customerRequestId: string, recommendations: any[]): void {
    this.logEvent({
      event_type: 'ai_recommendation_generated',
      actor_type: 'ai',
      actor_id: 'ai-scheduler',
      actor_name: 'AI Scheduling System',
      related_entities: {
        customer_request_id: customerRequestId
      },
      event_data: {
        recommendations_count: recommendations.length,
        top_matches: recommendations.slice(0, 3).map(r => ({
          partner_id: r.partner_id,
          partner_name: r.partner_name,
          match_score: r.match_score
        })),
        generation_parameters: {
          specialty_weight: 0.3,
          availability_weight: 0.25,
          location_weight: 0.2,
          cost_weight: 0.15,
          proximity_weight: 0.1
        }
      },
      status: 'success',
      notes: `Generated ${recommendations.length} partner recommendations using AI matching algorithm`
    });
  }

  // Track partner assignment request
  trackPartnerAssignmentRequested(assignmentData: any): AssignmentTraceRecord {
    const traceRecord: AssignmentTraceRecord = {
      assignment_id: assignmentData.id,
      customer_request_id: assignmentData.customer_request_id?.toString(),
      customer_name: assignmentData.recommendation_data?.customer_name || 'Unknown',
      partner_id: assignmentData.partner_id,
      partner_name: assignmentData.partner_name,
      created_at: assignmentData.created_at,
      status: 'pending_confirmation',
      events: [],
      confirmation_deadline: assignmentData.confirmation_deadline,
      estimated_hours: assignmentData.estimated_hours,
      estimated_cost: assignmentData.estimated_cost
    };

    // Log the initial assignment request event
    const event = this.logEvent({
      event_type: 'partner_assignment_requested',
      actor_type: 'admin',
      actor_id: 'admin-001',
      actor_name: 'System Administrator',
      related_entities: {
        customer_request_id: assignmentData.customer_request_id?.toString(),
        partner_id: assignmentData.partner_id,
        assignment_id: assignmentData.id
      },
      event_data: {
        partner_name: assignmentData.partner_name,
        estimated_hours: assignmentData.estimated_hours,
        estimated_cost: assignmentData.estimated_cost,
        confirmation_deadline: assignmentData.confirmation_deadline,
        match_score: assignmentData.recommendation_data?.match_score,
        proposed_schedule: assignmentData.recommendation_data?.proposed_schedule
      },
      status: 'pending',
      notes: `Assignment request sent to partner with 24-hour confirmation deadline`
    });

    traceRecord.events.push(event);

    // Store assignment trace
    const existingTraces = this.getAssignmentTraces();
    existingTraces.push(traceRecord);
    localStorage.setItem(this.ASSIGNMENTS_KEY, JSON.stringify(existingTraces));

    return traceRecord;
  }

  // Track partner response (accept/decline)
  trackPartnerResponse(assignmentId: string, partnerId: string, partnerName: string, 
                      response: 'accepted' | 'declined', reason?: string): void {
    
    const event = this.logEvent({
      event_type: 'partner_response',
      actor_type: 'partner',
      actor_id: partnerId,
      actor_name: partnerName,
      related_entities: {
        assignment_id: assignmentId,
        partner_id: partnerId
      },
      event_data: {
        response,
        response_reason: reason,
        response_time: new Date().toISOString()
      },
      status: 'success',
      notes: `Partner ${response} the assignment${reason ? ': ' + reason : ''}`
    });

    // Update assignment trace
    this.updateAssignmentTrace(assignmentId, {
      status: response === 'accepted' ? 'confirmed' : 'declined',
      confirmed_at: response === 'accepted' ? new Date().toISOString() : undefined,
      declined_at: response === 'declined' ? new Date().toISOString() : undefined,
      decline_reason: reason
    }, event);
  }

  // Track change request submission
  trackChangeRequestSubmitted(changeRequestData: any): void {
    this.logEvent({
      event_type: 'change_request_submitted',
      actor_type: 'partner',
      actor_id: changeRequestData.partner_id,
      actor_name: changeRequestData.partner_name || 'Partner',
      related_entities: {
        assignment_id: changeRequestData.assignment_id,
        change_request_id: changeRequestData.id,
        partner_id: changeRequestData.partner_id
      },
      event_data: {
        change_type: changeRequestData.requested_change_type,
        original_date: changeRequestData.original_date,
        original_time: changeRequestData.original_time,
        new_date: changeRequestData.new_date,
        new_time: changeRequestData.new_time,
        new_duration: changeRequestData.new_duration,
        reason: changeRequestData.reason,
        urgency: changeRequestData.urgency
      },
      status: 'pending',
      notes: `Partner requested ${changeRequestData.requested_change_type} for assignment`
    });
  }

  // Track manager response to change request
  trackChangeRequestResponse(changeRequestId: string, managerId: string, 
                           response: 'approved' | 'rejected', managerNotes: string): void {
    this.logEvent({
      event_type: response === 'approved' ? 'change_request_approved' : 'change_request_rejected',
      actor_type: 'admin',
      actor_id: managerId,
      actor_name: 'Manager',
      related_entities: {
        change_request_id: changeRequestId
      },
      event_data: {
        response,
        manager_notes: managerNotes,
        response_timestamp: new Date().toISOString()
      },
      status: 'success',
      notes: `Manager ${response} change request: ${managerNotes}`
    });
  }

  // Track visit completion
  trackVisitCompleted(visitData: any): void {
    this.logEvent({
      event_type: 'visit_completed',
      actor_type: 'partner',
      actor_id: visitData.partner_id,
      actor_name: visitData.partner_name || 'Partner',
      related_entities: {
        assignment_id: visitData.assignment_id,
        visit_id: visitData.id,
        partner_id: visitData.partner_id
      },
      event_data: {
        visit_date: visitData.visit_date,
        visit_time: visitData.visit_time,
        duration_hours: visitData.duration_hours,
        total_cost: visitData.total_cost,
        visit_type: visitData.visit_type,
        completion_notes: visitData.notes,
        customer_name: visitData.customer_name,
        installation_address: visitData.installation_address
      },
      status: 'success',
      notes: `Visit completed successfully`
    });

    // Update assignment trace if this was the final visit
    this.updateAssignmentTrace(visitData.assignment_id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }

  // Get all events
  getAllEvents(): TraceabilityEvent[] {
    return JSON.parse(localStorage.getItem(this.EVENTS_KEY) || '[]');
  }

  // Get events for specific entity
  getEventsForEntity(entityType: string, entityId: string): TraceabilityEvent[] {
    const allEvents = this.getAllEvents();
    return allEvents.filter(event => {
      const entities = event.related_entities;
      switch (entityType) {
        case 'customer_request':
          return entities.customer_request_id === entityId;
        case 'partner':
          return entities.partner_id === entityId;
        case 'assignment':
          return entities.assignment_id === entityId;
        default:
          return false;
      }
    });
  }

  // Get assignment traces
  getAssignmentTraces(): AssignmentTraceRecord[] {
    return JSON.parse(localStorage.getItem(this.ASSIGNMENTS_KEY) || '[]');
  }

  // Get assignment trace by ID
  getAssignmentTrace(assignmentId: string): AssignmentTraceRecord | null {
    const traces = this.getAssignmentTraces();
    return traces.find(trace => trace.assignment_id === assignmentId) || null;
  }

  // Update assignment trace
  private updateAssignmentTrace(assignmentId: string, updates: Partial<AssignmentTraceRecord>, 
                               newEvent?: TraceabilityEvent): void {
    const traces = this.getAssignmentTraces();
    const traceIndex = traces.findIndex(trace => trace.assignment_id === assignmentId);
    
    if (traceIndex >= 0) {
      traces[traceIndex] = { ...traces[traceIndex], ...updates };
      if (newEvent) {
        traces[traceIndex].events.push(newEvent);
      }
      localStorage.setItem(this.ASSIGNMENTS_KEY, JSON.stringify(traces));
    }
  }

  // Generate traceability report
  generateTraceabilityReport(entityType: string, entityId: string): {
    entity_info: any;
    timeline: TraceabilityEvent[];
    summary: any;
  } {
    const events = this.getEventsForEntity(entityType, entityId);
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const summary = {
      total_events: events.length,
      event_types: [...new Set(events.map(e => e.event_type))],
      actors_involved: [...new Set(events.map(e => e.actor_name))],
      status_changes: events.filter(e => e.event_type.includes('response') || e.event_type.includes('confirmed')),
      duration_days: events.length > 0 ? 
        Math.ceil((new Date(events[events.length - 1].timestamp).getTime() - 
                  new Date(events[0].timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 0
    };

    let entity_info = {};
    if (entityType === 'assignment') {
      const assignmentTrace = this.getAssignmentTrace(entityId);
      entity_info = assignmentTrace || {};
    }

    return {
      entity_info,
      timeline: sortedEvents,
      summary
    };
  }

  // Export traceability data
  exportTraceabilityData(format: 'json' | 'csv' = 'json'): void {
    const allEvents = this.getAllEvents();
    const allTraces = this.getAssignmentTraces();
    
    const exportData = {
      export_timestamp: new Date().toISOString(),
      total_events: allEvents.length,
      total_assignments: allTraces.length,
      events: allEvents,
      assignment_traces: allTraces
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceability-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['Timestamp', 'Event Type', 'Actor Type', 'Actor Name', 'Status', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...allEvents.map(event => [
          event.timestamp,
          event.event_type,
          event.actor_type,
          `"${event.actor_name}"`,
          event.status,
          `"${event.notes || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceability-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  // Clear old events (cleanup)
  cleanupOldEvents(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const allEvents = this.getAllEvents();
    const filteredEvents = allEvents.filter(event => 
      new Date(event.timestamp) > cutoffDate
    );

    localStorage.setItem(this.EVENTS_KEY, JSON.stringify(filteredEvents));
    console.log(`🧹 Cleaned up ${allEvents.length - filteredEvents.length} old traceability events`);
  }
}

export const traceabilityService = new TraceabilityService();
export type { TraceabilityEvent, AssignmentTraceRecord };