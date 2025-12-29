'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface RoleContextHeaderProps {
  userName?: string;
  userRole?: 'Super Admin' | 'Operations Admin' | 'Finance Admin' | 'Support Admin';
  userAvatar?: string;
  onRoleSwitch?: (role: string) => void;
  onLogout?: () => void;
}

const RoleContextHeader = ({
  userName = 'Admin User',
  userRole = 'Super Admin',
  userAvatar,
  onRoleSwitch,
  onLogout,
}: RoleContextHeaderProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  // Use effect to set date on client side only to prevent hydration mismatch
  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    );
  }, []);

  const roles = [
    { value: 'Super Admin', label: 'Super Administrator', icon: 'ShieldCheckIcon' },
    { value: 'Operations Admin', label: 'Operations Administrator', icon: 'MapIcon' },
    { value: 'Finance Admin', label: 'Finance Administrator', icon: 'CurrencyDollarIcon' },
    { value: 'Support Admin', label: 'Support Administrator', icon: 'UserGroupIcon' },
  ];

  const currentRoleData = roles.find((r) => r.value === userRole);

  const handleRoleSwitch = (role: string) => {
    if (onRoleSwitch) {
      onRoleSwitch(role);
    }
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Role Context */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
            <Icon name={currentRoleData?.icon as any} size={16} className="text-primary" />
            <span className="caption font-medium text-primary">{userRole}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-muted-foreground">
            <Icon name="ClockIcon" size={16} />
            <span className="caption">
              {currentDate || '\u00A0'}
            </span>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-smooth"
            aria-label="User menu"
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{userName}</span>
              <span className="caption text-muted-foreground text-xs">{userRole}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <Icon
              name="ChevronDownIcon"
              size={16}
              className={`text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-[190]"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-lg shadow-elevation-3 z-[200] animate-fade-in">
                {/* User Info */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-lg">
                      {userAvatar ? (
                        <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span>{userName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{userName}</p>
                      <p className="caption text-muted-foreground text-xs">{userRole}</p>
                    </div>
                  </div>
                </div>

                {/* Role Switching */}
                {onRoleSwitch && (
                  <div className="p-2 border-b border-border">
                    <p className="caption text-muted-foreground uppercase font-medium px-3 py-2">
                      Switch Role
                    </p>
                    {roles.map((role) => (
                      <button
                        key={role.value}
                        onClick={() => handleRoleSwitch(role.value)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-md
                          transition-smooth text-left
                          ${
                            role.value === userRole
                              ? 'bg-primary/10 text-primary' :'text-foreground hover:bg-muted'
                          }
                        `}
                      >
                        <Icon name={role.icon as any} size={18} />
                        <span className="text-sm">{role.label}</span>
                        {role.value === userRole && (
                          <Icon name="CheckIcon" size={16} className="ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-error hover:bg-error/10 transition-smooth"
                  >
                    <Icon name="ArrowRightOnRectangleIcon" size={18} />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleContextHeader;