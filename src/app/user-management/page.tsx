'use client';

import React from 'react';
import Sidebar from '@/components/common/Sidebar';
import RoleContextHeader from '@/components/common/RoleContextHeader';

import { RealtimeConnectionOverlay } from '@/components/common/RealtimeConnectionOverlay';

export default function UserManagement() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[280px]">
        <RoleContextHeader 
          userName="Admin User"
          userRole="User Manager"
        />
        
        <main className="p-6">
          {/* ... keep existing content ... */}
        </main>
      </div>

      {/* Unified Real-time Connection Overlay */}
      <RealtimeConnectionOverlay position="bottom-right" />
    </div>
  );
}