import React, { useState, useEffect } from 'react';

interface PartnerUser {
  id: string;
  name: string;
  specialty: string;
  city: string;
  hourly_rate: number;
}

interface Assignment {
  id: string;
  customer_name: string;
  installation_address: string;
  visit_date: string;
  visit_time: string;
  duration_hours: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  visit_type: 'initial' | 'follow_up' | 'final';
  notes?: string;
  total_cost: number;
}

interface PartnerCalendarProps {
  partner: PartnerUser;
}

const PartnerCalendar: React.FC<PartnerCalendarProps> = ({ partner }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    // Generate sample assignments for the partner
    const generateAssignments = () => {
      const sampleAssignments: Assignment[] = [];
      const today = new Date();
      
      // Past assignments (completed)
      for (let i = 0; i < 8; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7 + Math.floor(Math.random() * 5)));
        
        sampleAssignments.push({
          id: `assign-past-${i}`,
          customer_name: ['ACME Corp', 'TechnoSoft SA', 'MediCare Ltd', 'BuildCorp'][Math.floor(Math.random() * 4)],
          installation_address: ['ΛΕΩΦ. ΣΥΓΓΡΟΥ 350', 'ΜΙΧΑΛΑΚΟΠΟΥΛΟΥ 98', 'ΒΑΣΙΛΙΣΣΗΣ ΣΟΦΙΑΣ 125'][Math.floor(Math.random() * 3)],
          visit_date: date.toISOString().split('T')[0],
          visit_time: ['09:00', '10:30', '14:00', '15:30'][Math.floor(Math.random() * 4)],
          duration_hours: Math.floor(Math.random() * 2) + 1,
          status: 'completed',
          visit_type: ['initial', 'follow_up', 'final'][Math.floor(Math.random() * 3)] as any,
          notes: Math.random() > 0.5 ? 'Visit completed successfully' : undefined,
          total_cost: partner.hourly_rate * (Math.floor(Math.random() * 2) + 1)
        });
      }

      // Future assignments (confirmed)
      for (let i = 0; i < 6; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + (i * 10 + Math.floor(Math.random() * 7) + 3));
        
        sampleAssignments.push({
          id: `assign-future-${i}`,
          customer_name: ['NewTech Industries', 'HealthFirst Clinic', 'SafeWork Solutions', 'EcoManufacturing'][Math.floor(Math.random() * 4)],
          installation_address: ['ΚΗΦΙΣΙΑΣ 230', 'ΠΑΤΗΣΙΩΝ 145', 'ΑΛΕΞΑΝΔΡΑΣ 87'][Math.floor(Math.random() * 3)],
          visit_date: date.toISOString().split('T')[0],
          visit_time: ['09:00', '11:00', '14:00', '16:00'][Math.floor(Math.random() * 4)],
          duration_hours: Math.floor(Math.random() * 2) + 1,
          status: 'confirmed',
          visit_type: ['initial', 'follow_up'][Math.floor(Math.random() * 2)] as any,
          total_cost: partner.hourly_rate * (Math.floor(Math.random() * 2) + 1)
        });
      }

      return sampleAssignments.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
    };

    setAssignments(generateAssignments());
  }, [partner]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVisitTypeIcon = (type: string) => {
    switch (type) {
      case 'initial': return '🏁';
      case 'follow_up': return '🔄';
      case 'final': return '🏆';
      default: return '📋';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  // Filter assignments by current month if in month view
  const filteredAssignments = viewMode === 'month' 
    ? assignments.filter(assignment => {
        const assignmentDate = new Date(assignment.visit_date);
        return assignmentDate.getMonth() === currentDate.getMonth() && 
               assignmentDate.getFullYear() === currentDate.getFullYear();
      })
    : assignments.filter(assignment => {
        const assignmentDate = new Date(assignment.visit_date);
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return assignmentDate >= weekStart && assignmentDate <= weekEnd;
      });

  const pastAssignments = assignments.filter(a => new Date(a.visit_date) < new Date() && a.status === 'completed');
  const upcomingAssignments = assignments.filter(a => new Date(a.visit_date) >= new Date() && a.status === 'confirmed');

  const totalEarnings = pastAssignments.reduce((sum, a) => sum + a.total_cost, 0);
  const totalHours = pastAssignments.reduce((sum, a) => sum + a.duration_hours, 0);

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">{upcomingAssignments.length}</div>
          <div className="text-sm text-gray-600">Upcoming Visits</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">{pastAssignments.length}</div>
          <div className="text-sm text-gray-600">Completed Visits</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-purple-600">{totalHours}h</div>
          <div className="text-sm text-gray-600">Total Hours</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-orange-600">€{totalEarnings.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Earnings</div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-medium text-gray-900">
            {currentDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Today
            </button>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              →
            </button>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'week' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {viewMode === 'month' ? 'This Month' : 'This Week'} ({filteredAssignments.length} visits)
          </h3>
          
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">📅</div>
              <p className="text-gray-500">No visits scheduled for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className={`border rounded-lg p-4 ${getStatusColor(assignment.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getVisitTypeIcon(assignment.visit_type)}</span>
                        <h4 className="font-medium text-gray-900">{assignment.customer_name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(assignment.status)}`}>
                          {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>📍 {assignment.installation_address}</span>
                          <span>🕐 {formatDate(assignment.visit_date)} at {formatTime(assignment.visit_time)}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span>⏱️ {assignment.duration_hours}h duration</span>
                          <span>💰 €{assignment.total_cost}</span>
                          <span className="capitalize">{assignment.visit_type.replace('_', ' ')} visit</span>
                        </div>
                      </div>

                      {assignment.notes && (
                        <div className="mt-2 text-sm text-gray-700 bg-white bg-opacity-50 rounded p-2">
                          <strong>Notes:</strong> {assignment.notes}
                        </div>
                      )}
                    </div>

                    {assignment.status === 'confirmed' && (
                      <div className="ml-4 flex space-x-2">
                        <button className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
            📋 Mark Visit Complete
          </button>
          <button className="px-3 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
            📝 Add Visit Notes
          </button>
          <button className="px-3 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
            🚫 Request Cancellation
          </button>
          <button className="px-3 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">
            📅 Export Calendar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerCalendar;