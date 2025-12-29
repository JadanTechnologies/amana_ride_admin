import type { Metadata } from 'next';
import AdminLoginInteractive from './components/AdminLoginInteractive';

export const metadata: Metadata = {
  title: 'Admin Login - Amana Ride',
  description: 'Secure authentication gateway for Amana Ride administrative platform access with enterprise-grade security.',
};

export default function AdminLogin() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Amana Ride Admin</h1>
          <p className="text-gray-600 mt-2">Management & Operations Dashboard</p>
          
          {/* Web App Notice */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-left text-sm">
                <p className="font-semibold text-blue-900">Web Application for Management Only</p>
                <p className="text-blue-700 mt-1">This platform is exclusively for Super Admin and management staff. Drivers and passengers use dedicated mobile applications.</p>
              </div>
            </div>
          </div>
        </div>

        <AdminLoginInteractive />
      </div>
    </div>
  );
}