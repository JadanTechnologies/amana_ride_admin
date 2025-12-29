'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EngagementData {
  date: string;
  sessions: number;
  duration: number;
}

interface EngagementMetricsProps {
  data: EngagementData[];
}

const EngagementMetrics = ({ data }: EngagementMetricsProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const avgSessions = Math.round(data.reduce((sum, d) => sum + d.sessions, 0) / data.length);
  const avgDuration = Math.round(data.reduce((sum, d) => sum + d.duration, 0) / data.length);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="ClockIcon" size={20} className="text-accent" />
        <h4 className="font-semibold text-foreground">Engagement Metrics</h4>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="caption text-muted-foreground text-xs mb-1">Avg Sessions/Day</p>
          <p className="text-2xl font-semibold text-foreground">{avgSessions}</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="caption text-muted-foreground text-xs mb-1">Avg Duration</p>
          <p className="text-2xl font-semibold text-foreground">{avgDuration}m</p>
        </div>
      </div>

      <div className="h-48">
        {isHydrated ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--color-muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--color-muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--color-popover))',
                  border: '1px solid hsl(var(--color-border))',
                  borderRadius: '8px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="sessions" 
                stroke="hsl(var(--color-primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--color-primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg">
            <Icon name="ChartBarIcon" size={32} className="text-muted-foreground animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default EngagementMetrics;