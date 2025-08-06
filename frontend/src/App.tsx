import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Layout from './components/Layout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import CustomerRequests from './pages/CustomerRequests.tsx';
import Partners from './pages/Partners.tsx';
import NewRequest from './pages/NewRequest.tsx';
import Assignments from './pages/Assignments.tsx';
import Analytics from './pages/Analytics.tsx';
import TestConnection from './pages/TestConnection.tsx';
import TraceabilityDashboard from './pages/TraceabilityDashboard.tsx';
import PartnerDashboard from './pages/PartnerDashboard.tsx';
import Login from './pages/Login.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AppContent: React.FC = () => {
  const { isAuthenticated, login, loading, user } = useAuth();
  const [partnerActiveTab, setPartnerActiveTab] = React.useState('calendar');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  // Partner users get their own dedicated dashboard
  if (user?.role === 'partner') {
    return (
      <Layout 
        activeTab={partnerActiveTab} 
        onTabChange={setPartnerActiveTab}
      >
        <Routes>
          <Route path="/*" element={<PartnerDashboard activeTab={partnerActiveTab} />} />
        </Routes>
      </Layout>
    );
  }

  // Admin/Manager users get full system access
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/requests" element={<CustomerRequests />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/traceability" element={<TraceabilityDashboard />} />
        <Route path="/test" element={<TestConnection />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;