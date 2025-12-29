import { supabase } from '@/lib/supabase';
import type { LoginAttempt, SecurityAlert } from './accountSecurityService';

// Type definitions for anomaly detection
export interface AnomalyDetection {
  id: string;
  detectionType: 'rapid_attempts' | 'multiple_ips' | 'suspicious_location' | 'unusual_timing' | 'device_hopping' | 'credential_stuffing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  threatScore: number; // 0-100
  email?: string;
  ipAddresses: string[];
  detectedAt: string;
  timeWindow: string;
  affectedAttempts: number;
  detectionDetails: {
    pattern: string;
    threshold: number;
    actualValue: number;
    indicators: string[];
  };
}

export interface ThreatIntelligence {
  email: string;
  riskScore: number; // 0-100
  threatLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  indicators: {
    rapidAttempts: boolean;
    multipleIPs: boolean;
    suspiciousLocations: boolean;
    deviceHopping: boolean;
    unusualTiming: boolean;
    knownBadActor: boolean;
  };
  recentActivity: {
    totalAttempts: number;
    failedAttempts: number;
    uniqueIPs: number;
    uniqueDevices: number;
    timeSpan: string;
  };
  recommendation: 'monitor' | 'flag' | 'lockout' | 'block';
}

export interface RealtimeSubscriptionOptions {
  onLoginAttempt?: (attempt: LoginAttempt) => void;
  onSecurityAlert?: (alert: SecurityAlert) => void;
  onAnomaly?: (anomaly: AnomalyDetection) => void;
}

class AnomalyDetectionService {
  private realtimeChannel: any = null;

  /**
   * Analyze login attempts for anomalies in real-time
   */
  async detectAnomalies(timeWindowMinutes: number = 15): Promise<{ anomalies: AnomalyDetection[]; error?: string }> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - timeWindowMinutes);

      const { data: attempts, error } = await supabase
        .from('login_attempts')
        .select('*')
        .gte('attempted_at', cutoffTime.toISOString())
        .order('attempted_at', { ascending: false });

      if (error) {
        return { anomalies: [], error: error.message };
      }

      const anomalies: AnomalyDetection[] = [];

      // Group attempts by email
      const attemptsByEmail = this.groupByEmail(attempts || []);

      for (const [email, emailAttempts] of Object.entries(attemptsByEmail)) {
        // Detect rapid login attempts
        const rapidAttemptAnomaly = this.detectRapidAttempts(email, emailAttempts, timeWindowMinutes);
        if (rapidAttemptAnomaly) anomalies.push(rapidAttemptAnomaly);

        // Detect multiple IP addresses
        const multipleIPAnomaly = this.detectMultipleIPs(email, emailAttempts);
        if (multipleIPAnomaly) anomalies.push(multipleIPAnomaly);

        // Detect suspicious location changes
        const locationAnomaly = this.detectSuspiciousLocations(email, emailAttempts);
        if (locationAnomaly) anomalies.push(locationAnomaly);

        // Detect unusual timing patterns
        const timingAnomaly = this.detectUnusualTiming(email, emailAttempts);
        if (timingAnomaly) anomalies.push(timingAnomaly);

        // Detect device hopping
        const deviceAnomaly = this.detectDeviceHopping(email, emailAttempts);
        if (deviceAnomaly) anomalies.push(deviceAnomaly);

        // Detect potential credential stuffing
        const credentialStuffingAnomaly = this.detectCredentialStuffing(email, emailAttempts);
        if (credentialStuffingAnomaly) anomalies.push(credentialStuffingAnomaly);
      }

      return { anomalies };
    } catch (error: any) {
      return { anomalies: [], error: error?.message || 'Failed to detect anomalies' };
    }
  }

  /**
   * Calculate threat intelligence score for an email
   */
  async calculateThreatIntelligence(email: string): Promise<{ intelligence: ThreatIntelligence | null; error?: string }> {
    try {
      // Get recent attempts (last 24 hours)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24);

      const { data: attempts, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .gte('attempted_at', cutoffTime.toISOString())
        .order('attempted_at', { ascending: false });

      if (error) {
        return { intelligence: null, error: error.message };
      }

      if (!attempts || attempts.length === 0) {
        return {
          intelligence: {
            email,
            riskScore: 0,
            threatLevel: 'safe',
            indicators: {
              rapidAttempts: false,
              multipleIPs: false,
              suspiciousLocations: false,
              deviceHopping: false,
              unusualTiming: false,
              knownBadActor: false,
            },
            recentActivity: {
              totalAttempts: 0,
              failedAttempts: 0,
              uniqueIPs: 0,
              uniqueDevices: 0,
              timeSpan: '24h',
            },
            recommendation: 'monitor',
          },
        };
      }

      // Calculate indicators
      const indicators = {
        rapidAttempts: this.hasRapidAttempts(attempts),
        multipleIPs: this.hasMultipleIPs(attempts),
        suspiciousLocations: this.hasSuspiciousLocations(attempts),
        deviceHopping: this.hasDeviceHopping(attempts),
        unusualTiming: this.hasUnusualTiming(attempts),
        knownBadActor: await this.isKnownBadActor(email),
      };

      // Calculate recent activity stats
      const failedAttempts = attempts.filter(a => a.attempt_result !== 'success').length;
      const uniqueIPs = new Set(attempts.map(a => a.ip_address).filter(Boolean)).size;
      const uniqueDevices = new Set(attempts.map(a => a.device_fingerprint).filter(Boolean)).size;

      const recentActivity = {
        totalAttempts: attempts.length,
        failedAttempts,
        uniqueIPs,
        uniqueDevices,
        timeSpan: '24h',
      };

      // Calculate risk score (0-100)
      let riskScore = 0;
      if (indicators.rapidAttempts) riskScore += 20;
      if (indicators.multipleIPs) riskScore += 15;
      if (indicators.suspiciousLocations) riskScore += 15;
      if (indicators.deviceHopping) riskScore += 10;
      if (indicators.unusualTiming) riskScore += 10;
      if (indicators.knownBadActor) riskScore += 30;

      // Adjust based on failure rate
      const failureRate = failedAttempts / attempts.length;
      riskScore += Math.floor(failureRate * 20);

      riskScore = Math.min(100, riskScore);

      // Determine threat level
      let threatLevel: ThreatIntelligence['threatLevel'] = 'safe';
      if (riskScore >= 80) threatLevel = 'critical';
      else if (riskScore >= 60) threatLevel = 'high';
      else if (riskScore >= 40) threatLevel = 'medium';
      else if (riskScore >= 20) threatLevel = 'low';

      // Determine recommendation
      let recommendation: ThreatIntelligence['recommendation'] = 'monitor';
      if (riskScore >= 80) recommendation = 'block';
      else if (riskScore >= 60) recommendation = 'lockout';
      else if (riskScore >= 40) recommendation = 'flag';

      return {
        intelligence: {
          email,
          riskScore,
          threatLevel,
          indicators,
          recentActivity,
          recommendation,
        },
      };
    } catch (error: any) {
      return { intelligence: null, error: error?.message || 'Failed to calculate threat intelligence' };
    }
  }

  /**
   * Set up real-time monitoring for security events
   */
  subscribeToSecurityEvents(options: RealtimeSubscriptionOptions): () => void {
    // Clean up existing subscription
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    // Create new channel
    this.realtimeChannel = supabase.channel('security-monitoring');

    // Subscribe to login attempts
    if (options.onLoginAttempt) {
      this.realtimeChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'login_attempts',
        },
        (payload: any) => {
          options.onLoginAttempt?.(payload.new as LoginAttempt);
          
          // Auto-detect anomalies on new attempts
          if (options.onAnomaly) {
            this.detectAnomalies(5).then(({ anomalies }) => {
              anomalies.forEach(anomaly => options.onAnomaly?.(anomaly));
            });
          }
        }
      );
    }

    // Subscribe to security alerts
    if (options.onSecurityAlert) {
      this.realtimeChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_alerts',
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            options.onSecurityAlert?.(payload.new as SecurityAlert);
          }
        }
      );
    }

    // Subscribe to the channel
    this.realtimeChannel.subscribe();

    // Return cleanup function
    return () => {
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
    };
  }

  // Private helper methods for anomaly detection

  private groupByEmail(attempts: LoginAttempt[]): Record<string, LoginAttempt[]> {
    return attempts.reduce((acc, attempt) => {
      if (!acc[attempt.email]) {
        acc[attempt.email] = [];
      }
      acc[attempt.email].push(attempt);
      return acc;
    }, {} as Record<string, LoginAttempt[]>);
  }

  private detectRapidAttempts(email: string, attempts: LoginAttempt[], windowMinutes: number): AnomalyDetection | null {
    const THRESHOLD = 10; // More than 10 attempts in the time window
    
    if (attempts.length > THRESHOLD) {
      const ipAddresses = [...new Set(attempts.map(a => a.ip_address).filter(Boolean))] as string[];
      const threatScore = Math.min(100, Math.floor((attempts.length / THRESHOLD) * 50));

      return {
        id: `rapid-${email}-${Date.now()}`,
        detectionType: 'rapid_attempts',
        severity: attempts.length > THRESHOLD * 2 ? 'critical' : 'high',
        threatScore,
        email,
        ipAddresses,
        detectedAt: new Date().toISOString(),
        timeWindow: `${windowMinutes}m`,
        affectedAttempts: attempts.length,
        detectionDetails: {
          pattern: 'Excessive login attempts in short time period',
          threshold: THRESHOLD,
          actualValue: attempts.length,
          indicators: [`${attempts.length} attempts in ${windowMinutes} minutes`],
        },
      };
    }

    return null;
  }

  private detectMultipleIPs(email: string, attempts: LoginAttempt[]): AnomalyDetection | null {
    const THRESHOLD = 3;
    const ipAddresses = [...new Set(attempts.map(a => a.ip_address).filter(Boolean))] as string[];

    if (ipAddresses.length >= THRESHOLD) {
      const threatScore = Math.min(100, Math.floor((ipAddresses.length / THRESHOLD) * 40));

      return {
        id: `multi-ip-${email}-${Date.now()}`,
        detectionType: 'multiple_ips',
        severity: ipAddresses.length > THRESHOLD * 2 ? 'high' : 'medium',
        threatScore,
        email,
        ipAddresses,
        detectedAt: new Date().toISOString(),
        timeWindow: '15m',
        affectedAttempts: attempts.length,
        detectionDetails: {
          pattern: 'Login attempts from multiple IP addresses',
          threshold: THRESHOLD,
          actualValue: ipAddresses.length,
          indicators: ipAddresses.map(ip => `Attempt from ${ip}`),
        },
      };
    }

    return null;
  }

  private detectSuspiciousLocations(email: string, attempts: LoginAttempt[]): AnomalyDetection | null {
    // Check for geographically impossible travel
    const attemptsWithLocation = attempts.filter(a => a.location_data);
    
    if (attemptsWithLocation.length < 2) return null;

    // Sort by time
    attemptsWithLocation.sort((a, b) => 
      new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime()
    );

    // Check consecutive attempts for impossible travel
    for (let i = 1; i < attemptsWithLocation.length; i++) {
      const prev = attemptsWithLocation[i - 1];
      const curr = attemptsWithLocation[i];

      const timeDiff = Math.abs(
        new Date(curr.attempted_at).getTime() - new Date(prev.attempted_at).getTime()
      ) / 1000 / 60; // minutes

      // If attempts are within 30 minutes but from different countries/cities
      if (timeDiff < 30) {
        const prevCountry = prev.location_data?.country;
        const currCountry = curr.location_data?.country;

        if (prevCountry && currCountry && prevCountry !== currCountry) {
          return {
            id: `suspicious-location-${email}-${Date.now()}`,
            detectionType: 'suspicious_location',
            severity: 'high',
            threatScore: 75,
            email,
            ipAddresses: [prev.ip_address, curr.ip_address].filter(Boolean) as string[],
            detectedAt: new Date().toISOString(),
            timeWindow: '30m',
            affectedAttempts: 2,
            detectionDetails: {
              pattern: 'Geographically impossible travel detected',
              threshold: 30,
              actualValue: timeDiff,
              indicators: [
                `${prevCountry} to ${currCountry} in ${Math.round(timeDiff)} minutes`,
                'Possible account compromise or VPN usage',
              ],
            },
          };
        }
      }
    }

    return null;
  }

  private detectUnusualTiming(email: string, attempts: LoginAttempt[]): AnomalyDetection | null {
    // Detect attempts during unusual hours (2 AM - 5 AM local time)
    const unusualHourAttempts = attempts.filter(a => {
      const hour = new Date(a.attempted_at).getHours();
      return hour >= 2 && hour <= 5;
    });

    if (unusualHourAttempts.length >= 3) {
      return {
        id: `unusual-timing-${email}-${Date.now()}`,
        detectionType: 'unusual_timing',
        severity: 'medium',
        threatScore: 40,
        email,
        ipAddresses: [...new Set(unusualHourAttempts.map(a => a.ip_address).filter(Boolean))] as string[],
        detectedAt: new Date().toISOString(),
        timeWindow: '24h',
        affectedAttempts: unusualHourAttempts.length,
        detectionDetails: {
          pattern: 'Login attempts during unusual hours',
          threshold: 3,
          actualValue: unusualHourAttempts.length,
          indicators: unusualHourAttempts.map(a => 
            `Attempt at ${new Date(a.attempted_at).toLocaleTimeString()}`
          ),
        },
      };
    }

    return null;
  }

  private detectDeviceHopping(email: string, attempts: LoginAttempt[]): AnomalyDetection | null {
    const THRESHOLD = 4;
    const devices = [...new Set(attempts.map(a => a.device_fingerprint).filter(Boolean))];

    if (devices.length >= THRESHOLD) {
      return {
        id: `device-hopping-${email}-${Date.now()}`,
        detectionType: 'device_hopping',
        severity: 'medium',
        threatScore: 50,
        email,
        ipAddresses: [...new Set(attempts.map(a => a.ip_address).filter(Boolean))] as string[],
        detectedAt: new Date().toISOString(),
        timeWindow: '15m',
        affectedAttempts: attempts.length,
        detectionDetails: {
          pattern: 'Multiple devices used for login attempts',
          threshold: THRESHOLD,
          actualValue: devices.length,
          indicators: [`${devices.length} different devices detected`],
        },
      };
    }

    return null;
  }

  private detectCredentialStuffing(email: string, attempts: LoginAttempt[]): AnomalyDetection | null {
    // Detect pattern: multiple failed attempts with different failure reasons from same IP
    const failedAttempts = attempts.filter(a => a.attempt_result !== 'success');
    const ipGroups = this.groupBy(failedAttempts, 'ip_address');

    for (const [ip, ipAttempts] of Object.entries(ipGroups)) {
      if (ipAttempts.length >= 5) {
        const uniqueReasons = new Set(ipAttempts.map(a => a.failure_reason).filter(Boolean));
        
        if (uniqueReasons.size >= 2) {
          return {
            id: `credential-stuffing-${email}-${Date.now()}`,
            detectionType: 'credential_stuffing',
            severity: 'critical',
            threatScore: 90,
            email,
            ipAddresses: [ip].filter(Boolean),
            detectedAt: new Date().toISOString(),
            timeWindow: '15m',
            affectedAttempts: ipAttempts.length,
            detectionDetails: {
              pattern: 'Potential credential stuffing attack',
              threshold: 5,
              actualValue: ipAttempts.length,
              indicators: [
                `${ipAttempts.length} failed attempts from single IP`,
                `${uniqueReasons.size} different failure patterns`,
                'Automated attack likely',
              ],
            },
          };
        }
      }
    }

    return null;
  }

  // Helper methods for threat intelligence

  private hasRapidAttempts(attempts: LoginAttempt[]): boolean {
    return attempts.length > 10;
  }

  private hasMultipleIPs(attempts: LoginAttempt[]): boolean {
    const ips = new Set(attempts.map(a => a.ip_address).filter(Boolean));
    return ips.size >= 3;
  }

  private hasSuspiciousLocations(attempts: LoginAttempt[]): boolean {
    const locations = attempts
      .filter(a => a.location_data?.country)
      .map(a => a.location_data?.country);
    
    const uniqueCountries = new Set(locations);
    return uniqueCountries.size >= 2;
  }

  private hasDeviceHopping(attempts: LoginAttempt[]): boolean {
    const devices = new Set(attempts.map(a => a.device_fingerprint).filter(Boolean));
    return devices.size >= 4;
  }

  private hasUnusualTiming(attempts: LoginAttempt[]): boolean {
    const unusualHours = attempts.filter(a => {
      const hour = new Date(a.attempted_at).getHours();
      return hour >= 2 && hour <= 5;
    });

    return unusualHours.length >= 3;
  }

  private async isKnownBadActor(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('id')
        .eq('email', email)
        .eq('severity', 'critical')
        .eq('status', 'open')
        .limit(1);

      return !error && (data?.length || 0) > 0;
    } catch {
      return false;
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((acc, item) => {
      const groupKey = String(item[key] || 'unknown');
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }

  /**
   * Get all detected anomalies with threat intelligence
   */
  async getAnomaliesWithIntelligence(timeWindowMinutes: number = 15): Promise<{
    anomalies: (AnomalyDetection & { intelligence?: ThreatIntelligence })[];
    error?: string;
  }> {
    const { anomalies, error } = await this.detectAnomalies(timeWindowMinutes);

    if (error) {
      return { anomalies: [], error };
    }

    // Enhance anomalies with threat intelligence
    const enhancedAnomalies = await Promise.all(
      anomalies.map(async (anomaly) => {
        if (anomaly.email) {
          const { intelligence } = await this.calculateThreatIntelligence(anomaly.email);
          return { ...anomaly, intelligence: intelligence || undefined };
        }
        return anomaly;
      })
    );

    return { anomalies: enhancedAnomalies };
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();