import { supabase } from '@/lib/supabase';
import {
  UserMFASettings,
  MFAMethod,
  MFAEnrollmentResponse,
  MFAVerificationRequest,
  MFAVerificationResponse,
  MFAVerificationLog
} from '@/types/mfa.types';

/**
 * Service for managing Multi-Factor Authentication operations
 */
export const mfaService = {
  /**
   * Get MFA settings for current user
   */
  async getUserMFASettings(userId: string): Promise<{ data: UserMFASettings | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('user_mfa_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (!data) {
        return { data: null, error: null };
      }

      // Convert snake_case to camelCase
      const settings: UserMFASettings = {
        id: data.id,
        userId: data.user_id,
        mfaEnabled: data.mfa_enabled,
        primaryMethod: data.primary_method,
        backupMethod: data.backup_method,
        emailVerified: data.email_verified,
        phoneVerified: data.phone_verified,
        lastVerifiedAt: data.last_verified_at,
        verificationAttempts: data.verification_attempts,
        lockedUntil: data.locked_until,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      return { data: settings, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Check if user has MFA enabled
   */
  async hasMFAEnabled(userId: string): Promise<{ data: boolean; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('user_has_mfa_enabled', {
        user_uuid: userId
      });

      if (error) throw error;

      return { data: data || false, error: null };
    } catch (error) {
      return { data: false, error: error as Error };
    }
  },

  /**
   * Initiate MFA enrollment for TOTP (authenticator app)
   */
  async enrollTOTP(userId: string): Promise<{ data: MFAEnrollmentResponse | null; error: Error | null }> {
    try {
      // Call Supabase MFA enrollment API
      const { data: { id: factorId, totp }, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      if (!totp) {
        throw new Error('Failed to generate TOTP secret');
      }

      // Store enrollment session in database
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minute expiry

      const { error: sessionError } = await supabase
        .from('mfa_enrollment_sessions')
        .insert({
          user_id: userId,
          method: 'totp' as MFAMethod,
          temp_secret: totp.secret,
          qr_code_uri: totp.qr_code,
          expires_at: expiresAt.toISOString()
        });

      if (sessionError) throw sessionError;

      return {
        data: {
          sessionId: factorId,
          qrCodeUri: totp.qr_code,
          secret: totp.secret,
          expiresAt: expiresAt.toISOString()
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Verify TOTP code during enrollment
   */
  async verifyTOTPEnrollment(
    factorId: string,
    code: string
  ): Promise<{ data: { success: boolean; backupCodes?: string[] }; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) throw error;

      // Update user MFA settings
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: settingsError } = await supabase
        .from('user_mfa_settings')
        .upsert({
          user_id: user.id,
          mfa_enabled: true,
          primary_method: 'totp' as MFAMethod,
          status: 'enabled',
          email_verified: true,
          last_verified_at: new Date().toISOString()
        });

      if (settingsError) throw settingsError;

      // Mark enrollment session as completed
      await supabase
        .from('mfa_enrollment_sessions')
        .update({ completed: true })
        .eq('user_id', user.id)
        .eq('method', 'totp');

      return {
        data: {
          success: true,
          backupCodes: data.totp?.recovery_codes || []
        },
        error: null
      };
    } catch (error) {
      return {
        data: { success: false },
        error: error as Error
      };
    }
  },

  /**
   * Verify MFA code during login
   */
  async verifyMFACode(request: MFAVerificationRequest): Promise<MFAVerificationResponse> {
    try {
      // Get user's MFA factors
      const { data: { factors } } = await supabase.auth.mfa.listFactors();
      
      if (!factors || factors.length === 0) {
        throw new Error('No MFA factors enrolled');
      }

      const totpFactor = factors.find(f => f.factor_type === 'totp');
      
      if (!totpFactor) {
        throw new Error('TOTP factor not found');
      }

      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: request.code,
      });

      if (verifyError) throw verifyError;

      // Log successful verification
      await this.logVerificationAttempt(
        request.userId,
        request.method,
        true,
        null
      );

      return {
        success: true,
        message: 'MFA verification successful'
      };
    } catch (error: any) {
      // Log failed verification
      await this.logVerificationAttempt(
        request.userId,
        request.method,
        false,
        error?.message || 'Invalid verification code'
      );

      // Check if account is locked
      const { data: settings } = await this.getUserMFASettings(request.userId);
      
      if (settings?.lockedUntil && new Date(settings.lockedUntil) > new Date()) {
        return {
          success: false,
          message: 'Account temporarily locked due to multiple failed attempts',
          lockedUntil: settings.lockedUntil
        };
      }

      const remainingAttempts = settings ? Math.max(0, 5 - settings.verificationAttempts) : 5;

      return {
        success: false,
        message: 'Invalid verification code',
        remainingAttempts
      };
    }
  },

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<{ error: Error | null }> {
    try {
      // Unenroll all MFA factors
      const { data: { factors } } = await supabase.auth.mfa.listFactors();
      
      for (const factor of factors || []) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      // Update database settings
      const { error } = await supabase
        .from('user_mfa_settings')
        .update({
          mfa_enabled: false,
          status: 'disabled',
          primary_method: null,
          backup_method: null
        })
        .eq('user_id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  /**
   * Get verification logs for user
   */
  async getVerificationLogs(
    userId: string,
    limit: number = 10
  ): Promise<{ data: MFAVerificationLog[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('mfa_verification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('attempted_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Convert snake_case to camelCase
      const logs: MFAVerificationLog[] = (data || []).map(log => ({
        id: log.id,
        userId: log.user_id,
        method: log.method,
        success: log.success,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        failureReason: log.failure_reason,
        attemptedAt: log.attempted_at
      }));

      return { data: logs, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Log verification attempt
   */
  async logVerificationAttempt(
    userId: string,
    method: MFAMethod,
    success: boolean,
    failureReason: string | null
  ): Promise<void> {
    try {
      // Get client IP and user agent (in production, these would come from request headers)
      await supabase.rpc('log_mfa_verification', {
        p_user_id: userId,
        p_method: method,
        p_success: success,
        p_ip_address: null, // Would be populated from request in production
        p_user_agent: navigator?.userAgent || null,
        p_failure_reason: failureReason
      });
    } catch (error) {
      console.error('Failed to log MFA verification attempt:', error);
    }
  }
};