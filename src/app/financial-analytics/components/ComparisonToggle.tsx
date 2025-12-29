import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ComparisonToggleProps {
  onComparisonChange: (mode: 'mom' | 'yoy') => void;
}

const ComparisonToggle = ({ onComparisonChange }: ComparisonToggleProps) => {
  const [selectedMode, setSelectedMode] = useState<'mom' | 'yoy'>('mom');

  const handleToggle = (mode: 'mom' | 'yoy') => {
    setSelectedMode(mode);
    onComparisonChange(mode);
  };

  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
      <button
        onClick={() => handleToggle('mom')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-smooth ${
          selectedMode === 'mom' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Icon name="ArrowTrendingUpIcon" size={16} />
        <span>MoM</span>
      </button>
      <button
        onClick={() => handleToggle('yoy')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-smooth ${
          selectedMode === 'yoy' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Icon name="ChartBarIcon" size={16} />
        <span>YoY</span>
      </button>
    </div>
  );
};

export default ComparisonToggle;