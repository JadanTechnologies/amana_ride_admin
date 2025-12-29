import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PaymentMethodData {
  name: string;
  value: number;
  color: string;
}

interface PaymentMethodDistributionProps {
  data: PaymentMethodData[];
}

const PaymentMethodDistribution = ({ data }: PaymentMethodDistributionProps) => {
  const formatCurrency = (value: number) => {
    return `₦${(value / 1000000).toFixed(2)}M`;
  };

  const calculatePercentage = (value: number) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Payment Method Distribution</h3>
          <p className="caption text-muted-foreground text-sm mt-1">
            Transaction volume by payment type
          </p>
        </div>
      </div>

      <div className="w-full h-64" aria-label="Payment Method Distribution Pie Chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--color-popover))',
                border: '1px solid hsl(var(--color-border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 space-y-3">
        {data.map((method) => (
          <div key={method.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: method.color }}
              />
              <span className="text-sm text-foreground">{method.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="caption text-muted-foreground text-xs">
                {calculatePercentage(method.value)}%
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(method.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodDistribution;