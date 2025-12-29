'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface NavigationBreadcrumbsProps {
  customBreadcrumbs?: BreadcrumbItem[];
}

const NavigationBreadcrumbs = ({ customBreadcrumbs }: NavigationBreadcrumbsProps) => {
  const pathname = usePathname();

  const routeLabels: Record<string, string> = {
    '/main-dashboard': 'Main Dashboard',
    '/financial-analytics': 'Financial Analytics',
    '/live-operations-monitor': 'Live Operations Monitor',
    '/user-analytics': 'User Analytics',
    '/system-health-monitor': 'System Health Monitor',
  };

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customBreadcrumbs) {
      return customBreadcrumbs;
    }

    const paths = pathname.split('/').filter(Boolean);
    
    // Don't show breadcrumbs if we're on the main dashboard
    if (pathname === '/main-dashboard') {
      return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/main-dashboard' },
    ];

    let currentPath = '';
    paths.forEach((path) => {
      currentPath += `/${path}`;
      // Skip adding main-dashboard again if it's already in the breadcrumbs
      if (currentPath === '/main-dashboard') {
        return;
      }
      const label = routeLabels[currentPath] || path.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="py-4">
      <ol className="flex items-center gap-2 flex-wrap">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={`${crumb.path}-${index}`} className="flex items-center gap-2">
              {!isFirst && (
                <Icon
                  name="ChevronRightIcon"
                  size={16}
                  className="text-muted-foreground flex-shrink-0"
                />
              )}
              {isLast ? (
                <span className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="text-sm text-muted-foreground hover:text-primary transition-smooth truncate max-w-[150px] sm:max-w-none"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default NavigationBreadcrumbs;