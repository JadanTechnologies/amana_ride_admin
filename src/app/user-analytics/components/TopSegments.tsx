import Icon from '@/components/ui/AppIcon';

interface Segment {
  name: string;
  users: number;
  growth: number;
  revenue: string;
  icon: string;
}

interface TopSegmentsProps {
  segments: Segment[];
}

const TopSegments = ({ segments }: TopSegmentsProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="ChartBarIcon" size={20} className="text-primary" />
        <h4 className="font-semibold text-foreground">Top User Segments</h4>
      </div>

      <div className="space-y-4">
        {segments.map((segment, index) => (
          <div
            key={segment.name}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-smooth"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name={segment.icon as any} size={20} className="text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {segment.name}
                </span>
                <span className={`
                  caption text-xs px-2 py-0.5 rounded-full
                  ${segment.growth > 0 
                    ? 'bg-success/10 text-success' :'bg-error/10 text-error'
                  }
                `}>
                  {segment.growth > 0 ? '+' : ''}{segment.growth}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="caption text-muted-foreground text-xs">
                  {segment.users.toLocaleString()} users
                </span>
                <span className="caption text-muted-foreground text-xs">
                  ₦{segment.revenue}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopSegments;