import Icon from '@/components/ui/AppIcon';

interface CityData {
  id: string;
  name: string;
  revenue: number;
  growth: number;
  transactions: number;
}

interface TopCitiesLeaderboardProps {
  cities: CityData[];
}

const TopCitiesLeaderboard = ({ cities }: TopCitiesLeaderboardProps) => {
  const formatCurrency = (value: number) => {
    return `₦${(value / 1000000).toFixed(2)}M`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const getMedalIcon = (index: number) => {
    const medals = ['🥇', '🥈', '🥉'];
    return medals[index] || `#${index + 1}`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Top Performing Cities</h3>
          <p className="caption text-muted-foreground text-sm mt-1">
            Revenue leaders by location
          </p>
        </div>
        <Icon name="MapPinIcon" size={20} className="text-primary" />
      </div>

      <div className="space-y-4">
        {cities.map((city, index) => (
          <div
            key={city.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-smooth"
          >
            <div className="text-2xl font-bold w-10 text-center">
              {getMedalIcon(index)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-foreground">{city.name}</h4>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(city.revenue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="caption text-muted-foreground text-xs">
                  {formatNumber(city.transactions)} transactions
                </span>
                <div className={`flex items-center gap-1 ${
                  city.growth >= 0 ? 'text-success' : 'text-error'
                }`}>
                  <Icon 
                    name={city.growth >= 0 ? 'ArrowUpIcon' : 'ArrowDownIcon'} 
                    size={12} 
                  />
                  <span className="caption text-xs font-medium">
                    {Math.abs(city.growth)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopCitiesLeaderboard;