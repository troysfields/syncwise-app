'use client';

import { useState, useEffect } from 'react';

export default function AdminFeedbackDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/feedback')
      .then(res => res.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', textAlign: 'center', color: '#64748B' }}>Loading feedback...</div>;
  }

  const stats = data?.stats || {};
  const feedback = data?.feedback || [];
  const total = stats.total || 0;

  function pct(val) { return total > 0 ? Math.round((val / total) * 100) : 0; }

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, sans-serif', background: '#0F172A', minHeight: '100vh', color: '#E2E8F0' }}>
      <div style={{ background: '#1E293B', borderBottom: '1px solid #334155', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>&#128172;</span>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>CMU AI Calendar — Feedback</h1>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>{total} responses</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
          <a href="/admin/health" style={{ color: '#818CF8', textDecoration: 'none' }}>System Health</a>
          <a href="/dashboard" style={{ color: '#818CF8', textDecoration: 'none' }}>← Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        {total === 0 ? (
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #334155' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#128172;</div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No feedback yet</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8' }}>Feedback will appear here once students start submitting responses.</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Easy to Navigate', val: stats.easyToNavigate, color: '#10B981' },
                { label: 'AI Suggestions Helpful', val: stats.aiSuggestionsHelpful, color: '#10B981' },
                { label: 'Would Recommend', val: stats.wouldRecommend, color: '#10B981' },
                { label: 'Ran Into Bugs', val: stats.ranIntoBugs, color: '#F59E0B' },
              ].map(s => (
                <div key={s.label} style={{ background: '#1E293B', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{pct(s.val)}%</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>{s.val}/{total} responses</div>
                </div>
              ))}
            </div>

            {/* Open Responses */}
            <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>&#128221; Open Responses</h2>
              {feedback.filter(f => f.mostUsefulThing || f.wishDifferently || f.additionalFeedback).map((f, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '6px' }}>
                    {f.user} — {new Date(f.timestamp).toLocaleString()} — Uses: {f.usageFrequency || 'not specified'}
                  </div>
                  {f.mostUsefulThing && (
                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: '#10B981', fontWeight: '600' }}>Most useful:</span> {f.mostUsefulThing}
                    </div>
                  )}
                  {f.wishDifferently && (
                    <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: '#F59E0B', fontWeight: '600' }}>Wish differently:</span> {f.wishDifferently}
                    </div>
                  )}
                  {f.additionalFeedback && (
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: '#818CF8', fontWeight: '600' }}>Other:</span> {f.additionalFeedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
