import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  return (
    <div className="px-4 sm:px-0">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            GEP Partner Assignment Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to the comprehensive partner assignment system
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
            <dt>
              <div className="absolute rounded-md bg-blue-500 p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0-1.125.504-1.125 1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">Total Requests</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">47</p>
              <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">+12%</p>
            </dd>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
            <dt>
              <div className="absolute rounded-md bg-green-500 p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">Active Partners</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">23</p>
              <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">+3</p>
            </dd>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
            <dt>
              <div className="absolute rounded-md bg-yellow-500 p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">Pending Assignments</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">8</p>
              <p className="ml-2 flex items-baseline text-sm font-semibold text-red-600">-2</p>
            </dd>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
            <dt>
              <div className="absolute rounded-md bg-purple-500 p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">Completed This Month</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">31</p>
              <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">+8%</p>
            </dd>
          </div>
        </dl>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/requests/new"
            className="relative group rounded-lg border border-gray-300 bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer hover:border-blue-300"
          >
            <div>
              <span className="inline-flex rounded-lg p-3 bg-blue-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-medium text-gray-900">New Request</h3>
              <p className="mt-2 text-sm text-gray-500">Create a new customer request</p>
            </div>
          </Link>

          <Link
            to="/partners"
            className="relative group rounded-lg border border-gray-300 bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer hover:border-green-300"
          >
            <div>
              <span className="inline-flex rounded-lg p-3 bg-green-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-medium text-gray-900">Manage Partners</h3>
              <p className="mt-2 text-sm text-gray-500">View and manage partner availability</p>
            </div>
          </Link>

          <Link
            to="/assignments"
            className="relative group rounded-lg border border-gray-300 bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer hover:border-yellow-300"
          >
            <div>
              <span className="inline-flex rounded-lg p-3 bg-yellow-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h4.125m0-15.75c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125m-4.5 0v3.75A2.25 2.25 0 0010.5 6h3A2.25 2.25 0 0015.75 3.75V3a.75.75 0 00-.75-.75h-3z" />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-medium text-gray-900">View Assignments</h3>
              <p className="mt-2 text-sm text-gray-500">Monitor current assignments</p>
            </div>
          </Link>

          <Link
            to="/analytics"
            className="relative group rounded-lg border border-gray-300 bg-white p-6 hover:shadow-lg transition-shadow cursor-pointer hover:border-purple-300"
          >
            <div>
              <span className="inline-flex rounded-lg p-3 bg-purple-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-base font-medium text-gray-900">Analytics</h3>
              <p className="mt-2 text-sm text-gray-500">View performance metrics</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;