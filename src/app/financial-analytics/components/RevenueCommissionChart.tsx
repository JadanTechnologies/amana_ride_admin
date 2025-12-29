import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

interface ChartDataPoint {
  date: string;
  revenue: number;
  commission: number;
  commissionRate: number;
}

interface RevenueCommissionChartProps {
  data: ChartDataPoint[];
}

const RevenueCommissionChart = ({ data }: RevenueCommissionChartProps) => {
  const formatCurrency = (value: number) => {
    return `₦${(value / 1000).toFixed(0)}k`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Revenue & Commission Analysis</h3>
          <p className="caption text-muted-foreground text-sm mt-1">
            Daily revenue with commission rate overlay
          </p>
        </div>
      </div>
      
      <div className="w-full h-80" aria-label="Revenue and Commission Chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--color-muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="hsl(var(--color-muted-foreground))"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--color-muted-foreground))"
              style={{ fontSize: '12px' }}
              tickFormatter={formatPercentage}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--color-popover))',
                border: '1px solid hsl(var(--color-border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'commissionRate') return formatPercentage(value);
                return formatCurrency(value);
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
            <Bar 
              yAxisId="left"
              dataKey="revenue" 
              fill="hsl(var(--color-primary))" 
              name="Revenue"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="left"
              dataKey="commission" 
              fill="hsl(var(--color-accent))" 
              name="Commission"
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="commissionRate" 
              stroke="hsl(var(--color-success))" 
              strokeWidth={2}
              name="Commission Rate (%)"
              dot={{ fill: 'hsl(var(--color-success))', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueCommissionChart;