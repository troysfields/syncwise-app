'use client';

import { useState, useEffect } from 'react';

export default function AdminHealthDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function fetchHealth() {
    try {
      const res = await fetch(`/api/admin/health?hours=${hours}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch health data:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchHealth();
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // refresh every 30s
      return () => clearInterval(interval);
    }
  }, [hours, autoRefresh]);

  function getSeverityColor(severity) {
    const colors = { critical: '#DC2626', high: '#F59E0B', medium: '#3B82F6', low: '#94A3B8' };
    return colors[severity] || '#94A3B8';
  }

  function getPlatformIcon(platform) {
    const icons = { outlook: '📧', d2l: '📚', claude: '🤖', internal: '⚙️', client: '🖥️' };
    return icons[platform] || '❓';
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', textAlign: 'center', color: '#64748B' }}>
        Loading health data...
      </div>
    );
  }

  const errors = data?.errors || {};
  const health = data?.health || {};
  const recentErrors = data?.recentErrors || [];

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, sans-serif', background: '#0F172A', minHeight: '100vh', color: '#E2E8F0' }}>
      {/* Header */}
      <div style={{ background: '#1E293B', borderBottom: '1px solid #334155', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🛡️</span>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>SyncWise Admin — System Health</h1>
          {errors.recentSpike && (
            <span style={{ background: '#DC2626', color: 'white', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '700', animation: 'pulse 2s infinite' }}>
              ⚠ SPIKE DETECTED
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            style={{ background: '#334155', color: '#E2E8F0', border: '1px solid #475569', borderRadius: '6px', padding: '6px 10px', fontSize: '13px' }}
          >
            <option value="1">Last 1 hour</option>
            <option value="6">Last 6 hours</option>
            <option value="24">Last 24 hours</option>
            <option value="168">Last 7 days</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <a href="/dashboard" style={{ color: '#818CF8', textDecoration: 'none' }}>← Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Total Errors</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: errors.total > 0 ? '#F59E0B' : '#10B981' }}>
              {errors.total || 0}
            </div>
          </div>
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Critical</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: (errors.bySeverity?.critical || 0) > 0 ? '#DC2626' : '#10B981' }}>
              {errors.bySeverity?.critical || 0}
            </div>
          </div>
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Last 10 Min</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: (errors.recentCount || 0) >= 5 ? '#DC2626' : '#E2E8F0' }}>
              {errors.recentCount || 0}
            </div>
          </div>
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Health Checks</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#E2E8F0' }}>
              {health.checks || 0}
            </div>
          </div>
        </div>

        {/* API Health + Error Breakdown Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* API Health */}
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📡 API Status
            </h2>
            {Object.keys(health.platforms || {}).length === 0 ? (
              <div style={{ color: '#64748B', fontSize: '13px' }}>No health check data yet. Checks are recorded when API calls are made.</div>
            ) : (
              Object.entries(health.platforms).map(([platform, stats]) => {
                const uptime = stats.total > 0 ? Math.round(stats.ok / stats.total * 100) : 100;
                return (
                  <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '18px' }}>{getPlatformIcon(platform)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', textTransform: 'capitalize' }}>{platform}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{stats.ok}/{stats.total} OK · avg {stats.avgResponseMs}ms</div>
                    </div>
                    <div style={{
                      padding: '3px 10px',
                      borderRadius: '100px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: uptime >= 95 ? '#064E3B' : uptime >= 80 ? '#78350F' : '#7F1D1D',
                      color: uptime >= 95 ? '#10B981' : uptime >= 80 ? '#F59E0B' : '#DC2626',
                    }}>
                      {uptime}% uptime
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Error Breakdown */}
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Error Breakdown
            </h2>
            {errors.total === 0 ? (
              <div style={{ color: '#10B981', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✅ No errors in the selected period
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>By Severity</div>
                  {Object.entries(errors.bySeverity || {}).map(([sev, count]) => (
                    <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getSeverityColor(sev) }}></span>
                      <span style={{ fontSize: '13px', textTransform: 'capitalize', flex: 1 }}>{sev}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>By Platform</div>
                  {Object.entries(errors.byPlatform || {}).map(([plat, count]) => (
                    <div key={plat} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <span style={{ fontSize: '14px' }}>{getPlatformIcon(plat)}</span>
                      <span style={{ fontSize: '13px', textTransform: 'capitalize', flex: 1 }}>{plat}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Errors Log */}
        <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔍 Recent Errors
            <span style={{ fontSize: '11px', fontWeight: '500', color: '#94A3B8' }}>({recentErrors.length} entries)</span>
          </h2>
          {recentErrors.length === 0 ? (
            <div style={{ color: '#10B981', fontSize: '13px' }}>✅ No errors logged</div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {recentErrors.map((err, i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  borderLeft: `3px solid ${getSeverityColor(err.severity)}`,
                  background: '#0F172A',
                  borderRadius: '0 8px 8px 0',
                  marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{getPlatformIcon(err.platform)}</span>
                      <code style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC' }}>{err.errorCode}</code>
                      <span style={{
                        fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                        color: getSeverityColor(err.severity),
                      }}>
                        {err.severity}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      {new Date(err.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '2px' }}>
                    {err.errorMessage}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    User: {err.user} · Endpoint: {err.endpoint || 'N/A'} · HTTP: {err.httpStatus || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claude Debug Link */}
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
          <a href={`/api/admin/health?format=claude&hours=${hours}`} target="_blank" style={{ color: '#818CF8', textDecoration: 'none' }}>
            📋 Get Claude-readable health report
          </a>
          <span style={{ margin: '0 8px' }}>·</span>
          <span>Auto-refresh: {autoRefresh ? 'ON (30s)' : 'OFF'}</span>
        </div>
      </div>
    </div>
  );
}
