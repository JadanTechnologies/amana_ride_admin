import Icon from '@/components/ui/AppIcon';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  icon: string;
}

interface SystemHealthIndicatorProps {
  metrics: HealthMetric[];
  overallScore: number;
}

const SystemHealthIndicator = ({ metrics, overallScore }: SystemHealthIndicatorProps) => {
  const getStatusStyles = (status: string) => {
    const styles = {
      healthy: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      critical: 'bg-error/10 text-error',
    };
    return styles[status as keyof typeof styles];
  };

  const getScoreColor = () => {
    if (overallScore >= 90) return 'text-success';
    if (overallScore >= 70) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">System Health</h3>
        <div className="flex items-center gap-2">
          <span className={`text-3xl font-semibold ${getScoreColor()}`}>{overallScore}</span>
          <span className="caption text-muted-foreground text-sm">/100</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${getStatusStyles(metric.status)} flex items-center justify-center`}>
                <Icon name={metric.icon as any} size={16} />
              </div>
              <span className="text-sm text-foreground">{metric.name}</span>
            </div>
            <span className="data-text text-sm font-medium text-foreground">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHealthIndicator;