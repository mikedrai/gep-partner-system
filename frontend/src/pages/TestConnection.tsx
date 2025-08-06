import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase.ts';

const TestConnection: React.FC = () => {
  const [connectionTest, setConnectionTest] = useState<any>(null);
  const [partnersData, setPartnersData] = useState<any>(null);
  const [requestsData, setRequestsData] = useState<any>(null);
  const [assignmentsData, setAssignmentsData] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      console.log('🧪 Starting connection test...');
      
      try {
        // Test 0: Check what client we're using  
        const decodeJWT = (token) => {
          try {
            return JSON.parse(atob(token.split('.')[1]));
          } catch {
            return null;
          }
        };
        
        const keyPayload = decodeJWT(supabase.supabaseKey || '');
        console.log('🔑 Supabase client config:', {
          url: supabase.supabaseUrl,
          keyRole: keyPayload?.role,
          isServiceRole: keyPayload?.role === 'service_role'
        });
        
        // Test 1: Basic connection test
        console.log('🔗 Testing basic Supabase connection...');
        try {
          console.log('📡 Trying simple ping to Supabase...');
          const pingResult = await supabase.from('partners').select('count', { count: 'exact', head: true });
          console.log('📡 Ping result:', pingResult);
        } catch (error) {
          console.error('📡 Ping failed:', error);
        }
        
        // Test 2: Partners
        console.log('👥 Testing partners query...');
        try {
          const partnersPromise = supabase
            .from('partners')
            .select('*')
            .limit(5);
          
          // Add timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
          );
          
          const { data: partners, error: partnersError } = await Promise.race([
            partnersPromise,
            timeoutPromise
          ]) as any;
          
          setPartnersData({ data: partners, error: partnersError, count: partners?.length });
          console.log('👥 Partners result:', { data: partners, error: partnersError });
        } catch (error) {
          console.error('👥 Partners query failed:', error);
          setPartnersData({ data: null, error: error, count: 0 });
        }

        // Test 3: Customer Requests
        console.log('📋 Testing customer requests query...');
        const { data: requests, error: requestsError } = await supabase
          .from('customer_requests')
          .select('*')
          .limit(5);
        
        setRequestsData({ data: requests, error: requestsError, count: requests?.length });
        console.log('📋 Requests result:', { data: requests, error: requestsError });

        // Test 4: Assignments
        console.log('🔗 Testing assignments query...');
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .limit(5);
        
        setAssignmentsData({ data: assignments, error: assignmentsError, count: assignments?.length });
        console.log('🔗 Assignments result:', { data: assignments, error: assignmentsError });

        setConnectionTest({
          status: 'success',
          message: 'All tests completed',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('💥 Connection test failed:', error);
        setConnectionTest({
          status: 'error',
          message: error?.toString(),
          timestamp: new Date().toISOString()
        });
      }
    }

    testConnection();
  }, []);

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Database Connection Test</h1>
      
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Connection Status</h2>
          {connectionTest ? (
            <div className={`p-4 rounded-md ${connectionTest.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p><strong>Status:</strong> {connectionTest.status}</p>
              <p><strong>Message:</strong> {connectionTest.message}</p>
              <p><strong>Time:</strong> {connectionTest.timestamp}</p>
            </div>
          ) : (
            <div className="text-gray-500">Testing connection...</div>
          )}
        </div>

        {/* Partners Test */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Partners Table Test</h2>
          {partnersData ? (
            <div>
              <p className="mb-2"><strong>Count:</strong> {partnersData.count || 0} records</p>
              <p className="mb-2"><strong>Error:</strong> {partnersData.error ? JSON.stringify(partnersData.error) : 'None'}</p>
              {partnersData.data && partnersData.data.length > 0 && (
                <div>
                  <p className="mb-2"><strong>Sample Data:</strong></p>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(partnersData.data[0], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Testing partners...</div>
          )}
        </div>

        {/* Customer Requests Test */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Requests Table Test</h2>
          {requestsData ? (
            <div>
              <p className="mb-2"><strong>Count:</strong> {requestsData.count || 0} records</p>
              <p className="mb-2"><strong>Error:</strong> {requestsData.error ? JSON.stringify(requestsData.error) : 'None'}</p>
              {requestsData.data && requestsData.data.length > 0 && (
                <div>
                  <p className="mb-2"><strong>Sample Data:</strong></p>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(requestsData.data[0], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Testing customer requests...</div>
          )}
        </div>

        {/* Assignments Test */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Assignments Table Test</h2>
          {assignmentsData ? (
            <div>
              <p className="mb-2"><strong>Count:</strong> {assignmentsData.count || 0} records</p>
              <p className="mb-2"><strong>Error:</strong> {assignmentsData.error ? JSON.stringify(assignmentsData.error) : 'None'}</p>
              {assignmentsData.data && assignmentsData.data.length > 0 && (
                <div>
                  <p className="mb-2"><strong>Sample Data:</strong></p>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(assignmentsData.data[0], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Testing assignments...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestConnection;