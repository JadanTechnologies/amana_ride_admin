'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CohortSelectorProps {
  onCohortChange: (cohort: string) => void;
}

const CohortSelector = ({ onCohortChange }: CohortSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState('All Users');

  const cohorts = [
    'All Users',
    'New Users (0-30 days)',
    'Active Users (30-90 days)',
    'Loyal Users (90+ days)',
    'At-Risk Users',
    'Churned Users',
  ];

  const handleSelect = (cohort: string) => {
    setSelectedCohort(cohort);
    onCohortChange(cohort);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-smooth"
      >
        <Icon name="UserGroupIcon" size={18} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{selectedCohort}</span>
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
          <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-elevation-3 z-[100] animate-fade-in">
            {cohorts.map((cohort) => (
              <button
                key={cohort}
                onClick={() => handleSelect(cohort)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 text-left transition-smooth
                  ${selectedCohort === cohort 
                    ? 'bg-primary/10 text-primary' :'text-foreground hover:bg-muted'
                  }
                  first:rounded-t-lg last:rounded-b-lg
                `}
              >
                <span className="text-sm">{cohort}</span>
                {selectedCohort === cohort && (
                  <Icon name="CheckIcon" size={16} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CohortSelector;