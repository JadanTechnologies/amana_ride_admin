export type MFAMethod = 'totp' | 'email';
export type MFAStatus = 'pending' | 'enabled' | 'disabled' | 'suspended';

export interface UserMFASettings {
  id: string;
  userId: string;
  mfaEnabled: boolean;
  primaryMethod: MFAMethod | null;
  backupMethod: MFAMethod | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastVerifiedAt: string | null;
  verificationAttempts: number;
  lockedUntil: string | null;
  status: MFAStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MFAVerificationLog {
  id: string;
  userId: string;
  method: MFAMethod;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
  attemptedAt: string;
}

export interface MFAEnrollmentSession {
  id: string;
  userId: string;
  method: MFAMethod;
  tempSecret: string | null;
  qrCodeUri: string | null;
  verificationToken: string | null;
  expiresAt: string;
  completed: boolean;
  createdAt: string;
}

export interface MFAEnrollmentResponse {
  sessionId: string;
  qrCodeUri?: string;
  secret?: string;
  backupCodes?: string[];
  expiresAt: string;
}

export interface MFAVerificationRequest {
  userId: string;
  method: MFAMethod;
  code: string;
}

export interface MFAVerificationResponse {
  success: boolean;
  message: string;
  remainingAttempts?: number;
  lockedUntil?: string;
}