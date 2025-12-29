import Icon from '@/components/ui/AppIcon';

interface ServiceStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: string;
  responseTime: string;
  lastCheck: string;
  dependencies: string[];
}

interface ServiceStatusGridProps {
  services: ServiceStatus[];
}

const ServiceStatusGrid = ({ services }: ServiceStatusGridProps) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-success/10 border-success/20 text-success';
      case 'degraded':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'down':
        return 'bg-error/10 border-error/20 text-error';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return 'CheckCircleIcon';
      case 'degraded':
        return 'ExclamationCircleIcon';
      case 'down':
        return 'XCircleIcon';
      default:
        return 'QuestionMarkCircleIcon';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-elevation-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Service Health Status</h2>
          <p className="caption text-muted-foreground text-sm">Individual service monitoring and dependency mapping</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-smooth">
          View All Services
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-background border border-border rounded-lg p-4 hover:shadow-elevation-2 transition-smooth"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusStyles(service.status)}`}>
                  <Icon name={getStatusIcon(service.status) as any} size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{service.name}</h3>
                  <span className={`caption text-xs ${getStatusStyles(service.status)}`}>
                    {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="caption text-muted-foreground text-xs">Uptime</span>
                <span className="text-sm font-medium text-foreground">{service.uptime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="caption text-muted-foreground text-xs">Response Time</span>
                <span className="text-sm font-medium text-foreground">{service.responseTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="caption text-muted-foreground text-xs">Last Check</span>
                <span className="text-sm font-medium text-foreground">{service.lastCheck}</span>
              </div>
            </div>

            {service.dependencies.length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="caption text-muted-foreground text-xs mb-2">Dependencies</p>
                <div className="flex flex-wrap gap-2">
                  {service.dependencies.map((dep, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceStatusGrid;