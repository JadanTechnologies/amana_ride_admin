'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceDataPoint {
  time: string;
  apiResponse: number;
  dbQuery: number;
  errorRate: number;
  activeConnections: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
}

const PerformanceChart = ({ data }: PerformanceChartProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">System Performance Metrics</h2>
          <p className="caption text-muted-foreground text-sm">Real-time monitoring with anomaly detection</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse-subtle" />
          <span className="caption text-muted-foreground text-sm">Live</span>
        </div>
      </div>

      <div className="w-full h-80" aria-label="System Performance Line Chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748B"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748B"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(15, 23, 42, 0.10)',
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line 
              type="monotone" 
              dataKey="apiResponse" 
              stroke="#1E40AF" 
              strokeWidth={2}
              name="API Response (ms)"
              dot={{ fill: '#1E40AF', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="dbQuery" 
              stroke="#059669" 
              strokeWidth={2}
              name="DB Query (ms)"
              dot={{ fill: '#059669', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="errorRate" 
              stroke="#DC2626" 
              strokeWidth={2}
              name="Error Rate (%)"
              dot={{ fill: '#DC2626', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="activeConnections" 
              stroke="#F59E0B" 
              strokeWidth={2}
              name="Active Connections"
              dot={{ fill: '#F59E0B', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <div>
            <p className="caption text-muted-foreground text-xs">API Response</p>
            <p className="text-sm font-medium text-foreground">Avg: 145ms</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-success" />
          <div>
            <p className="caption text-muted-foreground text-xs">DB Query</p>
            <p className="text-sm font-medium text-foreground">Avg: 89ms</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-error" />
          <div>
            <p className="caption text-muted-foreground text-xs">Error Rate</p>
            <p className="text-sm font-medium text-foreground">Avg: 0.8%</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <div>
            <p className="caption text-muted-foreground text-xs">Connections</p>
            <p className="text-sm font-medium text-foreground">Avg: 1,245</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;