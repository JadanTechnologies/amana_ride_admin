import Icon from '@/components/ui/AppIcon';

interface KPIMetricCardProps {
  title: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: string;
  variant: 'primary' | 'success' | 'warning' | 'error';
  sparklineData?: number[];
}

const KPIMetricCard = ({
  title,
  value,
  trend,
  trendLabel,
  icon,
  variant,
  sparklineData = [],
}: KPIMetricCardProps) => {
  const getVariantStyles = () => {
    const styles = {
      primary: 'bg-primary/10 text-primary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-error/10 text-error',
    };
    return styles[variant];
  };

  const getTrendColor = () => {
    return trend >= 0 ? 'text-success' : 'text-error';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="caption text-muted-foreground text-sm mb-1">{title}</p>
          <h3 className="text-3xl font-semibold text-foreground">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-lg ${getVariantStyles()} flex items-center justify-center flex-shrink-0`}>
          <Icon name={icon as any} size={24} />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon 
            name={trend >= 0 ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'} 
            size={16} 
            className={getTrendColor()}
          />
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="caption text-muted-foreground text-xs">{trendLabel}</span>
        </div>
        
        {sparklineData.length > 0 && (
          <div className="flex items-end gap-0.5 h-8">
            {sparklineData.map((value, index) => (
              <div
                key={index}
                className={`w-1 rounded-t ${getVariantStyles()}`}
                style={{ height: `${(value / Math.max(...sparklineData)) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPIMetricCard;