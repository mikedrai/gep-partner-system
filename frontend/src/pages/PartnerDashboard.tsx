import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext.tsx';
import PartnerCalendar from '../components/PartnerCalendar.tsx';
import PartnerPendingRequests from '../components/PartnerPendingRequests.tsx';
import PartnerChangeRequests from '../components/PartnerChangeRequests.tsx';
import PartnerReports from '../components/PartnerReports.tsx';
import PartnerProfile from '../components/PartnerProfile.tsx';

interface PartnerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  city: string;
  hourly_rate: number;
  max_hours_per_week: number;
  working_hours: string;
  blocked_days: string[];
  experience_years: number;
  availability_status: string;
  is_active: boolean;
  rating: number;
}

interface PartnerDashboardProps {
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ onTabChange, activeTab: externalActiveTab }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'pending' | 'changes' | 'reports' | 'profile'>('calendar');
  const [currentPartner, setCurrentPartner] = useState<PartnerUser | null>(null);

  // Use external active tab if provided (from Layout navigation)
  const currentActiveTab = externalActiveTab || activeTab;

  useEffect(() => {
    // Get partner info from authenticated user
    if (user?.role === 'partner') {
      const partnerData: PartnerUser = {
        id: user.id,
        name: user.name || 'Partner User',
        email: user.email,
        phone: '+30 210 555 0123', // Would come from partner profile
        specialty: 'Παθολόγος', // Would come from partner profile
        city: 'ΓΕΡΑΚΑΣ', // Would come from partner profile
        hourly_rate: 75,
        max_hours_per_week: 40,
        working_hours: '09:00-17:00',
        blocked_days: ['Sunday'],
        experience_years: 8,
        availability_status: 'Available',
        is_active: true,
        rating: 4.5
      };
      setCurrentPartner(partnerData);
    }
  }, [user]);

  // Handle tab changes from external navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'calendar' | 'pending' | 'changes' | 'reports' | 'profile');
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Update local active tab when external tab changes
  useEffect(() => {
    if (externalActiveTab && externalActiveTab !== activeTab) {
      setActiveTab(externalActiveTab as 'calendar' | 'pending' | 'changes' | 'reports' | 'profile');
    }
  }, [externalActiveTab, activeTab]);

  if (!currentPartner) {
    return (
      <div className="px-4 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">
              {currentPartner.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {currentPartner.name}
            </h1>
            <p className="text-sm text-gray-600">
              {currentPartner.specialty} • {currentPartner.city}
            </p>
            <div className="flex items-center space-x-4 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentPartner.availability_status === 'Available'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {currentPartner.availability_status}
              </span>
              <span className="text-sm text-gray-500">
                ⭐ {currentPartner.rating.toFixed(1)} rating
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {currentActiveTab === 'calendar' && <PartnerCalendar partner={currentPartner} />}
        {currentActiveTab === 'pending' && <PartnerPendingRequests partner={currentPartner} />}
        {currentActiveTab === 'changes' && <PartnerChangeRequests partner={currentPartner} />}
        {currentActiveTab === 'reports' && <PartnerReports partner={currentPartner} />}
        {currentActiveTab === 'profile' && <PartnerProfile partner={currentPartner} />}
      </div>
    </div>
  );
};

export default PartnerDashboard;