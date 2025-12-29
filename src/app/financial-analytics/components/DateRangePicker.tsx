import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface DateRangePickerProps {
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

interface PresetPeriod {
  label: string;
  value: string;
  days: number;
}

const DateRangePicker = ({ onDateRangeChange }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('This Month');

  const presets: PresetPeriod[] = [
    { label: 'Today', value: 'today', days: 0 },
    { label: 'Yesterday', value: 'yesterday', days: 1 },
    { label: 'Last 7 Days', value: 'last7days', days: 7 },
    { label: 'Last 30 Days', value: 'last30days', days: 30 },
    { label: 'This Month', value: 'thismonth', days: 30 },
    { label: 'Last Month', value: 'lastmonth', days: 30 },
    { label: 'This Quarter', value: 'thisquarter', days: 90 },
    { label: 'This Year', value: 'thisyear', days: 365 },
  ];

  const handlePresetClick = (preset: PresetPeriod) => {
    setSelectedPreset(preset.label);
    setIsOpen(false);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    onDateRangeChange(startDate, endDate);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-smooth"
      >
        <Icon name="CalendarIcon" size={18} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{selectedPreset}</span>
        <Icon 
          name="ChevronDownIcon" 
          size={16} 
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[190]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-elevation-3 z-[200] animate-fade-in">
            <div className="p-2">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-smooth ${
                    selectedPreset === preset.label
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangePicker;