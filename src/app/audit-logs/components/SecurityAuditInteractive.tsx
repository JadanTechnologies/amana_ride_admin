'use client';

import React, { useState, useEffect } from 'react';
import { accountSecurityService, type LoginAttempt, type SecurityAlert } from '@/services/accountSecurityService';
import { anomalyDetectionService, type AnomalyDetection, type ThreatIntelligence } from '@/services/anomalyDetectionService';
import { useAuth } from '@/contexts/AuthContext';

interface TimeframeOption {
  label: string;
  value: string;
  hours: number;
}

const TIMEFRAMES: TimeframeOption[] = [
  { label: 'Last Hour', value: 'hour', hours: 1 },
  { label: 'Last 24 Hours', value: 'day', hours: 24 },
  { label: 'Last 7 Days', value: 'week', hours: 168 },
  { label: 'Last 30 Days', value: 'month', hours: 720 },
];

export default function SecurityAuditInteractive() {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(TIMEFRAMES[1]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [detectedAnomalies, setDetectedAnomalies] = useState<AnomalyDetection[]>([]);
  const [threatIntelligence, setThreatIntelligence] = useState<Map<string, ThreatIntelligence>>(new Map());
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<{ type: string; message: string; timestamp: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'attempts' | 'alerts' | 'anomalies' | 'threat-intel'>('attempts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState<LoginAttempt['attempt_result'] | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<SecurityAlert['severity'] | 'all'>('all');

  useEffect(() => {
    loadSecurityData();
  }, [selectedTimeframe]);

  // Set up real-time monitoring
  useEffect(() => {
    if (!realtimeEnabled) return;

    const cleanup = anomalyDetectionService.subscribeToSecurityEvents({
      onLoginAttempt: (attempt) => {
        setRealtimeEvents(prev => [{
          type: 'login',
          message: `New login attempt: ${attempt.email} - ${attempt.attempt_result}`,
          timestamp: new Date().toISOString()
        }, ...prev].slice(0, 10));
        
        // Refresh data
        loadSecurityData();
      },
      onSecurityAlert: (alert) => {
        setRealtimeEvents(prev => [{
          type: 'alert',
          message: `Security alert: ${alert.title} (${alert.severity})`,
          timestamp: new Date().toISOString()
        }, ...prev].slice(0, 10));
        
        // Refresh data
        loadSecurityData();
      },
      onAnomaly: (anomaly) => {
        setRealtimeEvents(prev => [{
          type: 'anomaly',
          message: `Anomaly detected: ${anomaly.detectionType} for ${anomaly.email || 'unknown'}`,
          timestamp: new Date().toISOString()
        }, ...prev].slice(0, 10));
        
        // Add to detected anomalies
        setDetectedAnomalies(prev => [anomaly, ...prev]);
      }
    });

    return cleanup;
  }, [realtimeEnabled]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - selectedTimeframe.hours);

      // Load login attempts
      const { attempts, error: attemptsError } = await accountSecurityService.getRecentLoginAttempts('', 500);
      if (attemptsError) {
        throw new Error(attemptsError);
      }

      // Filter by timeframe
      const filteredAttempts = attempts.filter(
        (attempt) => new Date(attempt.attempted_at) >= cutoffDate
      );
      setLoginAttempts(filteredAttempts);

      // Load security alerts
      const { alerts, error: alertsError } = await accountSecurityService.getSecurityAlerts({ limit: 200 });
      if (alertsError) {
        throw new Error(alertsError);
      }

      const filteredAlerts = alerts.filter((alert) => new Date(alert.triggered_at) >= cutoffDate);
      setSecurityAlerts(filteredAlerts);

      // Load anomalies
      const timeWindowMinutes = Math.min(selectedTimeframe.hours * 60, 60); // Max 60 minutes for real-time detection
      const { anomalies: detectedAnomalies, error: anomalyError } = await anomalyDetectionService.getAnomaliesWithIntelligence(timeWindowMinutes);
      
      if (anomalyError) {
        console.error('Failed to load anomalies:', anomalyError);
      } else {
        setDetectedAnomalies(detectedAnomalies);
        
        // Build threat intelligence map
        const intelligenceMap = new Map<string, ThreatIntelligence>();
        detectedAnomalies.forEach(anomaly => {
          if (anomaly.email && anomaly.intelligence) {
            intelligenceMap.set(anomaly.email, anomaly.intelligence);
          }
        });
        setThreatIntelligence(intelligenceMap);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load security audit data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeColor = (result: LoginAttempt['attempt_result']) => {
    switch (result) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed_password':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'failed_mfa':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'account_locked':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'account_disabled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'role_restricted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityBadgeColor = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getThreatLevelColor = (level: ThreatIntelligence['threatLevel']) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getAnomalyTypeIcon = (type: AnomalyDetection['detectionType']) => {
    switch (type) {
      case 'rapid_attempts':
        return '⚡';
      case 'multiple_ips':
        return '🌐';
      case 'suspicious_location':
        return '📍';
      case 'unusual_timing':
        return '⏰';
      case 'device_hopping':
        return '📱';
      case 'credential_stuffing':
        return '🔓';
      default:
        return '⚠️';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const filteredLoginAttempts = loginAttempts
    .filter((attempt) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          attempt.email?.toLowerCase().includes(query) ||
          attempt.ip_address?.toString().includes(query) ||
          attempt.device_fingerprint?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter((attempt) => {
      if (filterResult === 'all') return true;
      return attempt.attempt_result === filterResult;
    });

  const filteredSecurityAlerts = securityAlerts
    .filter((alert) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          alert.email?.toLowerCase().includes(query) ||
          alert.title?.toLowerCase().includes(query) ||
          alert.description?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter((alert) => {
      if (filterSeverity === 'all') return true;
      return alert.severity === filterSeverity;
    });

  const stats = {
    totalAttempts: loginAttempts.length,
    successfulAttempts: loginAttempts.filter((a) => a.attempt_result === 'success').length,
    failedAttempts: loginAttempts.filter((a) => a.attempt_result !== 'success').length,
    mfaVerifications: loginAttempts.filter((a) => a.attempt_result === 'failed_mfa' || a.attempt_result === 'success').length,
    criticalAlerts: securityAlerts.filter((a) => a.severity === 'critical').length,
    openAlerts: securityAlerts.filter((a) => a.status === 'open').length,
    detectedAnomalies: detectedAnomalies.length,
    criticalAnomalies: detectedAnomalies.filter(a => a.severity === 'critical').length,
    highRiskAccounts: Array.from(threatIntelligence.values()).filter(t => t.threatLevel === 'critical' || t.threatLevel === 'high').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-muted-foreground">Loading security audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Audit & Forensics</h1>
          <p className="text-muted-foreground mt-1">
            Real-time anomaly detection and threat intelligence across admin login attempts
          </p>
        </div>
        
        {/* Timeframe Selector + Real-time Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth flex items-center gap-2 ${
              realtimeEnabled
                ? 'bg-green-600 text-white' :'bg-background text-foreground hover:bg-accent/10 border border-input'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${realtimeEnabled ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
            Real-time {realtimeEnabled ? 'ON' : 'OFF'}
          </button>
          
          {TIMEFRAMES.map((timeframe) => (
            <button
              key={timeframe.value}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
                selectedTimeframe.value === timeframe.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-accent/10 border border-input'
              }`}
            >
              {timeframe.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-error font-medium">Error loading audit data</p>
            <p className="text-sm text-error/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Real-time Events Feed */}
      {realtimeEnabled && realtimeEvents.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Security Events
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {realtimeEvents.map((event, idx) => (
              <div key={idx} className="text-xs text-muted-foreground flex items-start gap-2 border-l-2 border-accent/30 pl-2">
                <span className="text-accent font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  event.type === 'anomaly' ? 'bg-red-100 text-red-800' :
                  event.type === 'alert'? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {event.type.toUpperCase()}
                </span>
                <span>{event.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-9 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-muted-foreground">Total Attempts</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalAttempts}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-muted-foreground">Successful</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.successfulAttempts}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.failedAttempts}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-muted-foreground">MFA Events</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.mfaVerifications}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-muted-foreground">Critical Alerts</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.criticalAlerts}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm text-muted-foreground">Open Alerts</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.openAlerts}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔍</span>
            <p className="text-sm text-red-800 font-medium">Anomalies</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.detectedAnomalies}</p>
          {stats.criticalAnomalies > 0 && (
            <p className="text-xs text-red-600 mt-1">{stats.criticalAnomalies} critical</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎯</span>
            <p className="text-sm text-purple-800 font-medium">Threat Score</p>
          </div>
          <p className="text-2xl font-bold text-purple-700">
            {Array.from(threatIntelligence.values()).length > 0
              ? Math.round(Array.from(threatIntelligence.values()).reduce((sum, t) => sum + t.riskScore, 0) / threatIntelligence.size)
              : 0}
          </p>
          <p className="text-xs text-purple-600 mt-1">Avg risk score</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <p className="text-sm text-orange-800 font-medium">High Risk</p>
          </div>
          <p className="text-2xl font-bold text-orange-700">{stats.highRiskAccounts}</p>
          <p className="text-xs text-orange-600 mt-1">Accounts flagged</p>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setSelectedTab('attempts')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-smooth whitespace-nowrap ${
              selectedTab === 'attempts' ?'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Login Attempts
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
              {loginAttempts.length}
            </span>
          </button>
          <button
            onClick={() => setSelectedTab('alerts')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-smooth whitespace-nowrap ${
              selectedTab === 'alerts' ?'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Security Alerts
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">
              {securityAlerts.length}
            </span>
          </button>
          <button
            onClick={() => setSelectedTab('anomalies')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-smooth whitespace-nowrap ${
              selectedTab === 'anomalies' ?'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            🔍 Anomaly Detection
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
              {stats.detectedAnomalies}
            </span>
            {stats.criticalAnomalies > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 text-white animate-pulse">
                {stats.criticalAnomalies}
              </span>
            )}
          </button>
          <button
            onClick={() => setSelectedTab('threat-intel')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-smooth whitespace-nowrap ${
              selectedTab === 'threat-intel' ?'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            🎯 Threat Intelligence
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
              {threatIntelligence.size}
            </span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, IP address, or device fingerprint..."
              className="w-full px-4 py-2 pl-10 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {selectedTab === 'attempts' && (
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value as any)}
            className="px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Results</option>
            <option value="success">Success Only</option>
            <option value="failed_password">Failed Password</option>
            <option value="failed_mfa">Failed MFA</option>
            <option value="account_locked">Account Locked</option>
            <option value="role_restricted">Role Restricted</option>
          </select>
        )}

        {selectedTab === 'alerts' && (
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        )}

        <button
          onClick={loadSecurityData}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-smooth flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Content Panels */}
      {selectedTab === 'attempts' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Session ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLoginAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-12 h-12 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-muted-foreground">No login attempts found for the selected timeframe</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLoginAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-muted/30 transition-fast">
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {formatTimestamp(attempt.attempted_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          <span className="truncate max-w-xs">{attempt.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(attempt.attempt_result)}`}>
                          {attempt.attempt_result.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground font-mono">{attempt.ip_address || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <div className="truncate max-w-xs" title={attempt.device_fingerprint || 'N/A'}>
                          {attempt.device_fingerprint?.slice(0, 12) || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <div className="truncate max-w-xs" title={attempt.failure_reason || '-'}>
                          {attempt.failure_reason || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                        <div className="truncate max-w-xs" title={attempt.session_id || 'N/A'}>
                          {attempt.session_id?.slice(0, 8) || 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'alerts' && (
        <div className="space-y-4">
          {filteredSecurityAlerts.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-muted-foreground">No security alerts found for the selected timeframe</p>
            </div>
          ) : (
            filteredSecurityAlerts.map((alert) => (
              <div key={alert.id} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadgeColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-muted-foreground">{formatTimestamp(alert.triggered_at)}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{alert.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{alert.description}</p>
                    
                    {alert.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        <span>{alert.email}</span>
                      </div>
                    )}
                    
                    {alert.ip_address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span className="font-mono">{alert.ip_address}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.status === 'open' ? 'bg-red-100 text-red-800 border border-red-200' :
                      alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      alert.status === 'investigating'? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {alert.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Anomaly Detection Tab */}
      {selectedTab === 'anomalies' && (
        <div className="space-y-4">
          {detectedAnomalies.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-foreground font-medium mb-1">No Anomalies Detected</p>
              <p className="text-muted-foreground text-sm">All login patterns appear normal</p>
            </div>
          ) : (
            detectedAnomalies.map((anomaly) => (
              <div key={anomaly.id} className="bg-card rounded-xl border-2 border-border p-6 hover:border-red-300 transition-smooth">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{getAnomalyTypeIcon(anomaly.detectionType)}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {anomaly.detectionDetails.pattern}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            anomaly.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-300 animate-pulse' :
                            anomaly.severity === 'high' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                            anomaly.severity === 'medium'? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}>
                            {anomaly.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Detected at {formatTimestamp(anomaly.detectedAt)} • {anomaly.timeWindow} window
                        </p>
                      </div>
                    </div>

                    {/* Anomaly Details */}
                    <div className="bg-muted/30 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Threat Score</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  anomaly.threatScore >= 80 ? 'bg-red-600' :
                                  anomaly.threatScore >= 60 ? 'bg-orange-500' :
                                  anomaly.threatScore >= 40 ? 'bg-yellow-500': 'bg-blue-500'
                                }`}
                                style={{ width: `${anomaly.threatScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-foreground">{anomaly.threatScore}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Affected Attempts</p>
                          <p className="text-sm font-semibold text-foreground">{anomaly.affectedAttempts}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Threshold</p>
                          <p className="text-sm font-semibold text-foreground">{anomaly.detectionDetails.threshold}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Actual Value</p>
                          <p className="text-sm font-semibold text-red-600">{anomaly.detectionDetails.actualValue}</p>
                        </div>
                      </div>

                      {anomaly.email && (
                        <div className="flex items-center gap-2 text-sm text-foreground mb-2 pb-2 border-b border-border">
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          <span className="font-medium">{anomaly.email}</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground mb-1">Detection Indicators:</p>
                        {anomaly.detectionDetails.indicators.map((indicator, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="text-red-500">•</span>
                            <span>{indicator}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* IP Addresses */}
                    {anomaly.ipAddresses.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">IP Addresses:</span>
                        {anomaly.ipAddresses.map((ip, idx) => (
                          <span key={idx} className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            {ip}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Threat Intelligence Link */}
                    {anomaly.email && anomaly.intelligence && (
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-900">Threat Intelligence Available</p>
                            <p className="text-xs text-purple-700">
                              Risk Score: {anomaly.intelligence.riskScore} | 
                              Level: {anomaly.intelligence.threatLevel.toUpperCase()} | 
                              Recommendation: {anomaly.intelligence.recommendation.toUpperCase()}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedTab('threat-intel')}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-smooth"
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Threat Intelligence Tab */}
      {selectedTab === 'threat-intel' && (
        <div className="space-y-4">
          {threatIntelligence.size === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-foreground font-medium mb-1">No Threat Intelligence Data</p>
              <p className="text-muted-foreground text-sm">All monitored accounts appear safe</p>
            </div>
          ) : (
            Array.from(threatIntelligence.entries()).map(([email, intel]) => (
              <div key={email} className="bg-card rounded-xl border-2 border-border p-6 hover:border-purple-300 transition-smooth">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <h3 className="text-lg font-semibold text-foreground">{email}</h3>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${getThreatLevelColor(intel.threatLevel)}`}>
                        {intel.threatLevel.toUpperCase()}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 bg-blue-100 text-blue-800 border-blue-300">
                        {intel.recommendation.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Risk Score Gauge */}
                  <div className="text-center">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke={
                            intel.riskScore >= 80 ? '#dc2626' :
                            intel.riskScore >= 60 ? '#ea580c' :
                            intel.riskScore >= 40 ? '#eab308': '#3b82f6'
                          }
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(intel.riskScore / 100) * 251.2} 251.2`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">{intel.riskScore}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Risk Score</p>
                  </div>
                </div>

                {/* Threat Indicators */}
                <div className="bg-muted/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-foreground mb-3">Threat Indicators</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(intel.indicators).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${value ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="text-xs text-foreground">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity Stats */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Recent Activity ({intel.recentActivity.timeSpan})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Attempts</p>
                      <p className="text-lg font-bold text-foreground">{intel.recentActivity.totalAttempts}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Failed</p>
                      <p className="text-lg font-bold text-red-600">{intel.recentActivity.failedAttempts}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Unique IPs</p>
                      <p className="text-lg font-bold text-orange-600">{intel.recentActivity.uniqueIPs}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Devices</p>
                      <p className="text-lg font-bold text-purple-600">{intel.recentActivity.uniqueDevices}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}