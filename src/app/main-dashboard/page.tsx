'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';
import NavigationBreadcrumbs from '@/components/common/NavigationBreadcrumbs';
import DashboardInteractive from './components/DashboardInteractive';
import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';

export default function MainDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string>('');

  // Check if user is super admin
  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user) {
        setCheckingAuth(false);
        setIsSuperAdmin(false);
        return;
      }

      try {
        // Call the database function to check super admin status
        const { data, error } = await supabase.rpc('is_super_admin');
        
        if (error) {
          // Check if it's a connection error
          if (error.message?.includes('Failed to fetch') || 
              error.message?.includes('NetworkError')) {
            setAuthError('Cannot connect to database. Please check your connection.');
          } else {
            setAuthError(`Authorization check failed: ${error.message}`);
          }
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data);
          if (!data) {
            setAuthError('You do not have super admin privileges to access this page.');
          }
        }
      } catch (err: any) {
        // Handle unexpected errors
        if (err?.message?.includes('Failed to fetch') || 
            err?.message?.includes('NetworkError')) {
          setAuthError('Cannot connect to authentication service. Your Supabase project may be paused.');
        } else {
          setAuthError('An unexpected error occurred during authentication check.');
        }
        setIsSuperAdmin(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSuperAdminStatus();
  }, [user]);

  // Redirect logic - only redirect if we're sure the user is not authorized
  useEffect(() => {
    if (!authLoading && !checkingAuth) {
      if (!user) {
        // User not logged in - redirect to login
        router.push('/admin-login');
      } else if (isSuperAdmin === false && authError) {
        // User logged in but not authorized - show error and redirect after delay
        const timer = setTimeout(() => {
          router.push('/admin-login?error=unauthorized');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, authLoading, isSuperAdmin, checkingAuth, authError, router]);

  // Show loading while checking authentication
  if (authLoading || checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show error message if authorization failed
  if (!user || (isSuperAdmin === false && authError)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-700 mb-4">{authError}</p>
            <p className="text-sm text-gray-600">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not super admin
  if (!user || isSuperAdmin === false) {
    return null;
  }

  const kpiMetrics = [
    {
      title: 'Active Trips',
      value: '247',
      trend: 12.5,
      trendLabel: 'vs last hour',
      icon: 'TruckIcon',
      variant: 'primary' as const,
      sparklineData: [45, 52, 48, 61, 55, 67, 58, 72],
    },
    {
      title: 'Online Drivers',
      value: '1,834',
      trend: 8.3,
      trendLabel: 'vs yesterday',
      icon: 'UserGroupIcon',
      variant: 'success' as const,
      sparklineData: [1200, 1350, 1280, 1450, 1520, 1680, 1750, 1834],
    },
    {
      title: 'Revenue Today',
      value: '₦2.4M',
      trend: 15.7,
      trendLabel: 'vs yesterday',
      icon: 'CurrencyDollarIcon',
      variant: 'success' as const,
      sparklineData: [180000, 210000, 195000, 240000, 225000, 260000, 235000, 240000],
    },
    {
      title: 'Completion Rate',
      value: '94.2%',
      trend: 2.1,
      trendLabel: 'vs last week',
      icon: 'CheckCircleIcon',
      variant: 'success' as const,
      sparklineData: [91, 92, 93, 92, 94, 93, 94, 94.2],
    },
    {
      title: 'Avg Wait Time',
      value: '4.2 min',
      trend: -8.5,
      trendLabel: 'improvement',
      icon: 'ClockIcon',
      variant: 'warning' as const,
      sparklineData: [5.2, 4.8, 5.1, 4.6, 4.5, 4.3, 4.4, 4.2],
    },
    {
      title: 'System Health',
      value: '98/100',
      trend: 0,
      trendLabel: 'stable',
      icon: 'ServerIcon',
      variant: 'success' as const,
      sparklineData: [97, 98, 97, 98, 98, 97, 98, 98],
    },
  ];

  const activities = [
    {
      id: '1',
      type: 'trip' as const,
      title: 'New Trip Started',
      description: 'Okada trip from Ikeja to Victoria Island - Driver: Adebayo O.',
      timestamp: '2 minutes ago',
      severity: 'info' as const,
      icon: 'TruckIcon',
    },
    {
      id: '2',
      type: 'driver' as const,
      title: 'Driver Went Online',
      description: 'Chukwu Emmanuel (Keke) - Zone: Surulere',
      timestamp: '5 minutes ago',
      severity: 'info' as const,
      icon: 'UserIcon',
    },
    {
      id: '3',
      type: 'alert' as const,
      title: 'High Demand Alert',
      description: 'Surge pricing activated in Lekki area - 1.5x multiplier',
      timestamp: '8 minutes ago',
      severity: 'warning' as const,
      icon: 'ExclamationTriangleIcon',
    },
    {
      id: '4',
      type: 'trip' as const,
      title: 'Trip Completed',
      description: 'Mini Bus trip completed - Fare: ₦3,500 - Rating: 5 stars',
      timestamp: '12 minutes ago',
      severity: 'info' as const,
      icon: 'CheckCircleIcon',
    },
    {
      id: '5',
      type: 'alert' as const,
      title: 'Payment Gateway Issue',
      description: 'Paystack experiencing delays - Monitoring situation',
      timestamp: '15 minutes ago',
      severity: 'error' as const,
      icon: 'ExclamationCircleIcon',
    },
    {
      id: '6',
      type: 'driver' as const,
      title: 'Driver Verification Complete',
      description: 'New driver approved - Oluwaseun M. (Okada)',
      timestamp: '18 minutes ago',
      severity: 'info' as const,
      icon: 'ShieldCheckIcon',
    },
    {
      id: '7',
      type: 'trip' as const,
      title: 'Logistics Delivery',
      description: 'Package delivered successfully - Yaba to Ajah',
      timestamp: '22 minutes ago',
      severity: 'info' as const,
      icon: 'CubeIcon',
    },
    {
      id: '8',
      type: 'alert' as const,
      title: 'System Maintenance',
      description: 'Scheduled maintenance completed - All systems operational',
      timestamp: '30 minutes ago',
      severity: 'info' as const,
      icon: 'WrenchScrewdriverIcon',
    },
  ];

  const trips = [
    {
      id: '1',
      tripId: 'TRP-2025-001247',
      passenger: 'Aisha Mohammed',
      driver: 'Adebayo Ogunleye',
      service: 'Okada' as const,
      status: 'active' as const,
      pickup: 'Ikeja City Mall',
      dropoff: 'Victoria Island',
      fare: 2500,
      duration: '12 min',
    },
    {
      id: '2',
      tripId: 'TRP-2025-001246',
      passenger: 'Chinedu Okafor',
      driver: 'Emmanuel Chukwu',
      service: 'Keke' as const,
      status: 'active' as const,
      pickup: 'Surulere Market',
      dropoff: 'Yaba Tech',
      fare: 1800,
      duration: '8 min',
    },
    {
      id: '3',
      tripId: 'TRP-2025-001245',
      passenger: 'Fatima Bello',
      driver: 'Ibrahim Musa',
      service: 'Mini Bus' as const,
      status: 'completed' as const,
      pickup: 'Murtala Airport',
      dropoff: 'Lekki Phase 1',
      fare: 4500,
      duration: '35 min',
    },
    {
      id: '4',
      tripId: 'LOG-2025-000892',
      passenger: 'Jumia Express',
      driver: 'Oluwaseun Adeyemi',
      service: 'Logistics' as const,
      status: 'active' as const,
      pickup: 'Warehouse - Ikeja',
      dropoff: 'Customer - Ajah',
      fare: 3200,
      duration: '45 min',
    },
    {
      id: '5',
      tripId: 'TRP-2025-001244',
      passenger: 'Ngozi Eze',
      driver: 'Tunde Bakare',
      service: 'Okada' as const,
      status: 'cancelled' as const,
      pickup: 'Maryland Mall',
      dropoff: 'Ikoyi',
      fare: 2800,
      duration: '0 min',
    },
  ];

  const healthMetrics = [
    {
      name: 'API Response Time',
      status: 'healthy' as const,
      value: '142ms',
      icon: 'BoltIcon',
    },
    {
      name: 'Database Performance',
      status: 'healthy' as const,
      value: '98.7%',
      icon: 'CircleStackIcon',
    },
    {
      name: 'Payment Gateway',
      status: 'warning' as const,
      value: '95.2%',
      icon: 'CreditCardIcon',
    },
    {
      name: 'WebSocket Connections',
      status: 'healthy' as const,
      value: '2,847',
      icon: 'SignalIcon',
    },
  ];

  const initialData = {
    kpiMetrics,
    activities,
    trips,
    healthMetrics,
    overallScore: 98,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader 
          userName="Admin User"
          userRole="Super Admin"
        />
        
        <main className="p-6">
          <div className="max-w-[1920px] mx-auto">
            <NavigationBreadcrumbs />
            
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-foreground mb-2">Main Dashboard</h1>
              <p className="text-muted-foreground">
                Real-time operational intelligence and comprehensive platform monitoring
              </p>
            </div>

            <DashboardInteractive initialData={initialData} />
          </div>
        </main>
      </div>

      {/* Unified Real-time Connection Overlay */}
      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}