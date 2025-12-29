'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { accountSecurityService } from '@/services/accountSecurityService';
import { mfaService } from '@/services/mfaService';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
  mfa?: string;
}

// Mobile-only roles that should not access web portal
const MOBILE_ONLY_ROLES = ['driver', 'passenger'];

// Updated test credential for admin login
const TEST_CREDENTIALS = [
  {
    role: 'Super Admin',
    email: 'admin@amanaride.com',
    password: 'Amana@2026',
    description: 'Full System Access',
    icon: 'shield'
  }
];

export default function AdminLoginInteractive() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);

  // 2FA specific state
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaCode, setMFACode] = useState('');
  const [mfaMethod, setMFAMethod] = useState<'totp' | 'email'>('totp');
  const [userId, setUserId] = useState<string | null>(null);

  // Add security tracking state
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  // Add function to handle quick login credential fill
  const handleQuickLoginSelect = (email: string, password: string) => {
    setFormData((prev) => ({
      ...prev,
      email,
      password
    }));
    setErrors({});
    setShowPassword(true);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Generate device fingerprint and session ID on component mount
  React.useEffect(() => {
    const generateFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('browser fingerprint', 2, 2);
        return canvas.toDataURL().slice(-50);
      }
      return '';
    };

    setDeviceFingerprint(generateFingerprint());
    setSessionId(crypto.randomUUID());
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check if account is locked before attempting login
    const lockoutCheck = await accountSecurityService.isAccountLocked(formData.email);
    if (lockoutCheck.isLocked) {
      setErrors({
        general: `Account is locked until ${new Date(lockoutCheck.lockedUntil!).toLocaleString()}. ${lockoutCheck.reason || 'Multiple failed login attempts detected.'}`,
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Attempt Supabase authentication
      await signIn(formData.email, formData.password);

      // Get the authenticated user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new Error('Failed to retrieve session after login');
      }

      // Store user ID for MFA verification
      setUserId(session.user.id);

      // Record successful authentication (before MFA)
      await accountSecurityService.recordLoginAttempt({
        userId: session.user.id,
        email: formData.email,
        result: 'success',
        ipAddress: undefined, // Will be captured server-side if needed
        userAgent: navigator.userAgent,
        deviceFingerprint,
        sessionId
      });

      // Check if user has MFA enabled
      const { data: hasMFA } = await mfaService.hasMFAEnabled(session.user.id);

      if (hasMFA) {
        // User has MFA enabled - require verification before proceeding
        setRequiresMFA(true);
        setIsLoading(false);
        return;
      }

      // Continue with existing authorization checks if no MFA required
      await completeLogin(session.user.id);

    } catch (error: any) {
      // Record failed login attempt
      await accountSecurityService.recordLoginAttempt({
        email: formData.email,
        result: 'failed_password',
        userAgent: navigator.userAgent,
        deviceFingerprint,
        failureReason: error?.message || 'Authentication failed',
        sessionId
      });

      // Handle authentication errors
      setLoginAttempts((prev) => prev + 1);

      if (loginAttempts >= 2) {
        setShowCaptcha(true);
      }

      // Provide user-friendly error messages
      if (error?.message?.includes('Invalid login credentials')) {
        setErrors({
          general: 'Invalid email or password. Please check your credentials and try again.',
        });
      } else if (error?.message?.includes('Email not confirmed')) {
        setErrors({
          general: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        });
      } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        setErrors({
          general: 'Cannot connect to authentication service. Please check your internet connection or contact support if the issue persists.',
        });
      } else {
        setErrors({
          general: error?.message || 'An error occurred during sign in. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerification = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!mfaCode || mfaCode.length !== 6) {
      setErrors({
        mfa: 'Please enter a valid 6-digit verification code',
      });
      return;
    }

    if (!userId) {
      setErrors({
        mfa: 'Session expired. Please sign in again.',
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Verify MFA code
      const response = await mfaService.verifyMFACode({
        userId,
        method: mfaMethod,
        code: mfaCode
      });

      if (!response.success) {
        // Record failed MFA attempt
        await accountSecurityService.recordLoginAttempt({
          userId,
          email: formData.email,
          result: 'failed_mfa',
          userAgent: navigator.userAgent,
          deviceFingerprint,
          failureReason: response.message,
          sessionId
        });

        setErrors({
          mfa: response.message
        });

        if (response.lockedUntil) {
          setErrors({
            mfa: `Account locked until ${new Date(response.lockedUntil).toLocaleString()}. Too many failed verification attempts.`
          });
          await supabase.auth.signOut();
          setRequiresMFA(false);
          return;
        }

        if (response.remainingAttempts !== undefined) {
          setErrors({
            mfa: `${response.message}. ${response.remainingAttempts} attempts remaining.`
          });
        }
        return;
      }

      // MFA verified successfully - complete login
      await completeLogin(userId);

    } catch (error: any) {
      setErrors({
        mfa: error?.message || 'Failed to verify code. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = async (currentUserId: string) => {
    try {
      // Fetch staff member profile and role information
      const { data: staffMember, error: staffError } = await supabase
        .from('staff_members')
        .select(`
          id,
          employee_id,
          job_title,
          department,
          employment_status,
          roles (
            name,
            display_name,
            level
          )
        `)
        .eq('user_profile_id', currentUserId)
        .single();

      if (staffError) {
        // Record authorization failure
        await accountSecurityService.recordLoginAttempt({
          userId: currentUserId,
          email: formData.email,
          result: 'account_disabled',
          userAgent: navigator.userAgent,
          deviceFingerprint,
          failureReason: 'No staff profile found',
          sessionId
        });

        // User authenticated but no staff profile exists
        setErrors({
          general: 'Access denied. No staff profile found for this account. Please contact your administrator.',
        });
        await supabase.auth.signOut();
        setLoginAttempts((prev) => prev + 1);
        if (loginAttempts >= 2) {
          setShowCaptcha(true);
        }
        return;
      }

      // Check if user has active employment status
      if (staffMember.employment_status !== 'active') {
        // Record authorization failure
        await accountSecurityService.recordLoginAttempt({
          userId: currentUserId,
          email: formData.email,
          result: 'account_disabled',
          userAgent: navigator.userAgent,
          deviceFingerprint,
          failureReason: `Employment status: ${staffMember.employment_status}`,
          sessionId
        });

        setErrors({
          general: `Access denied. Your account status is "${staffMember.employment_status}". Please contact your administrator.`,
        });
        await supabase.auth.signOut();
        setLoginAttempts((prev) => prev + 1);
        if (loginAttempts >= 2) {
          setShowCaptcha(true);
        }
        return;
      }

      // Check if role is web-accessible (not mobile-only)
      const roleName = staffMember.roles?.name?.toLowerCase() || '';
      if (MOBILE_ONLY_ROLES.includes(roleName)) {
        // Record authorization failure
        await accountSecurityService.recordLoginAttempt({
          userId: currentUserId,
          email: formData.email,
          result: 'role_restricted',
          userAgent: navigator.userAgent,
          deviceFingerprint,
          failureReason: `Role ${roleName} not permitted for web access`,
          sessionId
        });

        setErrors({
          general: `${staffMember.roles?.display_name || 'This'} accounts are not permitted to access the web application. Please use the mobile app instead.`,
        });
        await supabase.auth.signOut();
        setLoginAttempts((prev) => prev + 1);
        if (loginAttempts >= 2) {
          setShowCaptcha(true);
        }
        return;
      }

      // Successful login - store user info if remember me is checked
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('userRole', staffMember.roles?.display_name || 'Staff');
        localStorage.setItem('employeeId', staffMember.employee_id || '');
      }

      // Redirect to dashboard
      router.push('/main-dashboard');
    } catch (error: any) {
      setErrors({
        general: error?.message || 'An error occurred during authorization. Please try again.',
      });
    }
  };

  const handleMFACodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setMFACode(value);

    if (errors.mfa) {
      setErrors((prev) => ({
        ...prev,
        mfa: undefined,
      }));
    }
  };

  // If MFA is required, show MFA verification form
  if (requiresMFA) {
    return (
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-elevation-2">
            <svg
              className="w-10 h-10 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="Amana Ride Logo"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Two-Factor Authentication</h1>
          <p className="text-muted-foreground">Enter your verification code</p>
        </div>

        {/* MFA Verification Card */}
        <div className="bg-card rounded-2xl shadow-elevation-3 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-card-foreground mb-2">Verify Your Identity</h2>
            <p className="text-muted-foreground text-sm">
              Enter the 6-digit code from your authenticator app or the code sent to your email.
            </p>
          </div>

          {/* MFA Error Message */}
          {errors.mfa && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
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
              <p className="text-sm text-error">{errors.mfa}</p>
            </div>
          )}

          {/* MFA Verification Form */}
          <form onSubmit={handleMFAVerification} className="space-y-5">
            {/* Verification Code Input */}
            <div>
              <label htmlFor="mfaCode" className="block text-sm font-medium text-card-foreground mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="mfaCode"
                name="mfaCode"
                value={mfaCode}
                onChange={handleMFACodeChange}
                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-fast text-center text-2xl tracking-widest ${
                  errors.mfa ? 'border-error focus:ring-error' : 'border-input focus:border-accent'
                }`}
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                disabled={isLoading}
                autoFocus
              />
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || mfaCode.length !== 6}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-elevation-1"
            >
              {isLoading ? (
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
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify Code</span>
                  <svg
                    className="w-5 h-5"
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
                </>
              )}
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => {
                setRequiresMFA(false);
                setMFACode('');
                setErrors({});
                supabase.auth.signOut();
              }}
              className="w-full py-3 px-4 bg-background text-foreground border border-input rounded-lg font-medium hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth"
              disabled={isLoading}
            >
              Cancel & Sign Out
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Cannot access your authenticator app?
              </p>
              <button
                type="button"
                className="text-sm text-accent hover:text-accent/80 font-medium transition-fast"
                onClick={() => {
                  // In production, this would trigger backup code or support flow
                  setErrors({
                    mfa: 'Please contact your administrator for assistance with account recovery.'
                  });
                }}
              >
                Get Help
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo and Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-elevation-2">
          <svg
            className="w-10 h-10 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="Amana Ride Logo"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Amana Ride</h1>
        <p className="text-muted-foreground">Admin Portal</p>
      </div>

      {/* Login Card */}
      <div className="bg-card rounded-2xl shadow-elevation-3 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-card-foreground mb-2">Welcome Back</h2>
          <p className="text-muted-foreground text-sm">
            Sign in to access the administrative dashboard
          </p>
        </div>

        {/* Quick Login Section - NEW */}
        <div className="mb-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <p className="text-sm font-semibold text-accent">Quick Login (Development)</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Click to auto-fill credentials for quick testing
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TEST_CREDENTIALS.map((cred, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickLoginSelect(cred.email, cred.password)}
                className="p-3 bg-card border border-input rounded-lg hover:bg-accent/10 hover:border-accent transition-fast text-left group"
                disabled={isLoading}
              >
                <div className="flex items-start gap-2">
                  {cred.icon === 'shield' && (
                    <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {cred.icon === 'settings' && (
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  {cred.icon === 'dollar' && (
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {cred.icon === 'support' && (
                    <svg className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-fast truncate">
                      {cred.role}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cred.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Platform Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs text-blue-700">
              <p className="font-semibold mb-1">Web Portal Access</p>
              <p>This portal is exclusively for Super Admin and management staff. Driver and passenger accounts are restricted to the mobile application.</p>
            </div>
          </div>
        </div>

        {/* General Error Message */}
        {errors.general && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
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
            <p className="text-sm text-error">{errors.general}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-fast ${
                  errors.email ? 'border-error focus:ring-error' : 'border-input focus:border-accent'
                }`}
                placeholder="your.email@amanaride.com"
                autoComplete="email"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className={`w-5 h-5 ${errors.email ? 'text-error' : 'text-muted-foreground'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
              </div>
            </div>
            {errors.email && (
              <p className="mt-1.5 text-sm text-error flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-fast ${
                  errors.password ? 'border-error focus:ring-error' : 'border-input focus:border-accent'
                }`}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-fast"
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-sm text-error flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.password}
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-input text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0 transition-fast cursor-pointer"
                disabled={isLoading}
              />
              <span className="text-sm text-card-foreground group-hover:text-foreground transition-fast select-none">
                Remember me
              </span>
            </label>
            <Link
              href="/password-reset"
              className="text-sm text-accent hover:text-accent/80 font-medium transition-fast"
            >
              Forgot password?
            </Link>
          </div>

          {/* CAPTCHA Indicator (shown after multiple failed attempts) */}
          {showCaptcha && (
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-warning flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm text-warning">
                  Multiple failed attempts detected. Please verify you are human before continuing.
                </p>
              </div>
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-elevation-1"
          >
            {isLoading ? (
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
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-start gap-3">
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-card-foreground mb-1">Secure Authentication</p>
              <p>Your credentials are encrypted and authenticated through Supabase with enterprise-grade security.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          © 2025 Amana Ride. All rights reserved.
        </p>
      </div>
    </div>
  );
}