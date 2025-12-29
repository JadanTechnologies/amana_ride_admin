import Icon from '@/components/ui/AppIcon';

interface ActivityItem {
  id: string;
  type: 'trip' | 'driver' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'error';
  icon: string;
}

interface LiveActivityFeedProps {
  activities: ActivityItem[];
}

const LiveActivityFeed = ({ activities }: LiveActivityFeedProps) => {
  const getSeverityStyles = (severity?: string) => {
    const styles = {
      info: 'bg-primary/10 text-primary',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-error/10 text-error',
    };
    return styles[severity as keyof typeof styles] || styles.info;
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-elevation-1 h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Live Activity</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-success opacity-50 animate-ping" />
            </div>
            <span className="caption text-success text-xs font-medium">Live</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-custom p-4 space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-3 p-3 rounded-lg hover:bg-muted transition-smooth"
          >
            <div className={`w-10 h-10 rounded-lg ${getSeverityStyles(activity.severity)} flex items-center justify-center flex-shrink-0`}>
              <Icon name={activity.icon as any} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">{activity.title}</p>
              <p className="caption text-muted-foreground text-xs mb-2">{activity.description}</p>
              <span className="caption text-muted-foreground text-xs">{activity.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveActivityFeed;