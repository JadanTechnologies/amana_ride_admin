import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface PaymentMethodFilterProps {
  onFilterChange: (methods: string[]) => void;
}

interface PaymentMethod {
  id: string;
  label: string;
  icon: string;
}

const PaymentMethodFilter = ({ onFilterChange }: PaymentMethodFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['all']);

  const methods: PaymentMethod[] = [
    { id: 'all', label: 'All Methods', icon: 'CreditCardIcon' },
    { id: 'wallet', label: 'Wallet', icon: 'WalletIcon' },
    { id: 'card', label: 'Card Payment', icon: 'CreditCardIcon' },
    { id: 'cash', label: 'Cash', icon: 'BanknotesIcon' },
    { id: 'bank', label: 'Bank Transfer', icon: 'BuildingLibraryIcon' },
  ];

  const handleMethodToggle = (methodId: string) => {
    let newSelection: string[];
    
    if (methodId === 'all') {
      newSelection = ['all'];
    } else {
      newSelection = selectedMethods.includes(methodId)
        ? selectedMethods.filter(id => id !== methodId && id !== 'all')
        : [...selectedMethods.filter(id => id !== 'all'), methodId];
      
      if (newSelection.length === 0) {
        newSelection = ['all'];
      }
    }
    
    setSelectedMethods(newSelection);
    onFilterChange(newSelection);
  };

  const getDisplayText = () => {
    if (selectedMethods.includes('all') || selectedMethods.length === 0) {
      return 'All Methods';
    }
    if (selectedMethods.length === 1) {
      return methods.find(m => m.id === selectedMethods[0])?.label || 'All Methods';
    }
    return `${selectedMethods.length} Methods`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-smooth"
      >
        <Icon name="CreditCardIcon" size={18} className="text-muted-foreground" />
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
          <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-elevation-3 z-[200] animate-fade-in">
            <div className="p-2">
              {methods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodToggle(method.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-smooth ${
                    selectedMethods.includes(method.id)
                      ? 'bg-primary/10 text-primary' :'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon name={method.icon as any} size={18} />
                  <span className="flex-1 text-left">{method.label}</span>
                  {selectedMethods.includes(method.id) && (
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

export default PaymentMethodFilter;