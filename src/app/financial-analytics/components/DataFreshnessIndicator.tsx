'use client';

import { useState, useEffect } from 'react';


const DataFreshnessIndicator = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const updateTimestamp = () => {
      const now = new Date();
      const formatted = now?.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastUpdate(formatted);
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 1000);

    return () => clearInterval(interval);
  }, [isHydrated]);

  if (!isHydrated) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
        <span className="caption text-muted-foreground text-xs">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-md">
      <div className="relative">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse-subtle" />
        <div className="absolute inset-0 w-2 h-2 rounded-full bg-success opacity-50 animate-ping" />
      </div>
      <span className="caption text-success text-xs font-medium">
        Live • Updated {lastUpdate}
      </span>
    </div>
  );
};

export default DataFreshnessIndicator;