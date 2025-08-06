import React, { useState, useEffect } from 'react';
import { traceabilityService } from '../services/traceabilityService.ts';

interface PartnerUser {
  id: string;
  name: string;
  specialty: string;
  city: string;
  hourly_rate: number;
}

interface PendingRequest {
  id: string;
  customer_name: string;
  installation_addresses: string[];
  work_type: string;
  total_employees: number;
  contract_completion_date: string;
  estimated_hours: number;
  estimated_cost: number;
  urgency: 'high' | 'medium' | 'low';
  proposed_schedule: {
    visit_date: string;
    visit_time: string;
    duration_hours: number;
    installation_address: string;
  }[];
  special_requirements?: string;
  deadline_response: string;
  match_score: number;
  ai_reasoning: string[];
  created_at: string;
}

interface PartnerPendingRequestsProps {
  partner: PartnerUser;
}

const PartnerPendingRequests: React.FC<PartnerPendingRequestsProps> = ({ partner }) => {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    // Load pending assignment requests from localStorage (from AI scheduling)
    const loadPendingRequests = () => {
      const assignmentRequests = JSON.parse(localStorage.getItem('assignmentRequests') || '[]');
      const confirmationRequests = JSON.parse(localStorage.getItem('confirmationRequests') || '[]');
      
      // Filter requests for this partner that are still pending
      const partnerRequests = assignmentRequests.filter((req: any) => 
        req.partner_id === partner.id && 
        req.status === 'pending_confirmation' &&
        new Date(req.confirmation_deadline) > new Date()
      );

      // Generate sample requests if none exist from AI system
      if (partnerRequests.length === 0) {
        const sampleRequests: PendingRequest[] = [
          {
            id: 'req-001',
            customer_name: 'TechnoCorp SA',
            installation_addresses: ['ΛΕΩΦ. ΣΥΓΓΡΟΥ 350', 'ΜΙΧΑΛΑΚΟΠΟΥΛΟΥ 98'],
            work_type: 'routine_health_check',
            total_employees: 85,
            contract_completion_date: '2025-12-31',
            estimated_hours: 12,
            estimated_cost: partner.hourly_rate * 12,
            urgency: 'high',
            proposed_schedule: [
              {
                visit_date: '2025-08-05',
                visit_time: '10:00',
                duration_hours: 2,
                installation_address: 'ΛΕΩΦ. ΣΥΓΓΡΟΥ 350'
              },
              {
                visit_date: '2025-09-05',
                visit_time: '10:00',
                duration_hours: 2,
                installation_address: 'ΜΙΧΑΛΑΚΟΠΟΥΛΟΥ 98'
              }
            ],
            special_requirements: 'Requires experience with large office environments',
            deadline_response: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
            match_score: 94,
            ai_reasoning: [
              'Perfect specialty match for occupational health requirements',
              'Excellent location proximity to both installations',
              'Schedule perfectly aligns with your availability',
              'Cost-effective hourly rate within client budget'
            ],
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'req-002',
            customer_name: 'HealthFirst Manufacturing',
            installation_addresses: ['ΚΗΦΙΣΙΑΣ 230'],
            work_type: 'comprehensive_health_assessment',
            total_employees: 45,
            contract_completion_date: '2025-10-15',
            estimated_hours: 8,
            estimated_cost: partner.hourly_rate * 8,
            urgency: 'medium',
            proposed_schedule: [
              {
                visit_date: '2025-08-12',
                visit_time: '14:00',
                duration_hours: 2,
                installation_address: 'ΚΗΦΙΣΙΑΣ 230'
              },
              {
                visit_date: '2025-09-12',
                visit_time: '14:00',
                duration_hours: 2,
                installation_address: 'ΚΗΦΙΣΙΑΣ 230'
              }
            ],
            deadline_response: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
            match_score: 87,
            ai_reasoning: [
              'Strong specialty match for comprehensive health assessments',
              'Good availability alignment with proposed schedule',
              'Moderate travel distance from your base location'
            ],
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        setPendingRequests(sampleRequests);
      } else {
        // Convert stored requests to component format
        const convertedRequests = partnerRequests.map((req: any) => ({
          id: req.id,
          customer_name: req.recommendation_data?.customer_name || 'Unknown Customer',
          installation_addresses: req.recommendation_data?.installation_assignments?.map((ia: any) => ia.installation_address) || [],
          work_type: req.recommendation_data?.work_type || 'health_check',
          total_employees: req.recommendation_data?.total_employees || 50,
          contract_completion_date: req.recommendation_data?.contract_completion_date || '2025-12-31',
          estimated_hours: req.estimated_hours,
          estimated_cost: req.estimated_cost,
          urgency: req.recommendation_data?.priority || 'medium',
          proposed_schedule: req.recommendation_data?.proposed_schedule || [],
          special_requirements: req.recommendation_data?.specific_requests,
          deadline_response: req.confirmation_deadline,
          match_score: req.recommendation_data?.match_score || 85,
          ai_reasoning: req.recommendation_data?.reasoning || ['AI-generated recommendation'],
          created_at: req.created_at
        }));
        
        setPendingRequests(convertedRequests);
      }
    };

    loadPendingRequests();
  }, [partner.id]);

  const handleAcceptRequest = async (request: PendingRequest) => {
    setResponseMessage('Processing acceptance...');
    
    // Simulate API call delay
    setTimeout(() => {
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      
      // Add to confirmed assignments (this would normally sync with the admin system)
      const confirmedAssignment = {
        id: `confirmed-${request.id}`,
        partner_id: partner.id,
        customer_request_id: request.id,
        customer_name: request.customer_name,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        estimated_hours: request.estimated_hours,
        estimated_cost: request.estimated_cost,
        schedule: request.proposed_schedule
      };
      
      const existingConfirmed = JSON.parse(localStorage.getItem('confirmedAssignments') || '[]');
      existingConfirmed.push(confirmedAssignment);
      localStorage.setItem('confirmedAssignments', JSON.stringify(existingConfirmed));

      // Track partner acceptance in traceability system
      traceabilityService.trackPartnerResponse(
        request.id,
        partner.id,
        partner.name,
        'accepted'
      );
      
      setResponseMessage('✅ Assignment accepted successfully! You will receive detailed instructions via email.');
      setSelectedRequest(null);
      
      setTimeout(() => setResponseMessage(''), 3000);
    }, 1500);
  };

  const handleDeclineRequest = async (request: PendingRequest, reason: string) => {
    setResponseMessage('Processing decline...');
    
    setTimeout(() => {
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      
      // Store decline reason for admin visibility
      const declinedAssignment = {
        id: `declined-${request.id}`,
        partner_id: partner.id,
        customer_request_id: request.id,
        customer_name: request.customer_name,
        status: 'declined',
        declined_at: new Date().toISOString(),
        decline_reason: reason
      };
      
      const existingDeclined = JSON.parse(localStorage.getItem('declinedAssignments') || '[]');
      existingDeclined.push(declinedAssignment);
      localStorage.setItem('declinedAssignments', JSON.stringify(existingDeclined));

      // Track partner decline in traceability system
      traceabilityService.trackPartnerResponse(
        request.id,
        partner.id,
        partner.name,
        'declined',
        reason
      );
      
      setResponseMessage('Request declined. The system will find an alternative partner.');
      setSelectedRequest(null);
      
      setTimeout(() => setResponseMessage(''), 3000);
    }, 1000);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getWorkTypeLabel = (workType: string) => {
    switch (workType) {
      case 'routine_health_check': return 'Routine Health Check';
      case 'comprehensive_health_assessment': return 'Comprehensive Health Assessment';
      case 'occupational_health_screening': return 'Occupational Health Screening';
      case 'safety_inspection': return 'Safety Inspection';
      case 'compliance_audit': return 'Compliance Audit';
      default: return workType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursRemaining <= 0) return 'Expired';
    if (hoursRemaining < 24) return `${hoursRemaining}h remaining`;
    const daysRemaining = Math.floor(hoursRemaining / 24);
    return `${daysRemaining}d ${hoursRemaining % 24}h remaining`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Pending Assignment Requests</h2>
          <p className="text-sm text-gray-600">
            New assignments requiring your confirmation within 24 hours
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {pendingRequests.length} pending requests
        </div>
      </div>

      {/* Response Message */}
      {responseMessage && (
        <div className={`p-4 rounded-md ${
          responseMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {responseMessage}
        </div>
      )}

      {/* Requests List */}
      {pendingRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
          <p className="text-gray-600">You're all caught up! New assignment requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{request.customer_name}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getUrgencyColor(request.urgency)}`}>
                        {request.urgency.toUpperCase()} Priority
                      </span>
                      <span className="text-sm text-blue-600 font-medium">
                        {request.match_score}% Match Score
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimeRemaining(request.deadline_response)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">€{request.estimated_cost.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">{request.estimated_hours}h total</div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Assignment Details</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>📋 {getWorkTypeLabel(request.work_type)}</div>
                      <div>👥 {request.total_employees} employees</div>
                      <div>📅 Contract until {new Date(request.contract_completion_date).toLocaleDateString()}</div>
                      <div>📍 {request.installation_addresses.length} location(s)</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">AI Analysis</h4>
                    <div className="space-y-1">
                      {request.ai_reasoning.slice(0, 3).map((reason, idx) => (
                        <div key={idx} className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                          • {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Proposed Schedule Preview */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Proposed Schedule ({request.proposed_schedule.length} visits)</h4>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {request.proposed_schedule.slice(0, 4).map((visit, idx) => (
                        <div key={idx} className="text-xs bg-white p-2 rounded border">
                          <div className="font-medium">{new Date(visit.visit_date).toLocaleDateString()}</div>
                          <div className="text-gray-600">{visit.visit_time} • {visit.duration_hours}h</div>
                          <div className="text-gray-500 truncate">{visit.installation_address}</div>
                        </div>
                      ))}
                      {request.proposed_schedule.length > 4 && (
                        <div className="text-xs text-gray-500 flex items-center justify-center border border-dashed border-gray-300 rounded p-2">
                          +{request.proposed_schedule.length - 4} more visits...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Special Requirements */}
                {request.special_requirements && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Special Requirements</h4>
                    <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                      {request.special_requirements}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDeclineRequest(request, 'Schedule conflict')}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    View Full Details
                  </button>
                  <button
                    onClick={() => handleAcceptRequest(request)}
                    className="px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    Accept Assignment
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-900">Assignment Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Full schedule and location details would go here */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Complete Visit Schedule</h3>
                <div className="space-y-2">
                  {selectedRequest.proposed_schedule.map((visit, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">Visit {idx + 1}</div>
                        <div className="text-sm text-gray-600">{visit.installation_address}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{new Date(visit.visit_date).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-600">{visit.visit_time} • {visit.duration_hours}h</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDeclineRequest(selectedRequest, 'After review')}
                  className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                >
                  Decline Request
                </button>
                <button
                  onClick={() => handleAcceptRequest(selectedRequest)}
                  className="px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Accept Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerPendingRequests;