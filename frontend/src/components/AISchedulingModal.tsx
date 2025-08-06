import React, { useState, useEffect } from 'react';
import { aiScheduler, AIRecommendation, CustomerRequest } from '../services/aiScheduler.ts';
import { traceabilityService } from '../services/traceabilityService.ts';

interface AISchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerRequest: CustomerRequest;
}

const AISchedulingModal: React.FC<AISchedulingModalProps> = ({ isOpen, onClose, customerRequest }) => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen && customerRequest) {
      generateRecommendations();
    }
  }, [isOpen, customerRequest]);

  const generateRecommendations = async () => {
    setIsLoading(true);
    try {
      console.log('🤖 Generating AI recommendations for request:', customerRequest.id);
      const recs = await aiScheduler.generateRecommendations(customerRequest);
      setRecommendations(recs);
      console.log('✅ Generated recommendations:', recs.length);
    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPartner = async (recommendation: AIRecommendation) => {
    setSelectedRecommendation(recommendation);
    setConfirmationStatus('sending');

    try {
      // Send confirmation request to partner
      const success = await aiScheduler.confirmPartnerAssignment(
        `rec-${Date.now()}`,
        recommendation.partner_id
      );

      if (success) {
        setConfirmationStatus('sent');
        
        // Store the assignment request for traceability
        const assignmentRequest = {
          id: `assign-${Date.now()}`,
          customer_request_id: customerRequest.id,
          partner_id: recommendation.partner_id,
          partner_name: recommendation.partner_name,
          recommendation_data: recommendation,
          status: 'pending_confirmation',
          created_at: new Date().toISOString(),
          confirmation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          estimated_hours: recommendation.total_estimated_hours,
          estimated_cost: recommendation.total_estimated_cost
        };

        // Store for traceability
        const existingAssignments = JSON.parse(localStorage.getItem('assignmentRequests') || '[]');
        existingAssignments.push(assignmentRequest);
        localStorage.setItem('assignmentRequests', JSON.stringify(existingAssignments));

        // Track assignment request in traceability system
        traceabilityService.trackPartnerAssignmentRequested(assignmentRequest);

        console.log('📋 Assignment request stored for traceability:', assignmentRequest.id);
      }
    } catch (error) {
      console.error('❌ Error sending confirmation:', error);
      setConfirmationStatus('error');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Partner Scheduling</h2>
            <p className="text-gray-600">
              Intelligent partner matching for {customerRequest.client_name}
            </p>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(customerRequest.priority)}`}>
                {customerRequest.priority.toUpperCase()} Priority
              </span>
              <span className="text-sm text-gray-500">
                {customerRequest.number_of_installations} installations • {customerRequest.total_employees} employees
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">AI is analyzing partners and generating optimal recommendations...</p>
          </div>
        )}

        {/* Confirmation Status */}
        {confirmationStatus && selectedRecommendation && (
          <div className="mb-6 p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {confirmationStatus === 'sending' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
                {confirmationStatus === 'sent' && (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {confirmationStatus === 'error' && (
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  {confirmationStatus === 'sending' && 'Sending confirmation request to partner...'}
                  {confirmationStatus === 'sent' && (
                    <>
                      ✅ Confirmation request sent to <strong>{selectedRecommendation.partner_name}</strong>!
                      <br />
                      Partner has 24 hours to confirm assignment. You will be notified once they respond.
                    </>
                  )}
                  {confirmationStatus === 'error' && 'Error sending confirmation request. Please try again.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {!isLoading && recommendations.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Top Partner Recommendations ({recommendations.length})
              </h3>
              <button
                onClick={generateRecommendations}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                🔄 Regenerate
              </button>
            </div>

            {recommendations.map((rec, index) => (
              <div key={rec.partner_id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xl font-bold text-blue-600">#{index + 1}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">{rec.partner_name}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getScoreColor(rec.match_score)}`}>
                            {rec.match_score}% Match
                          </span>
                          <span className="text-sm text-gray-500">
                            €{rec.total_estimated_cost.toLocaleString()} • {rec.total_estimated_hours}h
                          </span>
                          {rec.schedule_conflicts > 0 && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                              {rec.schedule_conflicts} conflicts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectPartner(rec)}
                      disabled={confirmationStatus === 'sending' || confirmationStatus === 'sent'}
                      className={`px-6 py-2 rounded-md text-sm font-medium ${
                        confirmationStatus === 'sent' && selectedRecommendation?.partner_id === rec.partner_id
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : confirmationStatus === 'sending'
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {confirmationStatus === 'sent' && selectedRecommendation?.partner_id === rec.partner_id
                        ? '✅ Request Sent'
                        : confirmationStatus === 'sending'
                        ? 'Sending...'
                        : 'Select Partner'
                      }
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* AI Reasoning */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">AI Analysis</h5>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <ul className="text-sm text-blue-800 space-y-1">
                        {rec.reasoning.map((reason, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Installation Assignments */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Installation Assignments</h5>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {rec.installation_assignments.map((assignment, idx) => (
                        <div key={assignment.installation_id} className="border border-gray-200 rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h6 className="font-medium text-gray-900 text-sm">
                              Installation {idx + 1}
                            </h6>
                            <span className="text-xs text-gray-500">
                              {assignment.employees_count} employees
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{assignment.installation_address}</p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">
                              {assignment.recommended_visits} visits ({assignment.visit_frequency})
                            </span>
                            <span className="font-medium text-gray-700">
                              {assignment.estimated_hours_per_visit}h each
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proposed Schedule Preview */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-3">
                      Proposed Schedule ({rec.proposed_schedule.length} visits)
                    </h5>
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {rec.proposed_schedule.slice(0, 6).map((visit, idx) => (
                          <div key={visit.id} className="text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">{visit.visit_date}</span>
                              <span className="text-gray-500">{visit.visit_time}</span>
                            </div>
                            <div className="text-gray-500 capitalize">{visit.visit_type}</div>
                          </div>
                        ))}
                        {rec.proposed_schedule.length > 6 && (
                          <div className="text-xs text-gray-500 flex items-center">
                            +{rec.proposed_schedule.length - 6} more visits...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Recommendations */}
        {!isLoading && recommendations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No suitable partners found</h3>
            <p className="text-gray-600 mb-4">Try adjusting the request parameters or adding more partners to the system.</p>
            <button
              onClick={generateRecommendations}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Close
          </button>
          {confirmationStatus === 'sent' && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
            >
              ✅ Assignment Request Sent
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISchedulingModal;