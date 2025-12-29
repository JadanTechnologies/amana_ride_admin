import Icon from '@/components/ui/AppIcon';

interface Trip {
  id: string;
  tripId: string;
  passenger: string;
  driver: string;
  service: 'Okada' | 'Keke' | 'Mini Bus' | 'Logistics';
  status: 'active' | 'completed' | 'cancelled';
  pickup: string;
  dropoff: string;
  fare: number;
  duration: string;
}

interface TripSummaryTableProps {
  trips: Trip[];
}

const TripSummaryTable = ({ trips }: TripSummaryTableProps) => {
  const getStatusStyles = (status: string) => {
    const styles = {
      active: 'bg-primary/10 text-primary',
      completed: 'bg-success/10 text-success',
      cancelled: 'bg-error/10 text-error',
    };
    return styles[status as keyof typeof styles];
  };

  const getServiceIcon = (service: string) => {
    const icons = {
      Okada: 'TruckIcon',
      Keke: 'TruckIcon',
      'Mini Bus': 'TruckIcon',
      Logistics: 'CubeIcon',
    };
    return icons[service as keyof typeof icons] || 'TruckIcon';
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-elevation-1 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Current Trips</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left caption text-muted-foreground text-xs font-medium uppercase">Trip ID</th>
              <th className="px-4 py-3 text-left caption text-muted-foreground text-xs font-medium uppercase">Service</th>
              <th className="px-4 py-3 text-left caption text-muted-foreground text-xs font-medium uppercase">Passenger</th>
              <th className="px-4 py-3 text-left caption text-muted-foreground text-xs font-medium uppercase">Driver</th>
              <th className="px-4 py-3 text-left caption text-muted-foreground text-xs font-medium uppercase">Route</th>
              <th className="px-4 py-3 text-left caption text-muted-foreground text-xs font-medium uppercase">Status</th>
              <th className="px-4 py-3 text-left caption text-muted-foreground text-xs font-medium uppercase">Fare</th>
              <th className="px-4 py-3 text-left caption text-muted-foreground text-xs font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-muted/50 transition-smooth">
                <td className="px-4 py-3">
                  <span className="data-text text-sm text-foreground">{trip.tripId}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name={getServiceIcon(trip.service) as any} size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{trip.service}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground">{trip.passenger}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-foreground">{trip.driver}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-foreground">{trip.pickup}</span>
                    <Icon name="ArrowDownIcon" size={12} className="text-muted-foreground" />
                    <span className="text-xs text-foreground">{trip.dropoff}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getStatusStyles(trip.status)}`}>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="data-text text-sm font-medium text-foreground">₦{trip.fare.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3">
                  <button className="p-2 rounded-md hover:bg-muted transition-smooth" aria-label="View trip details">
                    <Icon name="EyeIcon" size={16} className="text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TripSummaryTable;