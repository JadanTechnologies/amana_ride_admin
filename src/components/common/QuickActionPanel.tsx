'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'warning' | 'error' | 'success';
  onClick: () => void;
}

interface QuickActionPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  userRole?: 'Super Admin' | 'Operations Admin' | 'Finance Admin' | 'Support Admin';
}

const QuickActionPanel = ({
  isOpen = false,
  onClose,
  userRole = 'Super Admin',
}: QuickActionPanelProps) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const getActionsForRole = (): QuickAction[] => {
    const commonActions: QuickAction[] = [
      {
        id: 'emergency-broadcast',
        label: 'Emergency Broadcast',
        icon: 'SpeakerWaveIcon',
        variant: 'error',
        onClick: () => handleActionClick('emergency-broadcast'),
      },
      {
        id: 'system-alert',
        label: 'System Alert',
        icon: 'BellAlertIcon',
        variant: 'warning',
        onClick: () => handleActionClick('system-alert'),
      },
    ];

    const roleSpecificActions: Record<string, QuickAction[]> = {
      'Super Admin': [
        {
          id: 'pause-operations',
          label: 'Pause All Operations',
          icon: 'PauseIcon',
          variant: 'error',
          onClick: () => handleActionClick('pause-operations'),
        },
        {
          id: 'force-logout',
          label: 'Force User Logout',
          icon: 'ArrowRightOnRectangleIcon',
          variant: 'warning',
          onClick: () => handleActionClick('force-logout'),
        },
      ],
      'Operations Admin': [
        {
          id: 'dispatch-support',
          label: 'Dispatch Support',
          icon: 'TruckIcon',
          variant: 'primary',
          onClick: () => handleActionClick('dispatch-support'),
        },
        {
          id: 'driver-alert',
          label: 'Alert All Drivers',
          icon: 'UserGroupIcon',
          variant: 'warning',
          onClick: () => handleActionClick('driver-alert'),
        },
      ],
      'Finance Admin': [
        {
          id: 'freeze-transactions',
          label: 'Freeze Transactions',
          icon: 'LockClosedIcon',
          variant: 'error',
          onClick: () => handleActionClick('freeze-transactions'),
        },
        {
          id: 'generate-report',
          label: 'Generate Emergency Report',
          icon: 'DocumentTextIcon',
          variant: 'primary',
          onClick: () => handleActionClick('generate-report'),
        },
      ],
      'Support Admin': [
        {
          id: 'escalate-ticket',
          label: 'Escalate Priority Ticket',
          icon: 'ArrowUpIcon',
          variant: 'error',
          onClick: () => handleActionClick('escalate-ticket'),
        },
        {
          id: 'broadcast-message',
          label: 'Broadcast Support Message',
          icon: 'ChatBubbleLeftRightIcon',
          variant: 'primary',
          onClick: () => handleActionClick('broadcast-message'),
        },
      ],
    };

    return [...commonActions, ...(roleSpecificActions[userRole] || [])];
  };

  const handleActionClick = (actionId: string) => {
    setSelectedAction(actionId);
    console.log(`Quick action triggered: ${actionId}`);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    setSelectedAction(null);
  };

  const actions = getActionsForRole();

  const getVariantStyles = (variant: string) => {
    const styles = {
      primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      warning: 'bg-warning hover:bg-warning/90 text-warning-foreground',
      error: 'bg-error hover:bg-error/90 text-error-foreground',
      success: 'bg-success hover:bg-success/90 text-success-foreground',
    };
    return styles[variant as keyof typeof styles] || styles.primary;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background z-[290]"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[295] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl bg-card rounded-xl shadow-elevation-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                <Icon name="BoltIcon" size={20} className="text-error" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                <p className="caption text-muted-foreground text-sm">
                  Emergency response and rapid intervention tools
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-muted transition-smooth"
              aria-label="Close quick actions"
            >
              <Icon name="XMarkIcon" size={20} />
            </button>
          </div>

          {/* Actions Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg
                    transition-smooth
                    ${getVariantStyles(action.variant)}
                    ${selectedAction === action.id ? 'ring-2 ring-offset-2 ring-ring' : ''}
                    hover:scale-[0.98] active:scale-[0.97]
                  `}
                >
                  <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon name={action.icon as any} size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{action.label}</p>
                  </div>
                  <Icon name="ChevronRightIcon" size={20} className="flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border bg-muted/50 rounded-b-xl">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="InformationCircleIcon" size={16} />
              <p className="caption text-xs">
                All actions are logged and require confirmation before execution
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickActionPanel;