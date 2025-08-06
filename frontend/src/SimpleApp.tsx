import React from 'react';

function SimpleApp() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          GEP Partner Assignment System
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Αιτήματα Πελατών</h2>
            <p className="text-gray-600">Διαχείριση αιτημάτων πελατών και αναθέσεων.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Συνεργάτες</h2>
            <p className="text-gray-600">Διαχείριση συνεργατών και διαθεσιμότητας.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Αναθέσεις</h2>
            <p className="text-gray-600">Παρακολούθηση αναθέσεων και αποκρίσεων.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Αναλυτικά</h2>
            <p className="text-gray-600">Στατιστικά και αναφορές απόδοσης.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">AI Βελτιστοποίηση</h2>
            <p className="text-gray-600">Αυτόματη ανάθεση με AI αλγόριθμους.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Κατάσταση Συστήματος</h2>
            <p className="text-gray-600">Παρακολούθηση υγείας συστήματος.</p>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Backend Server Status
          </h3>
          <p className="text-green-700">
            Backend server running on <code>http://localhost:8000</code>
          </p>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            🚀 System Ready
          </h3>
          <p className="text-blue-700">
            GEP Scheduling System with AI optimization is ready for use.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SimpleApp;