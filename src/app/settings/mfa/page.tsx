import React from 'react';
import { Metadata } from 'next';
import MFASettingsInteractive from './components/MFASettingsInteractive';

export const metadata: Metadata = {
  title: 'Two-Factor Authentication Settings - Amana Ride',
  description: 'Manage your two-factor authentication settings for enhanced account security',
};

export default function MFASettingsPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <MFASettingsInteractive />
      </div>
    </div>
  );
}