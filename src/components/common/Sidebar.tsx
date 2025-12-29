'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  tooltip: string;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

const Sidebar = ({ isCollapsed = false, onToggleCollapse }: SidebarProps) => {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigationGroups: NavigationGroup[] = [
    {
      title: 'Overview',
      items: [
        {
          label: 'Main Dashboard',
          path: '/main-dashboard',
          icon: 'HomeIcon',
          tooltip: 'Universal command center with real-time operational intelligence',
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          label: 'Live Operations',
          path: '/live-operations-monitor',
          icon: 'MapIcon',
          tooltip: 'Real-time monitoring and immediate operational response',
        },
        {
          label: 'System Health',
          path: '/system-health-monitor',
          icon: 'ServerIcon',
          tooltip: 'System health monitoring and performance metrics',
        },
      ],
    },
    {
      title: 'Analytics',
      items: [
        {
          label: 'Financial Analytics',
          path: '/financial-analytics',
          icon: 'CurrencyDollarIcon',
          tooltip: 'Strategic financial analysis and performance optimization',
        },
        {
          label: 'User Analytics',
          path: '/user-analytics',
          icon: 'ChartBarIcon',
          tooltip: 'Data-driven user insights and behavior analysis',
        },
      ],
    },
  ];

  const isActive = (path: string) => mounted && pathname === path;

  const handleMobileToggle = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={handleMobileToggle}
        className="lg:hidden fixed top-4 left-4 z-[150] p-2 rounded-md bg-card shadow-md transition-smooth hover:shadow-lg"
        aria-label="Toggle mobile menu"
      >
        <Icon name={isMobileOpen ? 'XMarkIcon' : 'Bars3Icon'} size={24} />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background z-[140]"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-card border-r border-border z-[145]
          transition-all duration-300 ease-smooth
          ${isCollapsed ? 'w-20' : 'w-[280px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:fixed
          flex flex-col
          shadow-elevation-2
        `}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-border">
          <Link href="/main-dashboard" className="flex items-center gap-3" onClick={closeMobileMenu}>
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <svg
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
              >
                <path
                  d="M20 8L8 14V26L20 32L32 26V14L20 8Z"
                  fill="currentColor"
                  className="text-primary-foreground"
                />
                <path
                  d="M20 20L14 16.5V23.5L20 27L26 23.5V16.5L20 20Z"
                  fill="currentColor"
                  className="text-accent"
                />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-heading font-semibold text-lg text-foreground leading-tight">
                  Amana Ride
                </span>
                <span className="caption text-muted-foreground text-xs">Admin Portal</span>
              </div>
            )}
          </Link>
          {!isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 rounded-md hover:bg-muted transition-smooth"
              aria-label="Collapse sidebar"
            >
              <Icon name="ChevronLeftIcon" size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-custom py-6 px-4">
          {navigationGroups.map((group, groupIndex) => (
            <div key={groupIndex} className={groupIndex > 0 ? 'mt-8' : ''}>
              {!isCollapsed && (
                <h3 className="caption text-muted-foreground uppercase font-medium mb-3 px-3">
                  {group.title}
                </h3>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      onClick={closeMobileMenu}
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-lg
                        transition-smooth group relative
                        ${
                          isActive(item.path)
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground hover:bg-muted hover:translate-y-[-1px]'
                        }
                      `}
                      title={isCollapsed ? item.tooltip : ''}
                    >
                      <Icon
                        name={item.icon as any}
                        size={20}
                        className="flex-shrink-0 text-muted-foreground group-hover:text-foreground data-[active=true]:text-primary-foreground"
                        data-active={isActive(item.path)}
                      />
                      {!isCollapsed && (
                        <span className="font-medium text-sm">{item.label}</span>
                      )}
                      {isActive(item.path) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* System Status Indicator */}
        <div className="border-t border-border p-4">
          <div
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg bg-muted
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <div className="relative flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse-subtle" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-success opacity-50 animate-ping" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">System Online</span>
                <span className="caption text-muted-foreground text-xs">All services operational</span>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle (Desktop) */}
        {isCollapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center p-4 border-t border-border hover:bg-muted transition-smooth"
            aria-label="Expand sidebar"
          >
            <Icon name="ChevronRightIcon" size={20} />
          </button>
        )}
      </aside>
    </>
  );
};

export default Sidebar;