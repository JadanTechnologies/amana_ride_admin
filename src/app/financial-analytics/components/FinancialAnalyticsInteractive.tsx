'use client';

import { useState } from 'react';
import FinancialMetricsCard from './FinancialMetricsCard';
import DateRangePicker from './DateRangePicker';
import ServiceTypeFilter from './ServiceTypeFilter';
import PaymentMethodFilter from './PaymentMethodFilter';
import ComparisonToggle from './ComparisonToggle';
import RevenueCommissionChart from './RevenueCommissionChart';
import TopCitiesLeaderboard from './TopCitiesLeaderboard';
import PaymentMethodDistribution from './PaymentMethodDistribution';
import TransactionReconciliationTable from './TransactionReconciliationTable';
import ExportReportButton from './ExportReportButton';
import DataFreshnessIndicator from './DataFreshnessIndicator';

interface FinancialMetric {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: string;
  subtitle?: string;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
  commission: number;
  commissionRate: number;
}

interface CityData {
  id: string;
  name: string;
  revenue: number;
  growth: number;
  transactions: number;
}

interface PaymentMethodData {
  name: string;
  value: number;
  color: string;
}

interface Transaction {
  id: string;
  reference: string;
  gateway: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'disputed';
  date: string;
  settlementDate: string;
  customer: string;
}

const FinancialAnalyticsInteractive = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedServices, setSelectedServices] = useState<string[]>(['all']);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(['all']);
  const [comparisonMode, setComparisonMode] = useState<'mom' | 'yoy'>('mom');

  const financialMetrics: FinancialMetric[] = [
    {
      title: 'Total Revenue',
      value: '₦45.8M',
      change: 12.5,
      trend: 'up',
      icon: 'CurrencyDollarIcon',
      subtitle: 'Across all services',
    },
    {
      title: 'Commission Earned',
      value: '₦6.87M',
      change: 8.3,
      trend: 'up',
      icon: 'BanknotesIcon',
      subtitle: '15% average rate',
    },
    {
      title: 'Transaction Volume',
      value: '128,456',
      change: 15.7,
      trend: 'up',
      icon: 'ArrowsRightLeftIcon',
      subtitle: 'Total transactions',
    },
    {
      title: 'Refund Rate',
      value: '2.3%',
      change: 0.5,
      trend: 'down',
      icon: 'ArrowUturnLeftIcon',
      subtitle: 'Below industry avg',
    },
    {
      title: 'Wallet Balance',
      value: '₦12.4M',
      change: 5.2,
      trend: 'up',
      icon: 'WalletIcon',
      subtitle: 'Available funds',
    },
    {
      title: 'Payment Success',
      value: '98.7%',
      change: 1.2,
      trend: 'up',
      icon: 'CheckCircleIcon',
      subtitle: 'Success rate',
    },
  ];

  const chartData: ChartDataPoint[] = [
    { date: '15 Dec', revenue: 3200000, commission: 480000, commissionRate: 15 },
    { date: '16 Dec', revenue: 3500000, commission: 525000, commissionRate: 15 },
    { date: '17 Dec', revenue: 3100000, commission: 465000, commissionRate: 15 },
    { date: '18 Dec', revenue: 3800000, commission: 570000, commissionRate: 15 },
    { date: '19 Dec', revenue: 4200000, commission: 630000, commissionRate: 15 },
    { date: '20 Dec', revenue: 3900000, commission: 585000, commissionRate: 15 },
    { date: '21 Dec', revenue: 4500000, commission: 675000, commissionRate: 15 },
  ];

  const topCities: CityData[] = [
    { id: '1', name: 'Lagos', revenue: 18500000, growth: 15.3, transactions: 45230 },
    { id: '2', name: 'Abuja', revenue: 12300000, growth: 12.8, transactions: 32150 },
    { id: '3', name: 'Port Harcourt', revenue: 8700000, growth: 10.5, transactions: 21340 },
    { id: '4', name: 'Kano', revenue: 6300000, growth: 8.2, transactions: 18920 },
    { id: '5', name: 'Ibadan', revenue: 5200000, growth: 7.1, transactions: 15670 },
  ];

  const paymentMethodData: PaymentMethodData[] = [
    { name: 'Wallet', value: 18500000, color: 'hsl(var(--color-primary))' },
    { name: 'Card Payment', value: 15200000, color: 'hsl(var(--color-accent))' },
    { name: 'Cash', value: 8300000, color: 'hsl(var(--color-success))' },
    { name: 'Bank Transfer', value: 3800000, color: 'hsl(var(--color-warning))' },
  ];

  const transactions: Transaction[] = [
    {
      id: '1',
      reference: 'TXN-2024-001234',
      gateway: 'Paystack',
      amount: 15000,
      status: 'completed',
      date: '20/12/2024',
      settlementDate: '22/12/2024',
      customer: 'Adebayo Johnson',
    },
    {
      id: '2',
      reference: 'TXN-2024-001235',
      gateway: 'Flutterwave',
      amount: 8500,
      status: 'pending',
      date: '20/12/2024',
      settlementDate: '23/12/2024',
      customer: 'Chioma Okafor',
    },
    {
      id: '3',
      reference: 'TXN-2024-001236',
      gateway: 'Paystack',
      amount: 22000,
      status: 'completed',
      date: '20/12/2024',
      settlementDate: '22/12/2024',
      customer: 'Ibrahim Musa',
    },
    {
      id: '4',
      reference: 'TXN-2024-001237',
      gateway: 'Flutterwave',
      amount: 12500,
      status: 'disputed',
      date: '19/12/2024',
      settlementDate: 'Pending',
      customer: 'Ngozi Eze',
    },
    {
      id: '5',
      reference: 'TXN-2024-001238',
      gateway: 'Paystack',
      amount: 9800,
      status: 'failed',
      date: '19/12/2024',
      settlementDate: 'N/A',
      customer: 'Oluwaseun Adeyemi',
    },
    {
      id: '6',
      reference: 'TXN-2024-001239',
      gateway: 'Flutterwave',
      amount: 18500,
      status: 'completed',
      date: '19/12/2024',
      settlementDate: '21/12/2024',
      customer: 'Fatima Abubakar',
    },
  ];

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
    console.log('Date range changed:', start, end);
  };

  const handleServiceFilterChange = (services: string[]) => {
    setSelectedServices(services);
    console.log('Services filtered:', services);
  };

  const handlePaymentMethodFilterChange = (methods: string[]) => {
    setSelectedPaymentMethods(methods);
    console.log('Payment methods filtered:', methods);
  };

  const handleComparisonChange = (mode: 'mom' | 'yoy') => {
    setComparisonMode(mode);
    console.log('Comparison mode changed:', mode);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    console.log('Exporting report as:', format);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker onDateRangeChange={handleDateRangeChange} />
            <ServiceTypeFilter onFilterChange={handleServiceFilterChange} />
            <PaymentMethodFilter onFilterChange={handlePaymentMethodFilterChange} />
            <ComparisonToggle onComparisonChange={handleComparisonChange} />
          </div>
          <div className="flex items-center gap-3">
            <DataFreshnessIndicator />
            <ExportReportButton onExport={handleExport} />
          </div>
        </div>
      </div>

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {financialMetrics.map((metric, index) => (
          <FinancialMetricsCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue & Commission Chart */}
        <div className="lg:col-span-8">
          <RevenueCommissionChart data={chartData} />
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-4 space-y-6">
          <TopCitiesLeaderboard cities={topCities} />
          <PaymentMethodDistribution data={paymentMethodData} />
        </div>
      </div>

      {/* Transaction Reconciliation Table */}
      <TransactionReconciliationTable transactions={transactions} />
    </div>
  );
};

export default FinancialAnalyticsInteractive;