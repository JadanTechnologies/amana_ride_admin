import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ServiceTypeFilterProps {
  onFilterChange: (services: string[]) => void;
}

interface ServiceType {
  id: string;
  label: string;
  icon: string;
  color: string;
}

const ServiceTypeFilter = ({ onFilterChange }: ServiceTypeFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>(['all']);

  const services: ServiceType[] = [
    { id: 'all', label: 'All Services', icon: 'Squares2X2Icon', color: 'text-primary' },
    { id: 'okada', label: 'Okada', icon: 'TruckIcon', color: 'text-accent' },
    { id: 'keke', label: 'Keke Napep', icon: 'TruckIcon', color: 'text-success' },
    { id: 'minibus', label: 'Mini Bus', icon: 'TruckIcon', color: 'text-warning' },
    { id: 'logistics', label: 'Logistics', icon: 'CubeIcon', color: 'text-info' },
  ];

  const handleServiceToggle = (serviceId: string) => {
    let newSelection: string[];
    
    if (serviceId === 'all') {
      newSelection = ['all'];
    } else {
      newSelection = selectedServices.includes(serviceId)
        ? selectedServices.filter(id => id !== serviceId && id !== 'all')
        : [...selectedServices.filter(id => id !== 'all'), serviceId];
      
      if (newSelection.length === 0) {
        newSelection = ['all'];
      }
    }
    
    setSelectedServices(newSelection);
    onFilterChange(newSelection);
  };

  const getDisplayText = () => {
    if (selectedServices.includes('all') || selectedServices.length === 0) {
      return 'All Services';
    }
    if (selectedServices.length === 1) {
      return services.find(s => s.id === selectedServices[0])?.label || 'All Services';
    }
    return `${selectedServices.length} Services`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-smooth"
      >
        <Icon name="FunnelIcon" size={18} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{getDisplayText()}</span>
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
          <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-elevation-3 z-[200] animate-fade-in">
            <div className="p-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceToggle(service.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-smooth ${
                    selectedServices.includes(service.id)
                      ? 'bg-primary/10 text-primary' :'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon name={service.icon as any} size={18} className={service.color} />
                  <span className="flex-1 text-left">{service.label}</span>
                  {selectedServices.includes(service.id) && (
                    <Icon name="CheckIcon" size={16} className="text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServiceTypeFilter;