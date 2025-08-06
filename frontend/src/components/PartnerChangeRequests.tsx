import React, { useState, useEffect } from 'react';
import { traceabilityService } from '../services/traceabilityService.ts';

interface PartnerUser {
  id: string;
  name: string;
  specialty: string;
  city: string;
  hourly_rate: number;
}

interface ChangeRequest {
  id: string;
  assignment_id: string;
  customer_name: string;
  installation_address: string;
  original_date: string;
  original_time: string;
  requested_change_type: 'reschedule' | 'cancel' | 'modify_duration';
  new_date?: string;
  new_time?: string;
  new_duration?: number;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  status: 'pending_approval' | 'approved' | 'rejected';
  created_at: string;
  manager_response?: string;
  response_date?: string;
}

interface PartnerChangeRequestsProps {
  partner: PartnerUser;
}

const PartnerChangeRequests: React.FC<PartnerChangeRequestsProps> = ({ partner }) => {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    assignment_id: '',
    change_type: 'reschedule' as 'reschedule' | 'cancel' | 'modify_duration',
    new_date: '',
    new_time: '',
    new_duration: 1,
    reason: '',
    urgency: 'medium' as 'high' | 'medium' | 'low'
  });
  const [availableAssignments, setAvailableAssignments] = useState<any[]>([]);

  useEffect(() => {
    // Load existing change requests
    const loadChangeRequests = () => {
      const stored = JSON.parse(localStorage.getItem('partnerChangeRequests') || '[]');
      const partnerRequests = stored.filter((req: any) => req.partner_id === partner.id);
      
      // Generate sample change requests if none exist
      if (partnerRequests.length === 0) {
        const sampleRequests: ChangeRequest[] = [
          {
            id: 'change-001',
            assignment_id: 'assign-future-1',
            customer_name: 'TechnoCorp SA',
            installation_address: 'ΛΕΩΦ. ΣΥΓΓΡΟΥ 350',
            original_date: '2025-08-15',
            original_time: '10:00',
            requested_change_type: 'reschedule',
            new_date: '2025-08-16',
            new_time: '14:00',
            reason: 'Personal emergency requires schedule adjustment',
            urgency: 'high',
            status: 'pending_approval',
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'change-002',
            assignment_id: 'assign-future-2',
            customer_name: 'HealthFirst Manufacturing',
            installation_address: 'ΚΗΦΙΣΙΑΣ 230',
            original_date: '2025-08-22',
            original_time: '09:00',
            requested_change_type: 'modify_duration',
            new_duration: 3,
            reason: 'Additional time needed for comprehensive assessment based on site complexity',
            urgency: 'medium',
            status: 'approved',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            manager_response: 'Approved. Additional time allocated due to site complexity.',
            response_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'change-003',
            assignment_id: 'assign-future-3',
            customer_name: 'SafeWork Solutions',
            installation_address: 'ΠΑΤΗΣΙΩΝ 145',
            original_date: '2025-07-30',
            original_time: '15:00',
            requested_change_type: 'cancel',
            reason: 'Partner unavailable due to illness',
            urgency: 'high',
            status: 'rejected',
            created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            manager_response: 'Rejected. Please coordinate with backup partner. Cancellation too close to scheduled date.',
            response_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
          }
        ];
        setChangeRequests(sampleRequests);
      } else {
        setChangeRequests(partnerRequests);
      }
    };

    // Load available assignments for new requests
    const loadAvailableAssignments = () => {
      // Get confirmed assignments that are in the future
      const confirmedAssignments = JSON.parse(localStorage.getItem('confirmedAssignments') || '[]');
      const partnerAssignments = confirmedAssignments.filter((assign: any) => 
        assign.partner_id === partner.id &&
        assign.status === 'confirmed' &&
        assign.schedule?.some((visit: any) => new Date(visit.visit_date) > new Date())
      );

      // Generate sample assignments if none exist
      if (partnerAssignments.length === 0) {
        const sampleAssignments = [
          {
            id: 'assign-001',
            customer_name: 'TechnoCorp SA',
            installation_address: 'ΛΕΩΦ. ΣΥΓΓΡΟΥ 350',
            visit_date: '2025-08-15',
            visit_time: '10:00',
            duration_hours: 2
          },
          {
            id: 'assign-002',
            customer_name: 'HealthFirst Manufacturing',
            installation_address: 'ΚΗΦΙΣΙΑΣ 230',
            visit_date: '2025-08-22',
            visit_time: '09:00',
            duration_hours: 2
          },
          {
            id: 'assign-003',
            customer_name: 'SafeWork Solutions',
            installation_address: 'ΠΑΤΗΣΙΩΝ 145',
            visit_date: '2025-08-30',
            visit_time: '15:00',
            duration_hours: 1
          }
        ];
        setAvailableAssignments(sampleAssignments);
      } else {
        setAvailableAssignments(partnerAssignments);
      }
    };

    loadChangeRequests();
    loadAvailableAssignments();
  }, [partner.id]);

  const handleSubmitChangeRequest = () => {
    const selectedAssignment = availableAssignments.find(a => a.id === newRequest.assignment_id);
    if (!selectedAssignment) return;

    const changeRequest: ChangeRequest = {
      id: `change-${Date.now()}`,
      assignment_id: newRequest.assignment_id,
      customer_name: selectedAssignment.customer_name,
      installation_address: selectedAssignment.installation_address,
      original_date: selectedAssignment.visit_date,
      original_time: selectedAssignment.visit_time,
      requested_change_type: newRequest.change_type,
      new_date: newRequest.new_date || undefined,
      new_time: newRequest.new_time || undefined,
      new_duration: newRequest.change_type === 'modify_duration' ? newRequest.new_duration : undefined,
      reason: newRequest.reason,
      urgency: newRequest.urgency,
      status: 'pending_approval',
      created_at: new Date().toISOString()
    };

    // Add to requests list
    const updatedRequests = [...changeRequests, changeRequest];
    setChangeRequests(updatedRequests);

    // Store in localStorage
    const allRequests = JSON.parse(localStorage.getItem('partnerChangeRequests') || '[]');
    allRequests.push({ ...changeRequest, partner_id: partner.id });
    localStorage.setItem('partnerChangeRequests', JSON.stringify(allRequests));

    // Track change request submission in traceability system
    traceabilityService.trackChangeRequestSubmitted({
      ...changeRequest,
      partner_id: partner.id,
      partner_name: partner.name
    });

    // Reset form
    setNewRequest({
      assignment_id: '',
      change_type: 'reschedule',
      new_date: '',
      new_time: '',
      new_duration: 1,
      reason: '',
      urgency: 'medium'
    });
    setShowCreateForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'reschedule': return '📅 Reschedule';
      case 'cancel': return '❌ Cancel';
      case 'modify_duration': return '⏱️ Modify Duration';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Assignment Change Requests</h2>
          <p className="text-sm text-gray-600">
            Request changes to your scheduled assignments
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Request Change
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Request Assignment Change</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitChangeRequest(); }} className="space-y-4">
              {/* Assignment Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Assignment *
                </label>
                <select
                  value={newRequest.assignment_id}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, assignment_id: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose assignment to modify</option>
                  {availableAssignments.map(assignment => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.customer_name} - {formatDate(assignment.visit_date)} at {assignment.visit_time}
                    </option>
                  ))}
                </select>
              </div>

              {/* Change Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type of Change *
                </label>
                <select
                  value={newRequest.change_type}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, change_type: e.target.value as any }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="reschedule">Reschedule Visit</option>
                  <option value="modify_duration">Modify Duration</option>
                  <option value="cancel">Cancel Visit</option>
                </select>
              </div>

              {/* Conditional Fields */}
              {newRequest.change_type === 'reschedule' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Date *
                    </label>
                    <input
                      type="date"
                      value={newRequest.new_date}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, new_date: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Time *
                    </label>
                    <input
                      type="time"
                      value={newRequest.new_time}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, new_time: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              )}

              {newRequest.change_type === 'modify_duration' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Duration (hours) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={newRequest.new_duration}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, new_duration: parseInt(e.target.value) }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urgency *
                </label>
                <select
                  value={newRequest.urgency}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, urgency: e.target.value as any }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="low">Low - Can wait for normal approval</option>
                  <option value="medium">Medium - Needs timely response</option>
                  <option value="high">High - Urgent approval needed</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Change *
                </label>
                <textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please explain why this change is needed..."
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requests List */}
      {changeRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Change Requests</h3>
          <p className="text-gray-600">You haven't submitted any change requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {changeRequests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{request.customer_name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getUrgencyColor(request.urgency)}`}>
                      {request.urgency.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">📍 {request.installation_address}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Requested {new Date(request.created_at).toLocaleDateString()}</div>
                  <div>{getChangeTypeLabel(request.requested_change_type)}</div>
                </div>
              </div>

              {/* Change Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Original Schedule</h4>
                    <div className="text-sm text-gray-600">
                      <div>📅 {formatDate(request.original_date)}</div>
                      <div>🕐 {request.original_time}</div>
                    </div>
                  </div>
                  
                  {request.requested_change_type !== 'cancel' && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Requested Changes</h4>
                      <div className="text-sm text-gray-600">
                        {request.new_date && <div>📅 {formatDate(request.new_date)}</div>}
                        {request.new_time && <div>🕐 {request.new_time}</div>}
                        {request.new_duration && <div>⏱️ {request.new_duration} hours</div>}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Reason</h4>
                  <p className="text-sm text-gray-600">{request.reason}</p>
                </div>
              </div>

              {/* Manager Response */}
              {request.manager_response && (
                <div className={`rounded-lg p-4 ${
                  request.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Manager Response</h4>
                    <span className="text-xs text-gray-500">
                      {new Date(request.response_date!).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    request.status === 'approved' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {request.manager_response}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">📋 Change Request Guidelines</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Submit requests at least 48 hours before the scheduled visit</li>
          <li>• Emergency changes may be approved with less notice</li>
          <li>• Cancellations within 24 hours may affect your rating</li>
          <li>• All changes require manager approval</li>
          <li>• You'll be notified via email once your request is processed</li>
        </ul>
      </div>
    </div>
  );
};

export default PartnerChangeRequests;