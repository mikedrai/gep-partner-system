import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ContractProposalData {
  timestamp: string;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

interface StreamingData {
  contractProposals: ContractProposalData[];
  lastUpdated: string;
}

const Analytics: React.FC = () => {
  const [streamingData, setStreamingData] = useState<StreamingData>({
    contractProposals: [],
    lastUpdated: new Date().toISOString()
  });
  const [isStreaming, setIsStreaming] = useState(true);

  // Generate realistic streaming data
  const generateContractData = (): ContractProposalData => {
    const now = new Date();
    const baseTime = now.getTime();
    
    // Get existing data from localStorage for consistency
    const existingAssignments = JSON.parse(localStorage.getItem('assignmentRequests') || '[]');
    const existingConfirmed = JSON.parse(localStorage.getItem('confirmedAssignments') || '[]');
    const existingDeclined = JSON.parse(localStorage.getItem('declinedAssignments') || '[]');
    
    // Calculate real counts with some randomness for streaming effect
    const basePending = existingAssignments.length + Math.floor(Math.random() * 5);
    const baseApproved = existingConfirmed.length + Math.floor(Math.random() * 3);
    const baseRejected = existingDeclined.length + Math.floor(Math.random() * 2);
    
    return {
      timestamp: now.toISOString(),
      pending: Math.max(0, basePending),
      approved: Math.max(0, baseApproved),
      rejected: Math.max(0, baseRejected),
      total: basePending + baseApproved + baseRejected
    };
  };

  // Update streaming data
  const updateStreamingData = () => {
    const newData = generateContractData();
    setStreamingData(prev => ({
      contractProposals: [...prev.contractProposals.slice(-29), newData], // Keep last 30 data points
      lastUpdated: new Date().toISOString()
    }));
  };

  // Initialize and set up streaming
  useEffect(() => {
    // Initial data load
    const initialData: ContractProposalData[] = [];
    const now = new Date();
    
    // Generate initial 10 data points for chart history
    for (let i = 9; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 30000); // 30 second intervals
      const data = generateContractData();
      data.timestamp = timestamp.toISOString();
      initialData.push(data);
    }
    
    setStreamingData({
      contractProposals: initialData,
      lastUpdated: now.toISOString()
    });

    // Set up 30-second interval
    const interval = setInterval(() => {
      if (isStreaming) {
        updateStreamingData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isStreaming]);

  const toggleStreaming = () => {
    setIsStreaming(!isStreaming);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCurrentData = () => {
    const latest = streamingData.contractProposals[streamingData.contractProposals.length - 1];
    return latest || { pending: 0, approved: 0, rejected: 0, total: 0 };
  };

  const currentData = getCurrentData();

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isStreaming ? 'Live' : 'Paused'}
            </span>
          </div>
          <button
            onClick={toggleStreaming}
            className={`px-3 py-1 text-sm rounded-md ${
              isStreaming 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isStreaming ? '⏸️ Pause' : '▶️ Resume'}
          </button>
          <span className="text-xs text-gray-500">
            Updated: {formatTime(streamingData.lastUpdated)}
          </span>
        </div>
      </div>

      {/* Real-time Contract Proposal Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-yellow-400">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-bold">⏳</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-2xl font-bold text-gray-900">{currentData.pending}</div>
              <div className="text-sm font-medium text-gray-500">Pending Proposals</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-green-400">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">✅</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-2xl font-bold text-gray-900">{currentData.approved}</div>
              <div className="text-sm font-medium text-gray-500">Approved Proposals</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-red-400">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">❌</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-2xl font-bold text-gray-900">{currentData.rejected}</div>
              <div className="text-sm font-medium text-gray-500">Rejected Proposals</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-400">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">📊</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-2xl font-bold text-gray-900">{currentData.total}</div>
              <div className="text-sm font-medium text-gray-500">Total Proposals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Contract Proposals Chart */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            🥧 Contract Proposals Distribution
          </h3>
          <div className="text-sm text-gray-500">
            Current snapshot - Updates every 30 seconds
          </div>
        </div>
        
        <div className="h-80">
          {streamingData.contractProposals.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pending', value: currentData.pending, color: '#FBC02D' },
                    { name: 'Approved', value: currentData.approved, color: '#4CAF50' },
                    { name: 'Rejected', value: currentData.rejected, color: '#F44336' }
                  ].filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Pending', value: currentData.pending, color: '#FBC02D' },
                    { name: 'Approved', value: currentData.approved, color: '#4CAF50' },
                    { name: 'Rejected', value: currentData.rejected, color: '#F44336' }
                  ].filter(item => item.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading streaming data...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Data Table */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📋 Recent Activity Log</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rejected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {streamingData.contractProposals.slice(-5).reverse().map((data, index) => (
                <tr key={data.timestamp} className={index === 0 ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(data.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600">
                    {data.pending}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {data.approved}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {data.rejected}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Static Analytics (existing) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Average Response Time</span>
              <span className="font-medium">2.3 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Partner Utilization</span>
              <span className="font-medium">78%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer Satisfaction</span>
              <span className="font-medium">4.6/5</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Average Cost per Assignment</span>
              <span className="font-medium">€2,450</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Revenue</span>
              <span className="font-medium">€34,800</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Profit Margin</span>
              <span className="font-medium">23%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;