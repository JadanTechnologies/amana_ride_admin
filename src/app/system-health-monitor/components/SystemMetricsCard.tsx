import Icon from '@/components/ui/AppIcon';

interface SystemMetricsCardProps {
  title: string;
  value: string;
  unit: string;
  icon: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: number;
  threshold: string;
}

const SystemMetricsCard = ({
  title,
  value,
  unit,
  icon,
  status,
  trend,
  threshold,
}: SystemMetricsCardProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'healthy':
        return 'bg-success/10 border-success/20 text-success';
      case 'warning':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'critical':
        return 'bg-error/10 border-error/20 text-error';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'warning':
        return 'Warning';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-smooth">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusStyles()}`}>
          <Icon name={icon as any} size={24} />
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles()}`}>
          {getStatusLabel()}
        </div>
      </div>

      <h3 className="text-sm text-muted-foreground mb-2">{title}</h3>
      
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-semibold text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Icon
            name={trend >= 0 ? 'ArrowUpIcon' : 'ArrowDownIcon'}
            size={16}
            className={trend >= 0 ? 'text-success' : 'text-error'}
          />
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-success' : 'text-error'}`}>
            {Math.abs(trend)}%
          </span>
        </div>
        <span className="caption text-muted-foreground text-xs">
          Threshold: {threshold}
        </span>
      </div>
    </div>
  );
};

export default SystemMetricsCard;