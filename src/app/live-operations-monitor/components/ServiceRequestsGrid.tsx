'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ServiceRequest {
  id: string;
  requestId: string;
  passengerName: string;
  serviceType: 'okada' | 'keke' | 'minibus' | 'logistics';
  pickupLocation: string;
  dropoffLocation: string;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  assignedDriver?: string;
  requestTime: string;
  estimatedFare: number;
  priority: 'normal' | 'high' | 'urgent';
}

interface ServiceRequestsGridProps {
  onInterventionClick?: (requestId: string) => void;
}

const ServiceRequestsGrid = ({ onInterventionClick }: ServiceRequestsGridProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const mockRequests: ServiceRequest[] = [
      {
        id: 'R001',
        requestId: 'REQ-2025-001',
        passengerName: 'Adebayo Johnson',
        serviceType: 'okada',
        pickupLocation: 'Victoria Island, Lagos',
        dropoffLocation: 'Lekki Phase 1, Lagos',
        status: 'pending',
        requestTime: '2 min ago',
        estimatedFare: 1500,
        priority: 'urgent',
      },
      {
        id: 'R002',
        requestId: 'REQ-2025-002',
        passengerName: 'Fatima Abubakar',
        serviceType: 'keke',
        pickupLocation: 'Ikeja GRA, Lagos',
        dropoffLocation: 'Maryland, Lagos',
        status: 'assigned',
        assignedDriver: 'Amina Bello',
        requestTime: '5 min ago',
        estimatedFare: 800,
        priority: 'normal',
      },
      {
        id: 'R003',
        requestId: 'REQ-2025-003',
        passengerName: 'Chioma Okonkwo',
        serviceType: 'minibus',
        pickupLocation: 'Surulere, Lagos',
        dropoffLocation: 'Ajah, Lagos',
        status: 'in-progress',
        assignedDriver: 'Tunde Adeyemi',
        requestTime: '12 min ago',
        estimatedFare: 2500,
        priority: 'high',
      },
      {
        id: 'R004',
        requestId: 'REQ-2025-004',
        passengerName: 'Emeka Nwosu',
        serviceType: 'logistics',
        pickupLocation: 'Apapa, Lagos',
        dropoffLocation: 'Ikorodu, Lagos',
        status: 'in-progress',
        assignedDriver: 'Ngozi Eze',
        requestTime: '18 min ago',
        estimatedFare: 5000,
        priority: 'normal',
      },
      {
        id: 'R005',
        requestId: 'REQ-2025-005',
        passengerName: 'Yusuf Mohammed',
        serviceType: 'okada',
        pickupLocation: 'Yaba, Lagos',
        dropoffLocation: 'Ebute Metta, Lagos',
        status: 'pending',
        requestTime: '3 min ago',
        estimatedFare: 600,
        priority: 'normal',
      },
    ];

    setRequests(mockRequests);
  }, [isHydrated]);

  const handleIntervention = (requestId: string) => {
    if (onInterventionClick) {
      onInterventionClick(requestId);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-warning/10 text-warning border-warning/20',
      assigned: 'bg-info/10 text-info border-info/20',
      'in-progress': 'bg-primary/10 text-primary border-primary/20',
      completed: 'bg-success/10 text-success border-success/20',
      cancelled: 'bg-error/10 text-error border-error/20',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      normal: 'text-muted-foreground',
      high: 'text-warning',
      urgent: 'text-error',
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getServiceTypeLabel = (type: string) => {
    const labels = {
      okada: 'Okada',
      keke: 'Keke Napep',
      minibus: 'Mini Bus',
      logistics: 'Logistics',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredRequests = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter);

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="h-8 bg-muted rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Service Requests</h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="ClockIcon" size={16} />
            <span className="caption text-xs">Real-time updates</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
              statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
              statusFilter === 'pending' ? 'bg-warning text-warning-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('assigned')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
              statusFilter === 'assigned' ? 'bg-info text-info-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Assigned
          </button>
          <button
            onClick={() => setStatusFilter('in-progress')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
              statusFilter === 'in-progress' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            In Progress
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/50">
            <div className="col-span-2 caption text-muted-foreground text-xs font-medium uppercase">Request ID</div>
            <div className="col-span-2 caption text-muted-foreground text-xs font-medium uppercase">Passenger</div>
            <div className="col-span-3 caption text-muted-foreground text-xs font-medium uppercase">Route</div>
            <div className="col-span-2 caption text-muted-foreground text-xs font-medium uppercase">Status</div>
            <div className="col-span-1 caption text-muted-foreground text-xs font-medium uppercase">Fare</div>
            <div className="col-span-2 caption text-muted-foreground text-xs font-medium uppercase">Actions</div>
          </div>

          <div className="divide-y divide-border">
            {filteredRequests.map((request) => (
              <div key={request.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-smooth">
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Icon name={getPriorityColor(request.priority) === 'text-error' ? 'ExclamationTriangleIcon' : 'DocumentTextIcon'} size={16} className={getPriorityColor(request.priority)} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{request.requestId}</p>
                      <p className="caption text-muted-foreground text-xs">{request.requestTime}</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <p className="text-sm font-medium text-foreground">{request.passengerName}</p>
                  <p className="caption text-muted-foreground text-xs">{getServiceTypeLabel(request.serviceType)}</p>
                </div>

                <div className="col-span-3">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Icon name="MapPinIcon" size={14} className="text-success mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-foreground truncate">{request.pickupLocation}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon name="FlagIcon" size={14} className="text-error mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-foreground truncate">{request.dropoffLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(request.status)}`}>
                    <span className="capitalize">{request.status.replace('-', ' ')}</span>
                  </div>
                  {request.assignedDriver && (
                    <p className="caption text-muted-foreground text-xs mt-1">Driver: {request.assignedDriver}</p>
                  )}
                </div>

                <div className="col-span-1">
                  <p className="text-sm font-semibold text-foreground">₦{request.estimatedFare.toLocaleString()}</p>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <button
                    onClick={() => handleIntervention(request.id)}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-smooth"
                  >
                    Intervene
                  </button>
                  <button className="p-1.5 rounded-md bg-muted text-foreground hover:bg-muted/80 transition-smooth">
                    <Icon name="EllipsisVerticalIcon" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequestsGrid;