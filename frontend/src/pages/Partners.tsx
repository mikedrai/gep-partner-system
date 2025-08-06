import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { partnersApi } from '../services/supabaseApi.ts';
import PartnerDetailModal from '../components/PartnerDetailModal.tsx';
import AddPartnerModal from '../components/AddPartnerModal.tsx';

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  city: string;
  hourly_rate: number;
  max_hours_per_week: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Partners: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch partners from Supabase
  const { data: partners = [], isLoading, error } = useQuery<Partner[]>(
    'partners',
    partnersApi.getAll
  );

  // Debug: Log the partners data
  console.log('🔍 Partners component - Raw data:', partners);
  console.log('🔍 Partners component - Data length:', partners?.length);
  console.log('🔍 Partners component - First partner:', partners?.[0]);

  // Filter partners based on search and active status
  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = filterActive === null || partner.is_active === filterActive;
    return matchesSearch && matchesActive;
  });

  const handlePartnerClick = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPartner(null);
  };

  const handleAddPartner = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handlePartnerAdded = () => {
    // Refresh the partners list
    queryClient.invalidateQueries('partners');
  };

  console.log('🔍 Partners component - Filtered partners:', filteredPartners.length);

  // Calculate statistics
  const stats = {
    total: partners.length,
    active: partners.filter(p => p.is_active === true).length,
    occupationalDoctors: partners.filter(p => p.specialty.toLowerCase().includes('παθολόγος')).length,
    safetyEngineers: partners.filter(p => p.specialty.toLowerCase().includes('μηχανικός')).length,
    averageRate: partners.length > 0 
      ? Math.round(partners.reduce((sum, p) => sum + p.hourly_rate, 0) / partners.length) 
      : 0
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getColorForPartner = (index: number) => {
    const colors = ['blue', 'green', 'purple', 'orange', 'red', 'indigo'];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
            Error loading partners: {(error as Error).message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Partners</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage partners and their availability for health inspections
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={handleAddPartner}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Add Partner
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={filterActive === null ? 'all' : filterActive.toString()}
            onChange={(e) => setFilterActive(e.target.value === 'all' ? null : e.target.value === 'true')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Partners</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Partners Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPartners.map((partner, index) => {
          const color = getColorForPartner(index);
          return (
            <div key={partner.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-12 w-12 rounded-full bg-${color}-100 flex items-center justify-center`}>
                      <span className={`text-lg font-medium text-${color}-600`}>
                        {getInitials(partner.name)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => handlePartnerClick(partner)}>
                        {partner.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        partner.is_active
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {partner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {partner.specialty}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Location:</span>
                    <span className="text-gray-900">{partner.city}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Hourly Rate:</span>
                    <span className="text-gray-900 font-medium">€{partner.hourly_rate}/hour</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Max Hours/Week:</span>
                    <span className="text-gray-900">{partner.max_hours_per_week}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Email:</span>
                    <span className="text-gray-900 text-xs truncate">{partner.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900 text-xs">{partner.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPartners.length === 0 && (
        <div className="mt-6 text-center py-12">
          <div className="text-gray-500">No partners found matching your criteria.</div>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Partner Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Partners</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
              <div className="text-sm text-gray-500">Active Partners</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.occupationalDoctors}</div>
              <div className="text-sm text-gray-500">Occupational Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.safetyEngineers}</div>
              <div className="text-sm text-gray-500">Safety Engineers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">€{stats.averageRate}</div>
              <div className="text-sm text-gray-500">Average Rate/Hour</div>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Detail Modal */}
      {selectedPartner && (
        <PartnerDetailModal
          partner={selectedPartner}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
        />
      )}

      {/* Add Partner Modal */}
      <AddPartnerModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onPartnerAdded={handlePartnerAdded}
      />
    </div>
  );
};

export default Partners;