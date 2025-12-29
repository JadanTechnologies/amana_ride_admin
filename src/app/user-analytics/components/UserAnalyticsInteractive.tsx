'use client';

import { useState } from 'react';
import UserTypeToggle from './UserTypeToggle';
import CohortSelector from './CohortSelector';
import GeographicFilter from './GeographicFilter';
import TimePeriodControl from './TimePeriodControl';
import MetricCard from './MetricCard';
import FunnelChart from './FunnelChart';
import SatisfactionScore from './SatisfactionScore';
import TopSegments from './TopSegments';
import EngagementMetrics from './EngagementMetrics';
import CohortAnalysisTable from './CohortAnalysisTable';

interface UserAnalyticsInteractiveProps {
  initialUserType?: 'passengers' | 'drivers';
}

const UserAnalyticsInteractive = ({ initialUserType = 'passengers' }: UserAnalyticsInteractiveProps) => {
  const [userType, setUserType] = useState<'passengers' | 'drivers'>(initialUserType);
  const [selectedCohort, setSelectedCohort] = useState('All Users');
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['All Cities']);
  const [timePeriod, setTimePeriod] = useState('Last 30 Days');

  const passengerMetrics = [
    {
      title: 'Total Active Users',
      value: '45,234',
      change: 12.5,
      trend: 'up' as const,
      icon: 'UserIcon',
      benchmark: '42K',
    },
    {
      title: 'New Registrations',
      value: '3,847',
      change: 8.3,
      trend: 'up' as const,
      icon: 'UserPlusIcon',
      benchmark: '3.5K',
    },
    {
      title: 'Retention Rate',
      value: '68.4%',
      change: 5.2,
      trend: 'up' as const,
      icon: 'ArrowPathIcon',
      benchmark: '65%',
    },
    {
      title: 'Avg Session Duration',
      value: '12.5m',
      change: -2.1,
      trend: 'down' as const,
      icon: 'ClockIcon',
      benchmark: '13m',
    },
    {
      title: 'Lifetime Value',
      value: '₦24,500',
      change: 15.7,
      trend: 'up' as const,
      icon: 'CurrencyDollarIcon',
      benchmark: '₦22K',
    },
    {
      title: 'Churn Rate',
      value: '4.2%',
      change: -1.8,
      trend: 'up' as const,
      icon: 'ArrowTrendingDownIcon',
      benchmark: '5%',
    },
  ];

  const driverMetrics = [
    {
      title: 'Total Active Drivers',
      value: '12,456',
      change: 9.8,
      trend: 'up' as const,
      icon: 'TruckIcon',
      benchmark: '11.5K',
    },
    {
      title: 'New Driver Signups',
      value: '892',
      change: 6.4,
      trend: 'up' as const,
      icon: 'UserPlusIcon',
      benchmark: '850',
    },
    {
      title: 'Driver Retention',
      value: '72.8%',
      change: 3.5,
      trend: 'up' as const,
      icon: 'ArrowPathIcon',
      benchmark: '70%',
    },
    {
      title: 'Avg Online Hours',
      value: '8.2h',
      change: 4.1,
      trend: 'up' as const,
      icon: 'ClockIcon',
      benchmark: '8h',
    },
    {
      title: 'Avg Monthly Earnings',
      value: '₦185,000',
      change: 12.3,
      trend: 'up' as const,
      icon: 'CurrencyDollarIcon',
      benchmark: '₦175K',
    },
    {
      title: 'Driver Churn Rate',
      value: '3.8%',
      change: -2.2,
      trend: 'up' as const,
      icon: 'ArrowTrendingDownIcon',
      benchmark: '4.5%',
    },
  ];

  const funnelData = [
    { name: 'App Downloads', value: 125000, percentage: 100, dropoff: 0 },
    { name: 'Account Created', value: 98750, percentage: 79, dropoff: 21 },
    { name: 'Profile Completed', value: 82500, percentage: 66, dropoff: 13 },
    { name: 'First Trip Booked', value: 65000, percentage: 52, dropoff: 14 },
    { name: 'Active Users', value: 45234, percentage: 36, dropoff: 16 },
  ];

  const satisfactionData = {
    score: 4.3,
    totalResponses: 15847,
    distribution: {
      excellent: 52,
      good: 28,
      average: 14,
      poor: 6,
    },
  };

  const topSegments = [
    {
      name: 'Daily Commuters',
      users: 18500,
      growth: 15.2,
      revenue: '12.5M',
      icon: 'BriefcaseIcon',
    },
    {
      name: 'Weekend Travelers',
      users: 12300,
      growth: 8.7,
      revenue: '8.2M',
      icon: 'MapIcon',
    },
    {
      name: 'Airport Transfers',
      users: 8900,
      growth: 22.4,
      revenue: '15.8M',
      icon: 'BuildingOffice2Icon',
    },
    {
      name: 'Late Night Riders',
      users: 5600,
      growth: -3.2,
      revenue: '4.1M',
      icon: 'MoonIcon',
    },
  ];

  const engagementData = [
    { date: '15 Dec', sessions: 42, duration: 11 },
    { date: '16 Dec', sessions: 45, duration: 12 },
    { date: '17 Dec', sessions: 38, duration: 10 },
    { date: '18 Dec', sessions: 51, duration: 14 },
    { date: '19 Dec', sessions: 48, duration: 13 },
    { date: '20 Dec', sessions: 44, duration: 12 },
  ];

  const cohortTableData = [
    {
      cohort: 'Dec 2024',
      users: 3847,
      retention: { week1: 82, week2: 68, week3: 54, week4: 45 },
      avgLifetimeValue: '24,500',
      churnRisk: 'low' as const,
    },
    {
      cohort: 'Nov 2024',
      users: 4125,
      retention: { week1: 85, week2: 72, week3: 61, week4: 52 },
      avgLifetimeValue: '28,300',
      churnRisk: 'low' as const,
    },
    {
      cohort: 'Oct 2024',
      users: 3956,
      retention: { week1: 78, week2: 64, week3: 48, week4: 38 },
      avgLifetimeValue: '21,800',
      churnRisk: 'medium' as const,
    },
    {
      cohort: 'Sep 2024',
      users: 3621,
      retention: { week1: 75, week2: 58, week3: 42, week4: 32 },
      avgLifetimeValue: '18,500',
      churnRisk: 'high' as const,
    },
    {
      cohort: 'Aug 2024',
      users: 3892,
      retention: { week1: 80, week2: 65, week3: 52, week4: 44 },
      avgLifetimeValue: '23,200',
      churnRisk: 'low' as const,
    },
  ];

  const handleUserTypeChange = (type: 'passengers' | 'drivers') => {
    setUserType(type);
    console.log('User type changed to:', type);
  };

  const handleCohortChange = (cohort: string) => {
    setSelectedCohort(cohort);
    console.log('Cohort changed to:', cohort);
  };

  const handleLocationChange = (locations: string[]) => {
    setSelectedLocations(locations);
    console.log('Locations changed to:', locations);
  };

  const handlePeriodChange = (period: string, customRange?: { start: string; end: string }) => {
    setTimePeriod(period);
    console.log('Time period changed to:', period, customRange);
  };

  const handleStageClick = (stage: string) => {
    console.log('Funnel stage clicked:', stage);
  };

  const handleExport = () => {
    console.log('Exporting cohort analysis data...');
  };

  const currentMetrics = userType === 'passengers' ? passengerMetrics : driverMetrics;

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <UserTypeToggle onTypeChange={handleUserTypeChange} />
          <div className="h-8 w-px bg-border hidden lg:block" />
          <CohortSelector onCohortChange={handleCohortChange} />
          <GeographicFilter onLocationChange={handleLocationChange} />
          <TimePeriodControl onPeriodChange={handlePeriodChange} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentMetrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Main Analysis Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Funnel Chart - 9 cols */}
        <div className="lg:col-span-9">
          <FunnelChart data={funnelData} onStageClick={handleStageClick} />
        </div>

        {/* Right Panel - 3 cols */}
        <div className="lg:col-span-3 space-y-6">
          <SatisfactionScore {...satisfactionData} />
          <TopSegments segments={topSegments} />
          <EngagementMetrics data={engagementData} />
        </div>
      </div>

      {/* Cohort Analysis Table */}
      <CohortAnalysisTable data={cohortTableData} onExport={handleExport} />
    </div>
  );
};

export default UserAnalyticsInteractive;