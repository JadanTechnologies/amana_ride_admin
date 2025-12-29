import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Transaction {
  id: string;
  reference: string;
  gateway: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'disputed';
  date: string;
  settlementDate: string;
  customer: string;
}

interface TransactionReconciliationTableProps {
  transactions: Transaction[];
}

const TransactionReconciliationTable = ({ transactions }: TransactionReconciliationTableProps) => {
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-success/10 text-success',
      pending: 'bg-warning/10 text-warning',
      failed: 'bg-error/10 text-error',
      disputed: 'bg-muted text-muted-foreground',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const formatCurrency = (value: number) => {
    return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredTransactions = transactions.filter(
    (t) => filterStatus === 'all' || t.status === filterStatus
  );

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Transaction Reconciliation</h3>
            <p className="caption text-muted-foreground text-sm mt-1">
              Payment gateway status and settlement tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="disputed">Disputed</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-smooth">
              <Icon name="ArrowDownTrayIcon" size={18} />
              <span className="text-sm font-medium">Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('reference')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Reference
                  <Icon name="ChevronUpDownIcon" size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('gateway')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Gateway
                  <Icon name="ChevronUpDownIcon" size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('customer')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Customer
                  <Icon name="ChevronUpDownIcon" size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Amount
                  <Icon name="ChevronUpDownIcon" size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Status
                  <Icon name="ChevronUpDownIcon" size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-smooth"
                >
                  Date
                  <Icon name="ChevronUpDownIcon" size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Settlement
                </span>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-muted/30 transition-smooth">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="data-text text-sm text-foreground">{transaction.reference}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-foreground">{transaction.gateway}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-foreground">{transaction.customer}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(transaction.amount)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-muted-foreground">{transaction.date}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-muted-foreground">{transaction.settlementDate}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1.5 rounded-md hover:bg-muted transition-smooth"
                      title="View details"
                    >
                      <Icon name="EyeIcon" size={16} className="text-muted-foreground" />
                    </button>
                    {transaction.status === 'disputed' && (
                      <button
                        className="p-1.5 rounded-md hover:bg-error/10 transition-smooth"
                        title="Resolve dispute"
                      >
                        <Icon name="ExclamationTriangleIcon" size={16} className="text-error" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="caption text-muted-foreground text-sm">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-smooth disabled:opacity-50">
              Previous
            </button>
            <button className="px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-smooth disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionReconciliationTable;