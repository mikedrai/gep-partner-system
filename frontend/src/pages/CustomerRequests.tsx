import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { requestsApi } from '../services/supabaseApi.ts';
import { Link } from 'react-router-dom';
import AISchedulingModal from '../components/AISchedulingModal.tsx';
import { CustomerRequest as AICustomerRequest } from '../services/aiScheduler';

interface CustomerRequest {
  id: number;
  client_name: string;
  installation_address: string;
  service_type: 'occupational_doctor' | 'safety_engineer';
  employee_count?: number;
  installation_category?: string;
  work_hours?: string;
  start_date?: string;
  end_date?: string;
  special_requirements?: string;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  estimated_hours?: number;
  max_budget?: number;
  preferred_partner_id?: string;
  created_at: string;
  updated_at: string;
  assignments?: Array<{
    id: number;
    partner_id: string;
    status: string;
    assigned_hours: number;
    total_cost: number;
    partners: {
      name: string;
      specialty: string;
    };
  }>;
  partners?: {
    name: string;
    specialty: string;
  };
}

const CustomerRequests: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterServiceType, setFilterServiceType] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AICustomerRequest | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Fetch customer requests from Supabase with fallback to localStorage
  const { data: requests = [], isLoading, error } = useQuery<CustomerRequest[]>(
    'customer-requests',
    async () => {
      try {
        const apiRequests = await requestsApi.getAll();
        if (apiRequests && apiRequests.length > 0) {
          return apiRequests;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch requests from API, checking localStorage');
      }
      
      // Fallback to localStorage requests
      const localRequests = JSON.parse(localStorage.getItem('customerRequests') || '[]');
      return localRequests.map((req: any, index: number) => ({
        id: req.id || index + 1,
        client_name: req.client_name,
        installation_address: req.location,
        service_type: req.work_type?.includes('safety') ? 'safety_engineer' : 'occupational_doctor',
        employee_count: req.total_employees,
        installation_category: req.installation_type,
        work_hours: req.hours_of_operation,
        start_date: new Date().toISOString().split('T')[0],
        end_date: req.contract_completion_date,
        special_requirements: req.specific_requests,
        status: req.status || 'pending',
        estimated_hours: req.calculated_hours,
        max_budget: req.estimated_cost,
        created_at: req.created_at || new Date().toISOString(),
        updated_at: req.updated_at || new Date().toISOString()
      }));
    }
  );

  const handleAIScheduling = (request: CustomerRequest) => {
    // Convert CustomerRequest to AICustomerRequest format
    const aiRequest: AICustomerRequest = {
      id: request.id,
      client_name: request.client_name,
      number_of_installations: 1, // Default for existing requests
      total_employees: request.employee_count || 50,
      installation_type: request.installation_category || 'office',
      work_type: request.service_type === 'safety_engineer' ? 'safety_inspection' : 'routine_health_check',
      contract_completion_date: request.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      number_of_visits: undefined,
      hours_of_operation: request.work_hours || '09:00-17:00',
      blocked_dates: [],
      preferred_dates: [],
      specific_requests: request.special_requirements,
      location: request.installation_address,
      contact_email: 'info@demohellas.gr',
      contact_phone: '+30 210 123 4567',
      calculated_hours: request.estimated_hours || 8,
      estimated_cost: request.max_budget || 600,
      priority: request.employee_count && request.employee_count > 100 ? 'high' : 'medium'
    };

    setSelectedRequest(aiRequest);
    setIsAIModalOpen(true);
  };

  const handleCloseAIModal = () => {
    setIsAIModalOpen(false);
    setSelectedRequest(null);
  };

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.installation_address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || request.status === filterStatus;
    const matchesServiceType = !filterServiceType || request.service_type === filterServiceType;
    return matchesSearch && matchesStatus && matchesServiceType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'occupational_doctor': return 'Occupational Doctor';
      case 'safety_engineer': return 'Safety Engineer';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            Error loading customer requests: {(error as Error).message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Customer Requests</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track all customer requests for health inspections
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/requests/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            New Request
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <select
            value={filterServiceType || ''}
            onChange={(e) => setFilterServiceType(e.target.value || null)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Service Types</option>
            <option value="occupational_doctor">Occupational Doctor</option>
            <option value="safety_engineer">Safety Engineer</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredRequests.length} of {requests.length} requests
      </div>

      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
        {filteredRequests.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-gray-500">No requests found matching your criteria.</div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <li key={request.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        Request #{request.id} - {request.client_name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {request.installation_address}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                      {request.assignments && request.assignments.length > 0 && (
                        <span className="text-xs text-gray-500">
                          Assigned to: {request.assignments[0].partners.name}
                        </span>
                      )}
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex space-y-1 sm:space-y-0 sm:space-x-6">
                      <p className="flex items-center text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {getServiceTypeLabel(request.service_type)}
                      </p>
                      
                      {request.employee_count && (
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          {request.employee_count} employees
                        </p>
                      )}

                      {request.estimated_hours && (
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {request.estimated_hours}h estimated
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-500 sm:mt-0">
                      <div className="flex flex-col items-end space-y-1">
                        {request.max_budget && (
                          <p className="font-medium">Budget: €{request.max_budget.toLocaleString()}</p>
                        )}
                        <p className="text-xs">Created: {formatDate(request.created_at)}</p>
                        {request.start_date && (
                          <p className="text-xs">Start: {formatDate(request.start_date)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {request.special_requirements && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Special Requirements:</span> {request.special_requirements}
                      </p>
                    </div>
                  )}

                  {request.assignments && request.assignments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Assignment Details:</span>
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                          <span>Partner: {request.assignments[0].partners.name}</span>
                          <span>Hours: {request.assignments[0].assigned_hours}h</span>
                          <span>Cost: €{request.assignments[0].total_cost}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Scheduling Button for pending requests */}
                  {request.status === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleAIScheduling(request)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Schedule AI Assignment
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Request Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{requests.length}</div>
              <div className="text-sm text-gray-500">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {requests.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {requests.filter(r => r.status === 'assigned').length}
              </div>
              <div className="text-sm text-gray-500">Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {requests.filter(r => r.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Scheduling Modal */}
      {selectedRequest && (
        <AISchedulingModal
          isOpen={isAIModalOpen}
          onClose={handleCloseAIModal}
          customerRequest={selectedRequest}
        />
      )}
    </div>
  );
};

export default CustomerRequests;