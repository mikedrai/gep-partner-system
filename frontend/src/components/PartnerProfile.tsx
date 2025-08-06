import React, { useState } from 'react';

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

interface PartnerProfileProps {
  partner: PartnerUser;
}

const PartnerProfile: React.FC<PartnerProfileProps> = ({ partner }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: partner.name,
    email: partner.email,
    phone: partner.phone,
    specialty: partner.specialty,
    city: partner.city,
    hourly_rate: partner.hourly_rate,
    max_hours_per_week: partner.max_hours_per_week,
    working_hours: partner.working_hours,
    blocked_days: [...partner.blocked_days],
    experience_years: partner.experience_years,
    availability_status: partner.availability_status
  });
  const [saveMessage, setSaveMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hourly_rate' || name === 'max_hours_per_week' || name === 'experience_years' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleBlockedDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      blocked_days: prev.blocked_days.includes(day)
        ? prev.blocked_days.filter(d => d !== day)
        : [...prev.blocked_days, day]
    }));
  };

  const handleSave = async () => {
    setSaveMessage('Saving changes...');
    
    // Simulate API call
    setTimeout(() => {
      // In a real app, this would update the partner data via API
      const updatedPartner = {
        ...partner,
        ...formData
      };
      
      // Store updated profile locally
      const existingPartners = JSON.parse(localStorage.getItem('partnerProfiles') || '[]');
      const updatedPartners = existingPartners.filter((p: any) => p.id !== partner.id);
      updatedPartners.push(updatedPartner);
      localStorage.setItem('partnerProfiles', JSON.stringify(updatedPartners));
      
      setSaveMessage('✅ Profile updated successfully!');
      setIsEditing(false);
      
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1500);
  };

  const handleCancel = () => {
    setFormData({
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      specialty: partner.specialty,
      city: partner.city,
      hourly_rate: partner.hourly_rate,
      max_hours_per_week: partner.max_hours_per_week,
      working_hours: partner.working_hours,
      blocked_days: [...partner.blocked_days],
      experience_years: partner.experience_years,
      availability_status: partner.availability_status
    });
    setIsEditing(false);
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
          <p className="text-sm text-gray-600">
            Manage your personal information and availability preferences
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-4 rounded-md ${
          saveMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Profile Content */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {partner.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-900">{partner.name}</h3>
              <p className="text-sm text-gray-600">{partner.specialty} • {partner.city}</p>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  partner.availability_status === 'Available'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {partner.availability_status}
                </span>
                <span className="text-sm text-gray-500">
                  ⭐ {partner.rating.toFixed(1)} rating
                </span>
                <span className="text-sm text-gray-500">
                  ID: {partner.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.name}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialty *
                  </label>
                  {isEditing ? (
                    <select
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {specialties.map(specialty => (
                        <option key={specialty} value={specialty}>{specialty}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.specialty}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  {isEditing ? (
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {greekCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.city}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (Years) *
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="experience_years"
                      min="0"
                      max="50"
                      value={formData.experience_years}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.experience_years} years</div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.email}</div>
                  )}
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Used for assignment notifications
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.phone}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="mt-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Work Information</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Working Hours *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="working_hours"
                      value={formData.working_hours}
                      onChange={handleInputChange}
                      placeholder="09:00-17:00"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.working_hours}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate (€) *
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="hourly_rate"
                      min="20"
                      max="200"
                      step="5"
                      value={formData.hourly_rate}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-2">€{partner.hourly_rate}/hour</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Hours Per Week *
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="max_hours_per_week"
                      min="10"
                      max="60"
                      value={formData.max_hours_per_week}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.max_hours_per_week} hours</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Availability Status *
                  </label>
                  {isEditing ? (
                    <select
                      name="availability_status"
                      value={formData.availability_status}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  ) : (
                    <div className="text-sm text-gray-900 py-2">{partner.availability_status}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Blocked Days */}
          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Blocked Days (days when you're not available)
            </label>
            {isEditing ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                {daysOfWeek.map(day => (
                  <label key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.blocked_days.includes(day)}
                      onChange={() => handleBlockedDayToggle(day)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {partner.blocked_days.length === 0 ? (
                  <span className="text-sm text-gray-500">No blocked days</span>
                ) : (
                  partner.blocked_days.map(day => (
                    <span key={day} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {day}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Account Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Partner ID:</span>
            <div className="font-medium text-gray-900">{partner.id}</div>
          </div>
          <div>
            <span className="text-gray-500">Account Status:</span>
            <div className={`font-medium ${partner.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {partner.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Rating:</span>
            <div className="font-medium text-gray-900">⭐ {partner.rating.toFixed(1)}/5.0</div>
          </div>
          <div>
            <span className="text-gray-500">Member Since:</span>
            <div className="font-medium text-gray-900">January 2024</div>
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h4>
        <div className="space-y-4">
          <div>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              🔒 Change Password
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Last password change: 30 days ago
            </p>
          </div>
          <div>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              📱 Enable Two-Factor Authentication
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Add extra security to your account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerProfile;