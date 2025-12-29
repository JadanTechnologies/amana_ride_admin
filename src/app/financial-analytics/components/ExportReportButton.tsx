import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ExportReportButtonProps {
  onExport: (format: 'csv' | 'pdf' | 'excel') => void;
}

const ExportReportButton = ({ onExport }: ExportReportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    { format: 'csv' as const, label: 'Export as CSV', icon: 'DocumentTextIcon' },
    { format: 'pdf' as const, label: 'Export as PDF', icon: 'DocumentIcon' },
    { format: 'excel' as const, label: 'Export as Excel', icon: 'TableCellsIcon' },
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-smooth"
      >
        <Icon name="ArrowDownTrayIcon" size={18} />
        <span className="text-sm font-medium">Export Report</span>
        <Icon 
          name="ChevronDownIcon" 
          size={16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
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
              {exportOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-muted transition-smooth"
                >
                  <Icon name={option.icon as any} size={18} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportReportButton;