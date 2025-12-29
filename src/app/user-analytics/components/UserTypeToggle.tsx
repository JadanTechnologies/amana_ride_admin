'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface UserTypeToggleProps {
  onTypeChange: (type: 'passengers' | 'drivers') => void;
}

const UserTypeToggle = ({ onTypeChange }: UserTypeToggleProps) => {
  const [activeType, setActiveType] = useState<'passengers' | 'drivers'>('passengers');

  const handleToggle = (type: 'passengers' | 'drivers') => {
    setActiveType(type);
    onTypeChange(type);
  };

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
      <button
        onClick={() => handleToggle('passengers')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md transition-smooth
          ${activeType === 'passengers' ?'bg-primary text-primary-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
          }
        `}
      >
        <Icon name="UserIcon" size={18} />
        <span className="font-medium text-sm">Passengers</span>
      </button>
      <button
        onClick={() => handleToggle('drivers')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md transition-smooth
          ${activeType === 'drivers' ?'bg-primary text-primary-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
          }
        `}
      >
        <Icon name="TruckIcon" size={18} />
        <span className="font-medium text-sm">Drivers</span>
      </button>
    </div>
  );
};

export default UserTypeToggle;