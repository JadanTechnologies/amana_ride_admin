import Icon from '@/components/ui/AppIcon';

interface IncidentFeedItemProps {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  service: string;
  status: 'active' | 'investigating' | 'resolved';
}

const IncidentFeedItem = ({
  title,
  description,
  severity,
  timestamp,
  service,
  status,
}: IncidentFeedItemProps) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'critical':
        return 'bg-error/10 border-error/20 text-error';
      case 'high':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'medium':
        return 'bg-accent/10 border-accent/20 text-accent';
      case 'low':
        return 'bg-info/10 border-info/20 text-info';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return 'bg-error text-error-foreground';
      case 'investigating':
        return 'bg-warning text-warning-foreground';
      case 'resolved':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'critical':
        return 'ExclamationTriangleIcon';
      case 'high':
        return 'ExclamationCircleIcon';
      case 'medium':
        return 'InformationCircleIcon';
      case 'low':
        return 'CheckCircleIcon';
      default:
        return 'BellIcon';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-elevation-2 transition-smooth">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getSeverityStyles()}`}>
          <Icon name={getSeverityIcon() as any} size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground line-clamp-1">{title}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusStyles()}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          
          <p className="caption text-muted-foreground text-xs mb-3 line-clamp-2">
            {description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="ServerIcon" size={14} className="text-muted-foreground" />
              <span className="caption text-muted-foreground text-xs">{service}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="ClockIcon" size={14} className="text-muted-foreground" />
              <span className="caption text-muted-foreground text-xs">{timestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentFeedItem;