import Icon from '@/components/ui/AppIcon';

interface FinancialMetricsCardProps {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: string;
  subtitle?: string;
}

const FinancialMetricsCard = ({
  title,
  value,
  change,
  trend,
  icon,
  subtitle,
}: FinancialMetricsCardProps) => {
  const isPositive = trend === 'up';

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="caption text-muted-foreground text-sm mb-1">{title}</p>
          <h3 className="text-2xl font-semibold text-foreground">{value}</h3>
          {subtitle && (
            <p className="caption text-muted-foreground text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isPositive ? 'bg-success/10' : 'bg-error/10'
        }`}>
          <Icon 
            name={icon as any} 
            size={24} 
            className={isPositive ? 'text-success' : 'text-error'} 
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${
          isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        }`}>
          <Icon 
            name={isPositive ? 'ArrowUpIcon' : 'ArrowDownIcon'} 
            size={14} 
          />
          <span className="caption text-xs font-medium">{Math.abs(change)}%</span>
        </div>
        <span className="caption text-muted-foreground text-xs">vs last period</span>
      </div>
    </div>
  );
};

export default FinancialMetricsCard;