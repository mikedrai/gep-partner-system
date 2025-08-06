import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth headers if needed
api.interceptors.request.use(
  (config) => {
    // Add any authentication tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export interface CustomerRequest {
  id?: number;
  client_name: string;
  installation_address: string;
  service_type: 'occupational_doctor' | 'safety_engineer';
  employee_count?: number;
  installation_category?: string;
  work_hours?: string;
  start_date?: string;
  end_date?: string;
  special_requirements?: string;
  status?: string;
  estimated_hours?: number;
  max_budget?: number;
  preferred_partner_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Partner {
  id: string;
  name: string;
  specialty: string;
  city: string;
  hourly_rate: number;
  max_hours_per_week: number;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Assignment {
  id: number;
  request_id: number;
  partner_id: string;
  service_type: string;
  assigned_hours: number;
  hourly_rate: number;
  total_cost: number;
  status: string;
  optimization_score?: number;
  travel_distance?: number;
  email_sent_at?: string;
  partner_response?: string;
  partner_responded_at?: string;
  response_deadline?: string;
  created_at?: string;
  updated_at?: string;
  partner?: Partner;
  customer_request?: CustomerRequest;
}

export interface OptimizationResult {
  optimizationId: string;
  assignmentId: number;
  selectedPartner: {
    id: string;
    name: string;
    score: number;
    hourlyRate: number;
    estimatedCost: number;
    distance: number;
  };
  topCandidates: Array<{
    id: string;
    name: string;
    score: number;
    hourly_rate: number;
    distance: number;
  }>;
  executionTimeMs: number;
  emailSent: boolean;
}

// Customer Requests API
export const customerRequestsApi = {
  getAll: (params?: any) => api.get('/api/customer-requests', { params }),
  getById: (id: number) => api.get(`/api/customer-requests/${id}`),
  create: (data: CustomerRequest) => api.post('/api/customer-requests', data),
  update: (id: number, data: Partial<CustomerRequest>) => api.put(`/api/customer-requests/${id}`, data),
  delete: (id: number) => api.delete(`/api/customer-requests/${id}`),
  assign: (id: number, forceReassign = false) => api.post(`/api/customer-requests/${id}/assign`, { force_reassign: forceReassign }),
};

// Partners API
export const partnersApi = {
  getAll: (params?: any) => api.get('/api/partners', { params }),
  getById: (id: string) => api.get(`/api/partners/${id}`),
  create: (data: Partner) => api.post('/api/partners', data),
  update: (id: string, data: Partial<Partner>) => api.put(`/api/partners/${id}`, data),
  delete: (id: string) => api.delete(`/api/partners/${id}`),
  getAvailability: (id: string, params?: any) => api.get(`/api/partners/${id}/availability`, { params }),
  updateAvailability: (id: string, data: any) => api.put(`/api/partners/${id}/availability`, data),
};

// Assignments API
export const assignmentsApi = {
  getAll: (params?: any) => api.get('/api/assignments', { params }),
  getById: (id: number) => api.get(`/api/assignments/${id}`),
  updateResponse: (id: number, response: 'accepted' | 'declined', notes?: string) => 
    api.put(`/api/assignments/${id}/response`, { response, notes }),
  getPending: () => api.get('/api/assignments/pending'),
};

// Optimization API
export const optimizationApi = {
  assign: (requestId: number, options?: { forceReassign?: boolean; constraints?: any }) =>
    api.post('/api/optimization/assign', { requestId, ...options }),
  getResults: (requestId: number) => api.get(`/api/optimization/results/${requestId}`),
  test: (data?: any) => api.post('/api/optimization/test', data),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
  getUtilization: (params?: any) => api.get('/api/analytics/utilization', { params }),
  getCosts: (params?: any) => api.get('/api/analytics/costs', { params }),
  getPerformance: (params?: any) => api.get('/api/analytics/performance', { params }),
};

export default api;