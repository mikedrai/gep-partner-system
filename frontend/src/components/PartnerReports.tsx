import React, { useState, useEffect } from 'react';

interface PartnerUser {
  id: string;
  name: string;
  specialty: string;
  city: string;
  hourly_rate: number;
}

interface VisitData {
  id: string;
  customer_name: string;
  visit_date: string;
  duration_hours: number;
  total_cost: number;
  visit_type: string;
  status: 'completed' | 'confirmed' | 'cancelled';
}

interface ReportSummary {
  totalVisits: number;
  totalHours: number;
  totalEarnings: number;
  averageHourlyRate: number;
  completionRate: number;
  topCustomers: { name: string; visits: number; earnings: number }[];
  monthlyTrends: { month: string; visits: number; earnings: number }[];
}

interface PartnerReportsProps {
  partner: PartnerUser;
}

const PartnerReports: React.FC<PartnerReportsProps> = ({ partner }) => {
  const [reportData, setReportData] = useState<ReportSummary | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitData[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30d' | '90d' | '6m' | '1y'>('90d');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'export'>('summary');

  useEffect(() => {
    generateReportData();
  }, [partner, selectedTimeRange]);

  const generateReportData = () => {
    // Generate synthetic visit data based on time range
    const now = new Date();
    const daysBack = selectedTimeRange === '30d' ? 30 : 
                     selectedTimeRange === '90d' ? 90 :
                     selectedTimeRange === '6m' ? 180 : 365;

    const visits: VisitData[] = [];
    const customers = ['TechnoCorp SA', 'HealthFirst Manufacturing', 'SafeWork Solutions', 'MediCare Ltd', 'BuildCorp', 'EcoManufacturing'];
    
    // Generate historical visits
    for (let i = 0; i < 25; i++) {
      const visitDate = new Date(now);
      visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * daysBack));
      
      const hours = Math.floor(Math.random() * 3) + 1;
      const visit: VisitData = {
        id: `visit-${i}`,
        customer_name: customers[Math.floor(Math.random() * customers.length)],
        visit_date: visitDate.toISOString().split('T')[0],
        duration_hours: hours,
        total_cost: partner.hourly_rate * hours,
        visit_type: ['initial', 'follow_up', 'final'][Math.floor(Math.random() * 3)],
        status: Math.random() > 0.1 ? 'completed' : 'cancelled'
      };
      visits.push(visit);
    }

    visits.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    setVisitHistory(visits);

    // Calculate summary statistics
    const completedVisits = visits.filter(v => v.status === 'completed');
    const totalHours = completedVisits.reduce((sum, v) => sum + v.duration_hours, 0);
    const totalEarnings = completedVisits.reduce((sum, v) => sum + v.total_cost, 0);

    // Customer analysis
    const customerStats = customers.map(customer => {
      const customerVisits = completedVisits.filter(v => v.customer_name === customer);
      return {
        name: customer,
        visits: customerVisits.length,
        earnings: customerVisits.reduce((sum, v) => sum + v.total_cost, 0)
      };
    }).sort((a, b) => b.earnings - a.earnings).slice(0, 5);

    // Monthly trends
    const monthlyData: { [key: string]: { visits: number; earnings: number } } = {};
    completedVisits.forEach(visit => {
      const monthKey = visit.visit_date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { visits: 0, earnings: 0 };
      }
      monthlyData[monthKey].visits++;
      monthlyData[monthKey].earnings += visit.total_cost;
    });

    const monthlyTrends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('el-GR', { month: 'short', year: 'numeric' }),
        visits: data.visits,
        earnings: data.earnings
      }));

    const summary: ReportSummary = {
      totalVisits: completedVisits.length,
      totalHours,
      totalEarnings,
      averageHourlyRate: totalEarnings / totalHours || 0,
      completionRate: (completedVisits.length / visits.length) * 100,
      topCustomers: customerStats,
      monthlyTrends
    };

    setReportData(summary);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Customer', 'Duration (Hours)', 'Earnings (€)', 'Visit Type', 'Status'];
    const csvContent = [
      headers.join(','),
      ...visitHistory.map(visit => [
        visit.visit_date,
        `"${visit.customer_name}"`,
        visit.duration_hours,
        visit.total_cost,
        visit.visit_type,
        visit.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-report-${partner.name.replace(/\s+/g, '-')}-${selectedTimeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // This would integrate with a PDF library like jsPDF
    alert('PDF export functionality would be implemented here with a library like jsPDF');
  };

  if (!reportData) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Performance Reports</h2>
          <p className="text-sm text-gray-600">
            Analytics and insights for your assignment performance
          </p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
          
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="summary">Summary View</option>
            <option value="detailed">Detailed View</option>
            <option value="export">Export Options</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">📋</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-2xl font-bold text-gray-900">{reportData.totalVisits}</div>
              <div className="text-sm font-medium text-gray-500">Total Visits</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">⏱️</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-2xl font-bold text-gray-900">{reportData.totalHours}h</div>
              <div className="text-sm font-medium text-gray-500">Total Hours</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-bold">💰</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-2xl font-bold text-gray-900">€{reportData.totalEarnings.toLocaleString()}</div>
              <div className="text-sm font-medium text-gray-500">Total Earnings</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">✅</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="text-2xl font-bold text-gray-900">{reportData.completionRate.toFixed(1)}%</div>
              <div className="text-sm font-medium text-gray-500">Completion Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on selected view */}
      {reportType === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Top Customers</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {reportData.topCustomers.map((customer, index) => (
                  <div key={customer.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.visits} visits</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      €{customer.earnings.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Monthly Trends</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {reportData.monthlyTrends.map((month) => (
                  <div key={month.month} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{month.month}</div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">{month.visits} visits</div>
                      <div className="text-sm font-medium text-gray-900">€{month.earnings.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {reportType === 'detailed' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Visit History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visitHistory.slice(0, 20).map((visit) => (
                    <tr key={visit.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(visit.visit_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {visit.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {visit.duration_hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        €{visit.total_cost}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {visit.visit_type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          visit.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {visit.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportType === 'export' && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">CSV Export</h4>
                  <p className="text-xs text-gray-500">Download detailed visit data</p>
                </div>
              </div>
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                Download CSV
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">📄</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">PDF Report</h4>
                  <p className="text-xs text-gray-500">Formatted summary report</p>
                </div>
              </div>
              <button
                onClick={exportToPDF}
                className="w-full px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Generate PDF
              </button>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Export Information</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• CSV files include all visit details and can be opened in Excel</li>
              <li>• PDF reports contain summary statistics and charts</li>
              <li>• Exports are limited to the selected time range</li>
              <li>• All data is filtered for your assignments only</li>
            </ul>
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">📈 Performance Insights</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• Your completion rate of {reportData.completionRate.toFixed(1)}% is {reportData.completionRate > 95 ? 'excellent' : reportData.completionRate > 90 ? 'good' : 'needs improvement'}</div>
          <div>• Average earnings per visit: €{(reportData.totalEarnings / reportData.totalVisits).toFixed(0)}</div>
          <div>• Most productive month: {reportData.monthlyTrends.reduce((max, month) => month.earnings > max.earnings ? month : max, reportData.monthlyTrends[0])?.month}</div>
          <div>• Top customer: {reportData.topCustomers[0]?.name} (€{reportData.topCustomers[0]?.earnings.toLocaleString()} earned)</div>
        </div>
      </div>
    </div>
  );
};

export default PartnerReports;