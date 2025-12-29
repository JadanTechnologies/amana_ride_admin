'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface GeographicFilterProps {
  onLocationChange: (locations: string[]) => void;
}

const GeographicFilter = ({ onLocationChange }: GeographicFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['All Cities']);

  const locations = [
    'All Cities',
    'Lagos',
    'Abuja',
    'Port Harcourt',
    'Kano',
    'Ibadan',
    'Benin City',
  ];

  const handleToggle = (location: string) => {
    if (location === 'All Cities') {
      setSelectedLocations(['All Cities']);
      onLocationChange(['All Cities']);
      return;
    }

    let newSelection = selectedLocations.filter(l => l !== 'All Cities');
    
    if (newSelection.includes(location)) {
      newSelection = newSelection.filter(l => l !== location);
    } else {
      newSelection.push(location);
    }

    if (newSelection.length === 0) {
      newSelection = ['All Cities'];
    }

    setSelectedLocations(newSelection);
    onLocationChange(newSelection);
  };

  const displayText = selectedLocations.includes('All Cities') 
    ? 'All Cities' 
    : `${selectedLocations.length} Cities`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-smooth"
      >
        <Icon name="MapPinIcon" size={18} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{displayText}</span>
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
          <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-elevation-3 z-[100] animate-fade-in">
            {locations.map((location) => (
              <button
                key={location}
                onClick={() => handleToggle(location)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-smooth first:rounded-t-lg last:rounded-b-lg"
              >
                <div className={`
                  w-4 h-4 rounded border-2 flex items-center justify-center
                  ${selectedLocations.includes(location) 
                    ? 'bg-primary border-primary' :'border-border'
                  }
                `}>
                  {selectedLocations.includes(location) && (
                    <Icon name="CheckIcon" size={12} className="text-primary-foreground" />
                  )}
                </div>
                <span className="text-sm text-foreground">{location}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GeographicFilter;