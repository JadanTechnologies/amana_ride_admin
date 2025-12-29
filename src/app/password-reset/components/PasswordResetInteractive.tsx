'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ResetStep = 'email' | 'token' | 'password' | 'success';

interface EmailFormData {
  email: string;
  securityQuestion: string;
}

interface TokenFormData {
  token: string;
}

interface PasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  email?: string;
  securityQuestion?: string;
  token?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export default function PasswordResetInteractive() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ResetStep>('email');
  const [emailFormData, setEmailFormData] = useState<EmailFormData>({
    email: '',
    securityQuestion: '',
  });
  const [tokenFormData, setTokenFormData] = useState<TokenFormData>({
    token: '',
  });
  const [passwordFormData, setPasswordFormData] = useState<PasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<number>(600); // 10 minutes in seconds
  const [canResendToken, setCanResendToken] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: '',
  });

  // Token expiry countdown
  useEffect(() => {
    if (currentStep === 'token' && tokenExpiry > 0) {
      const timer = setInterval(() => {
        setTokenExpiry((prev) => {
          if (prev <= 1) {
            setCanResendToken(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, tokenExpiry]);

  // Format time for countdown
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password strength calculator
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score === 0) {
      return { score: 0, label: '', color: '' };
    } else if (score <= 2) {
      return { score: 1, label: 'Weak', color: 'bg-error' };
    } else if (score <= 3) {
      return { score: 2, label: 'Fair', color: 'bg-warning' };
    } else if (score <= 4) {
      return { score: 3, label: 'Good', color: 'bg-info' };
    } else {
      return { score: 4, label: 'Strong', color: 'bg-success' };
    }
  };

  // Password validation
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  // Update password strength on input change
  useEffect(() => {
    if (passwordFormData.newPassword) {
      setPasswordStrength(calculatePasswordStrength(passwordFormData.newPassword));
    } else {
      setPasswordStrength({ score: 0, label: '', color: '' });
    }
  }, [passwordFormData.newPassword]);

  // Validate email form
  const validateEmailForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!emailFormData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(emailFormData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!emailFormData.securityQuestion) {
      newErrors.securityQuestion = 'Security answer is required';
    } else if (emailFormData.securityQuestion.length < 3) {
      newErrors.securityQuestion = 'Answer must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate token form
  const validateTokenForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!tokenFormData.token) {
      newErrors.token = 'Verification code is required';
    } else if (tokenFormData.token.length !== 6) {
      newErrors.token = 'Verification code must be 6 digits';
    } else if (!/^\d+$/.test(tokenFormData.token)) {
      newErrors.token = 'Verification code must contain only numbers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate password form
  const validatePasswordForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const passwordError = validatePassword(passwordFormData.newPassword);
    if (passwordError) {
      newErrors.newPassword = passwordError;
    }

    if (!passwordFormData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle email input change
  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle token input change
  const handleTokenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setTokenFormData({ token: numericValue });
    
    if (errors.token) {
      setErrors((prev) => ({
        ...prev,
        token: undefined,
      }));
    }
  };

  // Handle password input change
  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle email form submission
  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateEmailForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call for email verification
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Mock success - move to token step
      setCurrentStep('token');
      setTokenExpiry(600); // Reset timer
      setCanResendToken(false);
    } catch (error) {
      setErrors({
        general: 'Unable to process request. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle token form submission
  const handleTokenSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateTokenForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call for token verification
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Mock token validation (accept "123456" as valid)
      if (tokenFormData.token === '123456') {
        setCurrentStep('password');
      } else {
        setErrors({
          token: 'Invalid verification code. Please try again.',
        });
      }
    } catch (error) {
      setErrors({
        general: 'Unable to verify code. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password form submission
  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call for password reset
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Mock success
      setCurrentStep('success');
      
      // Auto-redirect after 3 seconds
      setTimeout(() => {
        router.push('/admin-login');
      }, 3000);
    } catch (error) {
      setErrors({
        general: 'Unable to reset password. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend token
  const handleResendToken = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call to resend token
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Reset timer and disable resend
      setTokenExpiry(600);
      setCanResendToken(false);
      
      // Show success message
      setErrors({
        general: 'A new verification code has been sent to your email.',
      });
    } catch (error) {
      setErrors({
        general: 'Unable to resend code. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { id: 'email', label: 'Email', icon: '📧' },
      { id: 'token', label: 'Verify', icon: '🔐' },
      { id: 'password', label: 'Reset', icon: '🔑' },
    ];

    const getCurrentStepIndex = () => {
      if (currentStep === 'email') return 0;
      if (currentStep === 'token') return 1;
      if (currentStep === 'password') return 2;
      return 3;
    };

    const currentStepIndex = getCurrentStepIndex();

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold transition-smooth ${
                  index < currentStepIndex
                    ? 'bg-success text-success-foreground shadow-elevation-1'
                    : index === currentStepIndex
                    ? 'bg-primary text-primary-foreground shadow-elevation-2'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded-full transition-smooth ${
                  index < currentStepIndex ? 'bg-success' : 'bg-muted'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Render email verification step
  const renderEmailStep = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-5">
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
            value={emailFormData.email}
            onChange={handleEmailInputChange}
            className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-fast ${
              errors.email ? 'border-error focus:ring-error' : 'border-input focus:border-accent'
            }`}
            placeholder="admin@amanaride.com"
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

      {/* Security Question */}
      <div>
        <label
          htmlFor="securityQuestion"
          className="block text-sm font-medium text-card-foreground mb-2"
        >
          Security Question: What is your favorite city?
        </label>
        <div className="relative">
          <input
            type="text"
            id="securityQuestion"
            name="securityQuestion"
            value={emailFormData.securityQuestion}
            onChange={handleEmailInputChange}
            className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-fast ${
              errors.securityQuestion
                ? 'border-error focus:ring-error' :'border-input focus:border-accent'
            }`}
            placeholder="Enter your answer"
            autoComplete="off"
            disabled={isLoading}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={`w-5 h-5 ${
                errors.securityQuestion ? 'text-error' : 'text-muted-foreground'
              }`}
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
          </div>
        </div>
        {errors.securityQuestion && (
          <p className="mt-1.5 text-sm text-error flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errors.securityQuestion}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-elevation-1"
      >
        {isLoading ? (
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
            <span>Send Verification Code</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );

  // Render token verification step
  const renderTokenStep = () => (
    <form onSubmit={handleTokenSubmit} className="space-y-5">
      {/* Info Message */}
      <div className="p-4 bg-info/10 border border-info/20 rounded-lg flex items-start gap-3">
        <svg
          className="w-5 h-5 text-info flex-shrink-0 mt-0.5"
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
        <div className="text-sm text-info">
          <p className="font-medium mb-1">Verification code sent!</p>
          <p>We've sent a 6-digit code to {emailFormData.email}. Please check your inbox.</p>
        </div>
      </div>

      {/* Token Field */}
      <div>
        <label htmlFor="token" className="block text-sm font-medium text-card-foreground mb-2">
          Verification Code
        </label>
        <input
          type="text"
          id="token"
          name="token"
          value={tokenFormData.token}
          onChange={handleTokenInputChange}
          className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground text-center text-2xl font-mono tracking-wider placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-fast ${
            errors.token ? 'border-error focus:ring-error' : 'border-input focus:border-accent'
          }`}
          placeholder="000000"
          maxLength={6}
          autoComplete="off"
          disabled={isLoading}
        />
        {errors.token && (
          <p className="mt-1.5 text-sm text-error flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errors.token}
          </p>
        )}
      </div>

      {/* Expiry Timer */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 ${tokenExpiry > 60 ? 'text-success' : 'text-warning'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-card-foreground">
            Code expires in: <span className="font-mono font-semibold">{formatTime(tokenExpiry)}</span>
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-elevation-1"
      >
        {isLoading ? (
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
            <span>Verify Code</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Resend Code */}
      <div className="text-center">
        {canResendToken ? (
          <button
            type="button"
            onClick={handleResendToken}
            disabled={isLoading}
            className="text-sm text-accent hover:text-accent/80 font-medium transition-fast disabled:opacity-50"
          >
            Resend verification code
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Didn't receive the code? You can resend in {formatTime(tokenExpiry)}
          </p>
        )}
      </div>
    </form>
  );

  // Render password reset step
  const renderPasswordStep = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-5">
      {/* New Password Field */}
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-card-foreground mb-2">
          New Password
        </label>
        <div className="relative">
          <input
            type={showNewPassword ? 'text' : 'password'}
            id="newPassword"
            name="newPassword"
            value={passwordFormData.newPassword}
            onChange={handlePasswordInputChange}
            className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-fast ${
              errors.newPassword ? 'border-error focus:ring-error' : 'border-input focus:border-accent'
            }`}
            placeholder="Enter new password"
            autoComplete="new-password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-fast"
            disabled={isLoading}
            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
          >
            {showNewPassword ? (
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
        {errors.newPassword && (
          <p className="mt-1.5 text-sm text-error flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errors.newPassword}
          </p>
        )}

        {/* Password Strength Indicator */}
        {passwordFormData.newPassword && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Password Strength:</span>
              <span className={`text-xs font-medium ${passwordStrength.score >= 3 ? 'text-success' : passwordStrength.score >= 2 ? 'text-info' : 'text-warning'}`}>
                {passwordStrength.label}
              </span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-smooth ${
                    level <= passwordStrength.score ? passwordStrength.color : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-card-foreground mb-2"
        >
          Confirm Password
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            value={passwordFormData.confirmPassword}
            onChange={handlePasswordInputChange}
            className={`w-full px-4 py-3 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-fast ${
              errors.confirmPassword
                ? 'border-error focus:ring-error'
                : passwordFormData.confirmPassword && passwordFormData.newPassword === passwordFormData.confirmPassword
                ? 'border-success focus:ring-success' :'border-input focus:border-accent'
            }`}
            placeholder="Confirm new password"
            autoComplete="new-password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-fast"
            disabled={isLoading}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? (
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
        {errors.confirmPassword && (
          <p className="mt-1.5 text-sm text-error flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errors.confirmPassword}
          </p>
        )}
        {passwordFormData.confirmPassword &&
          passwordFormData.newPassword === passwordFormData.confirmPassword && (
            <p className="mt-1.5 text-sm text-success flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Passwords match
            </p>
          )}
      </div>

      {/* Security Requirements Checklist */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <p className="text-sm font-medium text-card-foreground mb-3">Password Requirements:</p>
        <div className="space-y-2">
          {[
            { label: 'At least 8 characters', met: passwordFormData.newPassword.length >= 8 },
            { label: 'One uppercase letter', met: /[A-Z]/.test(passwordFormData.newPassword) },
            { label: 'One lowercase letter', met: /[a-z]/.test(passwordFormData.newPassword) },
            { label: 'One number', met: /\d/.test(passwordFormData.newPassword) },
            {
              label: 'One special character',
              met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordFormData.newPassword),
            },
          ].map((requirement, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center transition-smooth ${
                  requirement.met ? 'bg-success' : 'bg-muted'
                }`}
              >
                {requirement.met && (
                  <svg className="w-3 h-3 text-success-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <span
                className={`text-xs ${
                  requirement.met ? 'text-success font-medium' : 'text-muted-foreground'
                }`}
              >
                {requirement.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-elevation-1"
      >
        {isLoading ? (
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
            <span>Resetting...</span>
          </>
        ) : (
          <>
            <span>Reset Password</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </>
        )}
      </button>
    </form>
  );

  // Render success step
  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 bg-success rounded-full shadow-elevation-2 animate-bounce-once">
        <svg
          className="w-12 h-12 text-success-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* Success Message */}
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold text-card-foreground">Password Reset Successful!</h3>
        <p className="text-muted-foreground">
          Your password has been successfully reset. You can now use your new password to sign in.
        </p>
      </div>

      {/* Security Notice */}
      <div className="p-4 bg-info/10 border border-info/20 rounded-lg text-left">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-info flex-shrink-0 mt-0.5"
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
          <div className="text-sm text-info">
            <p className="font-medium mb-1">Security Notification</p>
            <p>
              A password reset confirmation has been sent to your email. If you didn't request this
              change, please contact support immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Redirect Message */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
        <span>Redirecting to login in 3 seconds...</span>
      </div>

      {/* Manual Redirect Button */}
      <Link
        href="/admin-login"
        className="inline-flex items-center gap-2 py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-smooth shadow-elevation-1"
      >
        <span>Go to Login</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </Link>
    </div>
  );

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

      {/* Reset Card */}
      <div className="bg-card rounded-2xl shadow-elevation-3 p-8">
        {currentStep !== 'success' && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-card-foreground mb-2">
                {currentStep === 'email' ?'Reset Your Password'
                  : currentStep === 'token' ?'Verify Your Identity' :'Create New Password'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {currentStep === 'email' ?'Enter your email and security answer to receive a verification code'
                  : currentStep === 'token' ?'Enter the 6-digit code sent to your email' :'Choose a strong password for your account'}
              </p>
            </div>

            {/* Step Indicator */}
            {renderStepIndicator()}
          </>
        )}

        {/* General Error/Success Message */}
        {errors.general && (
          <div
            className={`mb-6 p-4 border rounded-lg flex items-start gap-3 ${
              errors.general.includes('sent')
                ? 'bg-success/10 border-success/20' :'bg-error/10 border-error/20'
            }`}
          >
            <svg
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                errors.general.includes('sent') ? 'text-success' : 'text-error'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {errors.general.includes('sent') ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <p
              className={`text-sm ${errors.general.includes('sent') ? 'text-success' : 'text-error'}`}
            >
              {errors.general}
            </p>
          </div>
        )}

        {/* Render Current Step */}
        {currentStep === 'email' && renderEmailStep()}
        {currentStep === 'token' && renderTokenStep()}
        {currentStep === 'password' && renderPasswordStep()}
        {currentStep === 'success' && renderSuccessStep()}

        {/* Back to Login Link (not shown on success) */}
        {currentStep !== 'success' && (
          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link
              href="/admin-login"
              className="text-sm text-accent hover:text-accent/80 font-medium transition-fast inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Login
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">© 2025 Amana Ride. All rights reserved.</p>
      </div>
    </div>
  );
}