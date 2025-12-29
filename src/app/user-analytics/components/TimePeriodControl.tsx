'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface TimePeriodControlProps {
  onPeriodChange: (period: string, customRange?: { start: string; end: string }) => void;
}

const TimePeriodControl = ({ onPeriodChange }: TimePeriodControlProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const periods = [
    'Last 7 Days',
    'Last 30 Days',
    'Last 90 Days',
    'Last 6 Months',
    'Last 12 Months',
    'Custom Range',
  ];

  const handleSelect = (period: string) => {
    if (period === 'Custom Range') {
      setShowCustomRange(true);
      return;
    }
    setSelectedPeriod(period);
    onPeriodChange(period);
    setIsOpen(false);
    setShowCustomRange(false);
  };

  const handleCustomApply = () => {
    if (startDate && endDate) {
      setSelectedPeriod('Custom Range');
      onPeriodChange('Custom Range', { start: startDate, end: endDate });
      setIsOpen(false);
      setShowCustomRange(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-smooth"
      >
        <Icon name="CalendarIcon" size={18} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{selectedPeriod}</span>
        <Icon 
          name="ChevronDownIcon" 
          size={16} 
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[90]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-72 bg-popover border border-border rounded-lg shadow-elevation-3 z-[100] animate-fade-in">
            {!showCustomRange ? (
              <>
                {periods.map((period) => (
                  <button
                    key={period}
                    onClick={() => handleSelect(period)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 text-left transition-smooth
                      ${selectedPeriod === period 
                        ? 'bg-primary/10 text-primary' :'text-foreground hover:bg-muted'
                      }
                      first:rounded-t-lg last:rounded-b-lg
                    `}
                  >
                    <span className="text-sm">{period}</span>
                    {selectedPeriod === period && period !== 'Custom Range' && (
                      <Icon name="CheckIcon" size={16} />
                    )}
                  </button>
                ))}
              </>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-sm text-foreground">Custom Date Range</h4>
                  <button
                    onClick={() => setShowCustomRange(false)}
                    className="p-1 rounded hover:bg-muted transition-smooth"
                  >
                    <Icon name="XMarkIcon" size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="caption text-muted-foreground text-xs block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="caption text-muted-foreground text-xs block mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={handleCustomApply}
                    disabled={!startDate || !endDate}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TimePeriodControl;