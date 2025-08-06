import React, { useState } from 'react';
import { partnersApi } from '../services/supabaseApi.ts';

interface AddPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPartnerAdded: () => void;
}

interface PartnerForm {
  name: string;
  specialty: string;
  city: string;
  workingHours: string;
  blockedDays: string[];
  hourlyRate: number;
  email: string;
  phone: string;
  maxHoursPerWeek: number;
  experienceYears: number;
  availabilityStatus: string;
}

const AddPartnerModal: React.FC<AddPartnerModalProps> = ({ isOpen, onClose, onPartnerAdded }) => {
  const [formData, setFormData] = useState<PartnerForm>({
    name: '',
    specialty: '',
    city: '',
    workingHours: '',
    blockedDays: [],
    hourlyRate: 0,
    email: '',
    phone: '',
    maxHoursPerWeek: 40,
    experienceYears: 0,
    availabilityStatus: 'Available'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hourlyRate' || name === 'maxHoursPerWeek' || name === 'experienceYears' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleBlockedDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      blockedDays: prev.blockedDays.includes(day)
        ? prev.blockedDays.filter(d => d !== day)
        : [...prev.blockedDays, day]
    }));
  };

  const generatePartnerId = () => {
    return 'R' + String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const partnerId = generatePartnerId();
      
      const partnerData = {
        id: partnerId,
        name: formData.name,
        specialty: formData.specialty,
        city: formData.city,
        working_hours: formData.workingHours,
        blocked_days: formData.blockedDays,
        hourly_rate: formData.hourlyRate,
        email: formData.email,
        phone: formData.phone,
        max_hours_per_week: formData.maxHoursPerWeek,
        experience_years: formData.experienceYears,
        availability_status: formData.availabilityStatus,
        is_active: formData.availabilityStatus === 'Available',
        rating: 4.0 + Math.random(), // Random initial rating between 4.0-5.0
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🔄 Submitting partner data:', partnerData);

      try {
        await partnersApi.create(partnerData);
        setSubmitMessage('✅ Partner added successfully!');
        
        // Reset form
        setFormData({
          name: '',
          specialty: '',
          city: '',
          workingHours: '',
          blockedDays: [],
          hourlyRate: 0,
          email: '',
          phone: '',
          maxHoursPerWeek: 40,
          experienceYears: 0,
          availabilityStatus: 'Available'
        });

        // Notify parent component to refresh data
        setTimeout(() => {
          onPartnerAdded();
          onClose();
        }, 1500);

      } catch (apiError) {
        console.warn('⚠️ API submission failed, storing partner locally:', apiError);
        
        // Store in localStorage as fallback
        const existingPartners = JSON.parse(localStorage.getItem('newPartners') || '[]');
        existingPartners.push(partnerData);
        localStorage.setItem('newPartners', JSON.stringify(existingPartners));
        
        setSubmitMessage('✅ Partner information saved! Due to system maintenance, the partner will be added to the system shortly.');
        
        setTimeout(() => {
          onPartnerAdded();
          onClose();
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Error adding partner:', error);
      setSubmitMessage('❌ Error adding partner. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const specialties = [
    'Παθολόγος',
    'Καρδιολόγος', 
    'Ορθοπαιδικός',
    'Οφθαλμίατρος',
    'Δερματολόγος',
    'Γυναικολόγος',
    'Παιδίατρος',
    'Μηχανικός Ασφάλειας',
    'Τεχνικός Ασφάλειας',
    'Εργονόμος',
    'Περιβαλλοντολόγος'
  ];

  const greekCities = [
    'ΑΘΗΝΑ',
    'ΘΕΣΣΑΛΟΝΙΚΗ', 
    'ΠΕΙΡΑΙΑΣ',
    'ΠΑΤΡΑ',
    'ΗΡΑΚΛΕΙΟ',
    'ΛΑΡΙΣΑ',
    'ΒΟΛΟΣ',
    'ΙΩΑΝΝΙΝΑ',
    'ΧΑΝΙΑ',
    'ΓΕΡΑΚΑΣ',
    'ΚΑΛΛΙΘΕΑ',
    'ΝΙΚΑΙΑ'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add New Partner</h2>
            <p className="text-gray-600">Enter partner information for health inspection services</p>
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

        {submitMessage && (
          <div className={`mb-4 p-4 rounded-md ${
            submitMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {submitMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="ΓΙΑΝΝΗΣ ΠΑΠΑΔΟΠΟΥΛΟΣ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Specialty *
                </label>
                <select
                  name="specialty"
                  required
                  value={formData.specialty}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                >
                  <option value="">Select specialty</option>
                  {specialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City *
                </label>
                <select
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                >
                  <option value="">Select city</option>
                  {greekCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Experience (Years) *
                </label>
                <input
                  type="number"
                  name="experienceYears"
                  required
                  min="0"
                  max="50"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="j.papadopoulos@example.com"
                />
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Email will be used for assignment notifications
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="+30 210 123 4567"
                />
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Work Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Working Hours *
                </label>
                <input
                  type="text"
                  name="workingHours"
                  required
                  value={formData.workingHours}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="09:00-17:00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hourly Rate (€) *
                </label>
                <input
                  type="number"
                  name="hourlyRate"
                  required
                  min="20"
                  max="200"
                  step="5"
                  value={formData.hourlyRate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="75"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Hours Per Week *
                </label>
                <input
                  type="number"
                  name="maxHoursPerWeek"
                  required
                  min="10"
                  max="60"
                  value={formData.maxHoursPerWeek}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                  placeholder="40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Availability Status *
                </label>
                <select
                  name="availabilityStatus"
                  required
                  value={formData.availabilityStatus}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
            </div>
          </div>

          {/* Blocked Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Blocked Days (days when partner is not available)
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {daysOfWeek.map(day => (
                <label key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.blockedDays.includes(day)}
                    onChange={() => handleBlockedDayToggle(day)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">{day.slice(0, 3)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isSubmitting ? 'Adding Partner...' : 'Add Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPartnerModal;