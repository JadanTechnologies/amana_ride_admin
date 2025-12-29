'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mfaService } from '@/services/mfaService';
import { UserMFASettings, MFAEnrollmentResponse } from '@/types/mfa.types';

export default function MFASettingsInteractive() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserMFASettings | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Enrollment state
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<MFAEnrollmentResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadMFASettings();
    }
  }, [user]);

  const loadMFASettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await mfaService.getUserMFASettings(user.id);
      
      if (fetchError) throw fetchError;
      
      setSettings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load MFA settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = async () => {
    if (!user?.id) return;

    try {
      setEnrolling(true);
      setError('');
      
      const { data, error: enrollError } = await mfaService.enrollTOTP(user.id);
      
      if (enrollError) throw enrollError;
      
      setEnrollmentData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate MFA enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!enrollmentData?.sessionId || !verificationCode) return;

    try {
      setVerifying(true);
      setError('');
      
      const { data, error: verifyError } = await mfaService.verifyTOTPEnrollment(
        enrollmentData.sessionId,
        verificationCode
      );
      
      if (verifyError) throw verifyError;
      
      if (data.success) {
        setSuccess('Two-factor authentication enabled successfully!');
        setEnrollmentData(null);
        setVerificationCode('');
        await loadMFASettings();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to verify code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!user?.id) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.'
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      setError('');
      
      const { error: disableError } = await mfaService.disableMFA(user.id);
      
      if (disableError) throw disableError;
      
      setSuccess('Two-factor authentication disabled');
      await loadMFASettings();
    } catch (err: any) {
      setError(err?.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <svg
          className="animate-spin h-8 w-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Two-Factor Authentication
        </h1>
        <p className="text-muted-foreground">
          Add an extra layer of security to your account by enabling two-factor authentication.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
          <svg
            className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-start gap-3">
          <svg
            className="w-5 h-5 text-success flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* Current Status */}
      <div className="bg-card rounded-xl shadow-elevation-2 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">Status</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {settings?.mfaEnabled 
                ? 'Two-factor authentication is currently enabled' :'Two-factor authentication is not enabled'}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            settings?.mfaEnabled 
              ? 'bg-success/10 text-success' :'bg-warning/10 text-warning'
          }`}>
            {settings?.mfaEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {settings?.mfaEnabled && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Method:</span>{' '}
                <span className="text-foreground font-medium">
                  {settings.primaryMethod === 'totp' ? 'Authenticator App' : 'Email'}
                </span>
              </div>
              {settings.lastVerifiedAt && (
                <div>
                  <span className="text-muted-foreground">Last verified:</span>{' '}
                  <span className="text-foreground">
                    {new Date(settings.lastVerifiedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enrollment/Management */}
      {!settings?.mfaEnabled && !enrollmentData && (
        <div className="bg-card rounded-xl shadow-elevation-2 p-6">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Enable Two-Factor Authentication
          </h2>
          <p className="text-muted-foreground mb-6">
            Protect your account with an extra layer of security. When enabled, you will need to enter
            a verification code from your authenticator app in addition to your password when signing in.
          </p>
          
          <button
            onClick={handleEnableMFA}
            disabled={enrolling}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {enrolling ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>Enable 2FA</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Enrollment Setup */}
      {enrollmentData && (
        <div className="bg-card rounded-xl shadow-elevation-2 p-6">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Set Up Your Authenticator App
          </h2>
          
          <div className="space-y-6">
            {/* Step 1: QR Code */}
            <div>
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                Step 1: Scan QR Code
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
              </p>
              
              {enrollmentData.qrCodeUri && (
                <div className="bg-background p-4 rounded-lg inline-block">
                  <img 
                    src={enrollmentData.qrCodeUri} 
                    alt="QR Code for 2FA setup"
                    className="w-48 h-48"
                  />
                </div>
              )}
              
              {enrollmentData.secret && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Or enter this secret key manually:
                  </p>
                  <code className="px-4 py-2 bg-background text-foreground rounded border border-input text-sm font-mono">
                    {enrollmentData.secret}
                  </code>
                </div>
              )}
            </div>

            {/* Step 2: Verify */}
            <div>
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                Step 2: Verify Code
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-digit code from your authenticator app to complete setup:
              </p>
              
              <form onSubmit={handleVerifyEnrollment} className="space-y-4">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full max-w-xs px-4 py-3 bg-background border border-input rounded-lg text-foreground text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  disabled={verifying}
                  autoFocus
                />
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={verifying || verificationCode.length !== 6}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Enable</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollmentData(null);
                      setVerificationCode('');
                      setError('');
                    }}
                    className="px-6 py-3 bg-background text-foreground border border-input rounded-lg font-medium hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth"
                    disabled={verifying}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Disable MFA */}
      {settings?.mfaEnabled && (
        <div className="bg-card rounded-xl shadow-elevation-2 p-6 border border-error/20">
          <h2 className="text-xl font-semibold text-error mb-2">
            Disable Two-Factor Authentication
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Disabling two-factor authentication will make your account less secure. Only do this if you
            no longer have access to your authenticator app.
          </p>
          
          <button
            onClick={handleDisableMFA}
            className="px-6 py-3 bg-error text-error-foreground rounded-lg font-medium hover:bg-error/90 focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 transition-smooth"
          >
            Disable 2FA
          </button>
        </div>
      )}
    </div>
  );
}