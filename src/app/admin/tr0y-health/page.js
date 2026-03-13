'use client';

import { useState, useEffect } from 'react';

export default function AdminHealthDashboard() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [health, setHealth] = useState(null);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ─── Authenticate and fetch data ───
  const authenticate = async () => {
    if (!secret.trim()) { setError('Enter your admin secret.'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/health', {
        headers: { 'x-admin-secret': secret.trim() },
      });
      const data = await res.json();

      if (data.services) {
        setHealth(data);
        setAuthenticated(true);
        setLastRefresh(new Date());
        // Set admin cookie so other admin pages (/admin/feedback, /admin/health) work too
        document.cookie = `admin_authenticated=${encodeURIComponent(secret.trim())}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        // Also fetch security logs
        fetchSecurityLogs(secret.trim());
      } else {
        setError('Invalid admin secret.');
      }
    } catch (err) {
      setError('Connection failed. Try again.');
    }
    setLoading(false);
  };

  const fetchSecurityLogs = async (s) => {
    try {
      const res = await fetch('/api/admin/security-log?limit=20', {
        headers: { 'x-admin-secret': s || secret },
      });
      const data = await res.json();
      if (data.events) setSecurityLogs(data.events);
    } catch {}
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await fetch(`/api/admin/analytics?type=export&from=${from}&to=${to}`, {
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      if (data.aggregate) setAnalytics(data);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    }
    setAnalyticsLoading(false);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health', {
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      if (data.services) {
        setHealth(data);
        setLastRefresh(new Date());
      }
      fetchSecurityLogs();
    } catch {}
    setLoading(false);
  };

  const lookupEvent = async () => {
    if (!lookupCode.trim()) return;
    try {
      const res = await fetch(`/api/admin/security-log?code=${encodeURIComponent(lookupCode.trim())}`, {
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      setLookupResult(data.event || data);
    } catch {
      setLookupResult({ error: 'Lookup failed' });
    }
  };

  // ─── Password Gate ───
  if (!authenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.gateCard}>
          <div style={styles.gateLock}>🔒</div>
          <h1 style={styles.gateTitle}>Admin Access</h1>
          <p style={styles.gateSubtitle}>This page is restricted. Enter your admin credentials.</p>
          {error && <div style={styles.errorBox}>{error}</div>}
          <input
            type="password"
            value={secret}
            onChange={e => { setSecret(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') authenticate(); }}
            placeholder="Admin Secret"
            style={styles.gateInput}
            autoFocus
          />
          <button
            onClick={authenticate}
            disabled={loading}
            style={{ ...styles.gateButton, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Helper Components ───
  const StatusDot = ({ status }) => {
    const colors = {
      connected: '#10B981', configured: '#10B981', ok: '#10B981',
      degraded: '#F59E0B', not_configured: '#F59E0B',
      error: '#EF4444', disconnected: '#EF4444',
    };
    return (
      <span style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: colors[status] || '#9CA3AF',
        marginRight: '8px',
        boxShadow: `0 0 6px ${colors[status] || '#9CA3AF'}60`,
      }} />
    );
  };

  const SeverityBadge = ({ severity }) => {
    const colors = { info: '#3B82F6', warning: '#F59E0B', critical: '#EF4444' };
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: '600',
        color: 'white',
        background: colors[severity] || '#9CA3AF',
      }}>
        {severity?.toUpperCase()}
      </span>
    );
  };

  // ─── Dashboard ───
  return (
    <div style={styles.dashContainer}>
      {/* Header */}
      <div style={styles.dashHeader}>
        <div>
          <h1 style={styles.dashTitle}>System Health Dashboard</h1>
          <p style={styles.dashSubtitle}>
            CMU AI Calendar — Admin Panel
            {lastRefresh && <span style={{ marginLeft: '12px', color: '#6B7280' }}>Last refresh: {lastRefresh.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button onClick={refreshData} disabled={loading} style={styles.refreshButton}>
          {loading ? '↻ Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Overall Status Banner */}
      <div style={{
        ...styles.statusBanner,
        background: health?.status === 'ok' ? '#10B981' : health?.status === 'degraded' ? '#F59E0B' : '#EF4444',
      }}>
        <span style={styles.statusBannerText}>
          System Status: {health?.status?.toUpperCase() || 'UNKNOWN'}
        </span>
        <span style={styles.statusBannerDetail}>
          Uptime: {health?.uptime || '—'} | Region: {health?.region || '—'} | Env: {health?.environment || '—'}
        </span>
      </div>

      {/* Service Cards */}
      <div style={styles.cardGrid}>
        {/* Database */}
        <div style={styles.serviceCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🗄️</span>
            <h3 style={styles.cardTitle}>Database</h3>
            <StatusDot status={health?.services?.database?.status} />
          </div>
          <div style={styles.cardBody}>
            <div style={styles.cardRow}><span>Status</span><span style={styles.cardValue}>{health?.services?.database?.status}</span></div>
            <div style={styles.cardRow}><span>Type</span><span style={styles.cardValue}>{health?.services?.database?.type}</span></div>
            <div style={styles.cardRow}><span>Latency</span><span style={styles.cardValue}>{health?.services?.database?.latencyMs}ms</span></div>
          </div>
        </div>

        {/* AI Service */}
        <div style={styles.serviceCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🤖</span>
            <h3 style={styles.cardTitle}>AI Service</h3>
            <StatusDot status={health?.services?.ai?.status} />
          </div>
          <div style={styles.cardBody}>
            <div style={styles.cardRow}><span>Status</span><span style={styles.cardValue}>{health?.services?.ai?.status}</span></div>
            <div style={styles.cardRow}><span>Provider</span><span style={styles.cardValue}>{health?.services?.ai?.provider || '—'}</span></div>
            <div style={styles.cardRow}><span>Latency</span><span style={styles.cardValue}>{health?.services?.ai?.latencyMs ? health.services.ai.latencyMs + 'ms' : '—'}</span></div>
            <div style={styles.cardRow}><span>Key</span><span style={styles.cardValue}>{health?.services?.ai?.keyPrefix || '—'}</span></div>
          </div>
        </div>

        {/* Email Service */}
        <div style={styles.serviceCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>📧</span>
            <h3 style={styles.cardTitle}>Email Service</h3>
            <StatusDot status={health?.services?.email?.status} />
          </div>
          <div style={styles.cardBody}>
            <div style={styles.cardRow}><span>Status</span><span style={styles.cardValue}>{health?.services?.email?.status}</span></div>
            <div style={styles.cardRow}><span>Provider</span><span style={styles.cardValue}>{health?.services?.email?.provider}</span></div>
            <div style={styles.cardRow}><span>Admin</span><span style={styles.cardValue}>{health?.services?.email?.adminEmail}</span></div>
          </div>
        </div>

        {/* Runtime */}
        <div style={styles.serviceCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>⚙️</span>
            <h3 style={styles.cardTitle}>Runtime</h3>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.cardRow}><span>Node</span><span style={styles.cardValue}>{health?.runtime?.nodeVersion}</span></div>
            <div style={styles.cardRow}><span>Memory</span><span style={styles.cardValue}>{health?.runtime?.memoryUsageMB}MB / {health?.runtime?.memoryTotalMB}MB</span></div>
            <div style={styles.cardRow}><span>Commit</span><span style={styles.cardValue}>{health?.deployment?.commitSha}</span></div>
            <div style={styles.cardRow}><span>Branch</span><span style={styles.cardValue}>{health?.deployment?.branch}</span></div>
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Environment Variables</h2>
        <div style={styles.envGrid}>
          {health?.envVars?.required && Object.entries(health.envVars.required).map(([key, present]) => (
            <div key={key} style={styles.envItem}>
              <StatusDot status={present ? 'ok' : 'error'} />
              <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>{key}</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: present ? '#10B981' : '#EF4444' }}>
                {present ? 'Set' : 'MISSING'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Log Lookup */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Security Event Lookup</h2>
        <div style={styles.lookupRow}>
          <input
            type="text"
            value={lookupCode}
            onChange={e => setLookupCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') lookupEvent(); }}
            placeholder="Paste error code (SEC-XXXX-XXXX-XXXX)"
            style={styles.lookupInput}
          />
          <button onClick={lookupEvent} style={styles.lookupButton}>Look Up</button>
        </div>
        {lookupResult && (
          <pre style={styles.lookupResult}>
            {JSON.stringify(lookupResult, null, 2)}
          </pre>
        )}
      </div>

      {/* Recent Security Events */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Security Events ({securityLogs.length})</h2>
        <div style={styles.logTable}>
          {securityLogs.length === 0 && <p style={{ color: '#9CA3AF', padding: '16px' }}>No events recorded yet.</p>}
          {securityLogs.map((log, i) => (
            <div key={i} style={styles.logRow}>
              <div style={styles.logRowTop}>
                <SeverityBadge severity={log.severity} />
                <span style={styles.logEvent}>{log.event}</span>
                <code style={styles.logCode}>{log.errorCode}</code>
              </div>
              <div style={styles.logRowBottom}>
                <span>{log.details}</span>
                <span style={styles.logTime}>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
              <div style={styles.logRowMeta}>
                IP: {log.ip} | UA: {(log.userAgent || '').slice(0, 60)}...
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Section */}
      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={styles.sectionTitle}>Analytics (Last 7 Days)</h2>
          <button onClick={fetchAnalytics} disabled={analyticsLoading} style={styles.lookupButton}>
            {analyticsLoading ? 'Loading...' : analytics ? '↻ Refresh' : 'Load Analytics'}
          </button>
        </div>

        {analytics && analytics.aggregate && (
          <>
            {/* Top-level stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Total Requests', value: analytics.aggregate.totalRequests },
                { label: 'Unique Users', value: analytics.aggregate.totalUniqueUsers },
                { label: 'AI Cost (USD)', value: '$' + (analytics.aggregate.totalEstimatedCostUSD || 0).toFixed(4) },
                { label: 'Input Tokens', value: (analytics.aggregate.totalInputTokens || 0).toLocaleString() },
                { label: 'Output Tokens', value: (analytics.aggregate.totalOutputTokens || 0).toLocaleString() },
                { label: 'Avg Response', value: (analytics.aggregate.avgResponseTimeMs || 0) + 'ms' },
                { label: 'Errors', value: analytics.aggregate.totalErrors },
                { label: 'Peak Hour', value: analytics.aggregate.peakHour !== null ? analytics.aggregate.peakHour + ':00' : '—' },
              ].map((stat, i) => (
                <div key={i} style={{ background: '#1F2937', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#F9FAFB', marginTop: '4px' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Model breakdown */}
            {Object.keys(analytics.aggregate.modelBreakdown || {}).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#D1D5DB', fontSize: '14px', marginBottom: '8px' }}>Model Usage</h3>
                <div style={styles.logTable}>
                  {Object.entries(analytics.aggregate.modelBreakdown).map(([model, data]) => (
                    <div key={model} style={{ ...styles.logRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <code style={{ color: '#60A5FA', fontSize: '12px' }}>{model}</code>
                      <span style={{ color: '#D1D5DB', fontSize: '12px' }}>{data.calls} calls | {data.inputTokens.toLocaleString()} in / {data.outputTokens.toLocaleString()} out | ${data.costUSD.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature breakdown */}
            {analytics.aggregate.topFeatures?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#D1D5DB', fontSize: '14px', marginBottom: '8px' }}>Feature Usage</h3>
                <div style={styles.logTable}>
                  {analytics.aggregate.topFeatures.map((f, i) => (
                    <div key={i} style={{ ...styles.logRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#D1D5DB', fontSize: '13px' }}>{f.feature}</span>
                      <span style={{ color: '#10B981', fontSize: '13px', fontWeight: '600' }}>{f.count} uses</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat capability breakdown */}
            {Object.keys(analytics.aggregate.chatCapabilities || {}).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#D1D5DB', fontSize: '14px', marginBottom: '8px' }}>Chatbot Capabilities Used</h3>
                <div style={styles.logTable}>
                  {Object.entries(analytics.aggregate.chatCapabilities).sort((a, b) => b[1] - a[1]).map(([cap, count]) => (
                    <div key={cap} style={{ ...styles.logRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#D1D5DB', fontSize: '13px' }}>{cap.replace(/_/g, ' ')}</span>
                      <span style={{ color: '#FBCE04', fontSize: '13px', fontWeight: '600' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily summaries */}
            {analytics.dailySummaries?.length > 0 && (
              <div>
                <h3 style={{ color: '#D1D5DB', fontSize: '14px', marginBottom: '8px' }}>Daily Breakdown</h3>
                <div style={styles.logTable}>
                  {analytics.dailySummaries.map((day, i) => (
                    <div key={i} style={{ ...styles.logRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#60A5FA', fontSize: '13px', fontFamily: 'monospace' }}>{day.date}</span>
                      <span style={{ color: '#D1D5DB', fontSize: '12px' }}>
                        {day.totalRequests} req | {day.uniqueUserCount || 0} users | ${(day.estimatedCostUSD || 0).toFixed(4)} | {day.errors || 0} errors
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Logout */}
      <div style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '48px' }}>
        <button onClick={() => { setAuthenticated(false); setSecret(''); setHealth(null); setAnalytics(null); }} style={styles.logoutButton}>
          🔒 Lock Dashboard
        </button>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  // Gate
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0F172A',
    padding: '1rem',
  },
  gateCard: {
    background: '#1E293B',
    borderRadius: '20px',
    padding: '48px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    border: '1px solid #334155',
  },
  gateLock: { fontSize: '48px', marginBottom: '16px' },
  gateTitle: { color: '#F1F5F9', fontSize: '24px', fontWeight: '700', marginBottom: '8px' },
  gateSubtitle: { color: '#64748B', fontSize: '14px', marginBottom: '24px' },
  gateInput: {
    width: '100%',
    padding: '14px',
    background: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '10px',
    color: '#F1F5F9',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    marginBottom: '12px',
  },
  gateButton: {
    width: '100%',
    padding: '14px',
    background: '#5D0022',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  errorBox: {
    background: '#451A2B',
    border: '1px solid #7F1D3D',
    borderRadius: '8px',
    padding: '10px',
    color: '#FCA5A5',
    fontSize: '14px',
    marginBottom: '16px',
  },

  // Dashboard
  dashContainer: {
    minHeight: '100vh',
    background: '#0F172A',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#F1F5F9',
  },
  dashHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  dashTitle: { fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' },
  dashSubtitle: { fontSize: '14px', color: '#94A3B8', margin: 0 },
  refreshButton: {
    padding: '10px 20px',
    background: '#1E293B',
    color: '#F1F5F9',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  statusBanner: {
    borderRadius: '12px',
    padding: '16px 24px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  statusBannerText: { color: 'white', fontSize: '18px', fontWeight: '700' },
  statusBannerDetail: { color: 'rgba(255,255,255,0.8)', fontSize: '13px' },

  // Cards
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  serviceCard: {
    background: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px 12px',
    borderBottom: '1px solid #334155',
  },
  cardIcon: { fontSize: '20px' },
  cardTitle: { fontSize: '15px', fontWeight: '600', margin: 0, flex: 1 },
  cardBody: { padding: '12px 20px 16px' },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '13px',
    color: '#94A3B8',
    borderBottom: '1px solid #1E293B',
  },
  cardValue: { color: '#F1F5F9', fontWeight: '500', fontFamily: 'monospace', fontSize: '12px' },

  // Sections
  section: { marginBottom: '32px' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#F1F5F9' },

  // Env vars
  envGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '8px',
  },
  envItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: '#1E293B',
    borderRadius: '8px',
    border: '1px solid #334155',
  },

  // Lookup
  lookupRow: { display: 'flex', gap: '8px', marginBottom: '12px' },
  lookupInput: {
    flex: 1,
    padding: '12px',
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#FBCE04',
    fontSize: '14px',
    fontFamily: 'monospace',
    outline: 'none',
  },
  lookupButton: {
    padding: '12px 20px',
    background: '#5D0022',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  lookupResult: {
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    color: '#10B981',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '300px',
    whiteSpace: 'pre-wrap',
  },

  // Security logs
  logTable: {
    background: '#1E293B',
    borderRadius: '12px',
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  logRow: {
    padding: '14px 20px',
    borderBottom: '1px solid #334155',
  },
  logRowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  logEvent: { fontSize: '14px', fontWeight: '500', color: '#F1F5F9' },
  logCode: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#FBCE04',
    fontFamily: 'monospace',
    background: '#0F172A',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  logRowBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#94A3B8',
    gap: '8px',
    flexWrap: 'wrap',
  },
  logTime: { fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' },
  logRowMeta: {
    fontSize: '11px',
    color: '#475569',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  logoutButton: {
    padding: '10px 24px',
    background: 'transparent',
    color: '#64748B',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
};
