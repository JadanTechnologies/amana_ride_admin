interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon: string;
  benchmark?: string;
}

import Icon from '@/components/ui/AppIcon';

const MetricCard = ({ title, value, change, trend, icon, benchmark }: MetricCardProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-elevation-2 transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="caption text-muted-foreground text-sm mb-1">{title}</p>
          <h3 className="text-3xl font-semibold text-foreground">{value}</h3>
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name={icon as any} size={24} className="text-primary" />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
            ${trend === 'up' ?'bg-success/10 text-success' :'bg-error/10 text-error'
            }
          `}>
            <Icon 
              name={trend === 'up' ? 'ArrowUpIcon' : 'ArrowDownIcon'} 
              size={12} 
            />
            <span>{Math.abs(change)}%</span>
          </div>
          <span className="caption text-muted-foreground text-xs">vs last period</span>
        </div>
        {benchmark && (
          <span className="caption text-muted-foreground text-xs">
            Benchmark: {benchmark}
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;