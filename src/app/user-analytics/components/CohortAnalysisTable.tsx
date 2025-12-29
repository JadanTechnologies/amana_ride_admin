'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CohortData {
  cohort: string;
  users: number;
  retention: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
  avgLifetimeValue: string;
  churnRisk: 'low' | 'medium' | 'high';
}

interface CohortAnalysisTableProps {
  data: CohortData[];
  onExport: () => void;
}

const CohortAnalysisTable = ({ data, onExport }: CohortAnalysisTableProps) => {
  const [sortField, setSortField] = useState<keyof CohortData>('cohort');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof CohortData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getChurnRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'high': return 'bg-error/10 text-error';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRetentionColor = (value: number) => {
    if (value >= 70) return 'text-success';
    if (value >= 50) return 'text-primary';
    if (value >= 30) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Cohort Analysis</h3>
          <p className="caption text-muted-foreground text-sm mt-1">
            User retention and behavior patterns by cohort
          </p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-smooth"
        >
          <Icon name="ArrowDownTrayIcon" size={18} />
          <span className="text-sm font-medium">Export Data</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('cohort')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  Cohort
                  <Icon name="ChevronUpDownIcon" size={16} />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('users')}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  Users
                  <Icon name="ChevronUpDownIcon" size={16} />
                </button>
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                Week 1
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                Week 2
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                Week 3
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                Week 4
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                Avg LTV
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                Churn Risk
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr key={row.cohort} className="hover:bg-muted/30 transition-smooth">
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-foreground">{row.cohort}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-foreground">{row.users.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-medium ${getRetentionColor(row.retention.week1)}`}>
                    {row.retention.week1}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-medium ${getRetentionColor(row.retention.week2)}`}>
                    {row.retention.week2}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-medium ${getRetentionColor(row.retention.week3)}`}>
                    {row.retention.week3}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-medium ${getRetentionColor(row.retention.week4)}`}>
                    {row.retention.week4}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-foreground">₦{row.avgLifetimeValue}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                    ${getChurnRiskColor(row.churnRisk)}
                  `}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    {row.churnRisk.charAt(0).toUpperCase() + row.churnRisk.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CohortAnalysisTable;