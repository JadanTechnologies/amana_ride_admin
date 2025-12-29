import Icon from '@/components/ui/AppIcon';

interface SatisfactionScoreProps {
  score: number;
  totalResponses: number;
  distribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
}

const SatisfactionScore = ({ score, totalResponses, distribution }: SatisfactionScoreProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-success';
    if (score >= 3.5) return 'text-primary';
    if (score >= 2.5) return 'text-warning';
    return 'text-error';
  };

  const ratings = [
    { label: 'Excellent', value: distribution.excellent, color: 'bg-success' },
    { label: 'Good', value: distribution.good, color: 'bg-primary' },
    { label: 'Average', value: distribution.average, color: 'bg-warning' },
    { label: 'Poor', value: distribution.poor, color: 'bg-error' },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="StarIcon" size={20} className="text-warning" />
        <h4 className="font-semibold text-foreground">User Satisfaction</h4>
      </div>

      <div className="text-center mb-6">
        <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
          {score.toFixed(1)}
        </div>
        <div className="flex items-center justify-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Icon
              key={star}
              name="StarIcon"
              size={16}
              className={star <= Math.round(score) ? 'text-warning' : 'text-muted'}
            />
          ))}
        </div>
        <p className="caption text-muted-foreground text-sm mt-2">
          Based on {totalResponses.toLocaleString()} responses
        </p>
      </div>

      <div className="space-y-3">
        {ratings.map((rating) => (
          <div key={rating.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="caption text-muted-foreground text-xs">{rating.label}</span>
              <span className="caption text-foreground text-xs font-medium">
                {rating.value}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${rating.color} rounded-full transition-all duration-500`}
                style={{ width: `${rating.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SatisfactionScore;