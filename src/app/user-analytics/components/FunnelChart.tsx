'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FunnelStage {
  name: string;
  value: number;
  percentage: number;
  dropoff: number;
}

interface FunnelChartProps {
  data: FunnelStage[];
  onStageClick: (stage: string) => void;
}

const FunnelChart = ({ data, onStageClick }: FunnelChartProps) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const handleStageClick = (stageName: string) => {
    setSelectedStage(stageName);
    onStageClick(stageName);
  };

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">User Acquisition Funnel</h3>
          <p className="caption text-muted-foreground text-sm mt-1">
            Click on any stage to drill down into detailed analytics
          </p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-smooth">
          <Icon name="ArrowDownTrayIcon" size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Export</span>
        </button>
      </div>

      <div className="space-y-4">
        {data.map((stage, index) => {
          const widthPercentage = (stage.value / maxValue) * 100;
          const isSelected = selectedStage === stage.name;

          return (
            <div key={stage.name} className="relative">
              <button
                onClick={() => handleStageClick(stage.name)}
                className={`
                  w-full text-left transition-smooth
                  ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{stage.name}</span>
                    {index > 0 && (
                      <span className="caption text-error text-xs">
                        -{stage.dropoff}% dropoff
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {stage.value.toLocaleString()}
                    </span>
                    <span className="caption text-muted-foreground text-xs">
                      {stage.percentage}%
                    </span>
                  </div>
                </div>
                
                <div className="relative h-16 bg-muted rounded-lg overflow-hidden">
                  <div
                    className={`
                      absolute left-0 top-0 h-full rounded-lg transition-all duration-500
                      ${isSelected 
                        ? 'bg-primary shadow-lg' 
                        : 'bg-primary/80 hover:bg-primary'
                      }
                    `}
                    style={{ width: `${widthPercentage}%` }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">
                        {stage.percentage}% conversion
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {index < data.length - 1 && (
                <div className="flex justify-center my-2">
                  <Icon name="ChevronDownIcon" size={20} className="text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedStage && (
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="InformationCircleIcon" size={18} className="text-primary" />
            <span className="text-sm font-medium text-primary">
              Analyzing: {selectedStage}
            </span>
          </div>
          <p className="caption text-muted-foreground text-sm">
            Click on demographic filters or geographic regions to drill down further into this stage
          </p>
        </div>
      )}
    </div>
  );
};

export default FunnelChart;