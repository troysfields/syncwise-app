'use client';

import { useState, useEffect } from 'react';

export default function AdminFeedbackDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

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
  const allFeedback = data?.feedback || [];
  const formFeedback = data?.formFeedback || [];
  const chatbotFeedback = data?.chatbotFeedback || [];
  const totalForm = stats.total || 0;
  const totalAll = allFeedback.length;

  function pct(val) { return totalForm > 0 ? Math.round((val / totalForm) * 100) : 0; }

  const filteredFeedback = activeTab === 'all' ? allFeedback
    : activeTab === 'form' ? formFeedback
    : chatbotFeedback;

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, sans-serif', background: '#0F172A', minHeight: '100vh', color: '#E2E8F0' }}>
      <div style={{ background: '#1E293B', borderBottom: '1px solid #334155', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>&#128172;</span>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>SyncWise — Feedback Hub</h1>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>{totalAll} total entries</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
          <a href="/admin/health" style={{ color: '#818CF8', textDecoration: 'none' }}>System Health</a>
          <a href="/dashboard" style={{ color: '#818CF8', textDecoration: 'none' }}>&#8592; Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'all', label: `All (${totalAll})` },
            { key: 'form', label: `Form Responses (${formFeedback.length})` },
            { key: 'chatbot', label: `Chatbot Reports (${chatbotFeedback.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              background: activeTab === tab.key ? '#5D0022' : '#1E293B',
              color: activeTab === tab.key ? '#FFFFFF' : '#94A3B8',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {totalAll === 0 ? (
          <div style={{ background: '#1E293B', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #334155' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#128172;</div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No feedback yet</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8' }}>Feedback will appear here once users submit responses or report issues through the chatbot.</p>
          </div>
        ) : (
          <>
            {/* Stats Grid — only show when form tab or all tab */}
            {(activeTab === 'all' || activeTab === 'form') && totalForm > 0 && (
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
                    <div style={{ fontSize: '11px', color: '#475569' }}>{s.val}/{totalForm} responses</div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#1E293B', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Issues Reported</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#EF4444' }}>{chatbotFeedback.filter(f => f.type === 'issue').length}</div>
              </div>
              <div style={{ background: '#1E293B', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Feature Suggestions</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#818CF8' }}>{chatbotFeedback.filter(f => f.type === 'suggestion').length}</div>
              </div>
              <div style={{ background: '#1E293B', borderRadius: '12px', padding: '16px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Form Responses</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#10B981' }}>{totalForm}</div>
              </div>
            </div>

            {/* Feedback Entries */}
            <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>
                {activeTab === 'all' ? 'All Feedback' : activeTab === 'form' ? 'Form Responses' : 'Chatbot Reports & Suggestions'}
                <span style={{ color: '#64748B', fontWeight: '400', marginLeft: '8px' }}>({filteredFeedback.length})</span>
              </h2>

              {filteredFeedback.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748B', fontSize: '13px' }}>No entries in this category yet.</div>
              )}

              {filteredFeedback.map((f, i) => (
                <div key={f.id || i} style={{ padding: '14px 0', borderBottom: i < filteredFeedback.length - 1 ? '1px solid #334155' : 'none' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                        background: f.type === 'issue' ? '#EF44441A' : f.type === 'suggestion' ? '#818CF81A' : '#10B9811A',
                        color: f.type === 'issue' ? '#EF4444' : f.type === 'suggestion' ? '#818CF8' : '#10B981',
                      }}>
                        {f.type === 'issue' ? 'BUG REPORT' : f.type === 'suggestion' ? 'SUGGESTION' : 'FORM'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>{f.userEmail || f.user || 'anonymous'}</span>
                      <span style={{ fontSize: '11px', color: '#475569' }}>({f.userRole || 'student'})</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>
                      {f.submittedAt ? new Date(f.submittedAt).toLocaleString() : f.timestamp ? new Date(f.timestamp).toLocaleString() : ''}
                    </div>
                  </div>

                  {/* Chatbot feedback — description + conversation context */}
                  {(f.type === 'issue' || f.type === 'suggestion') && (
                    <>
                      <div style={{ fontSize: '13px', marginBottom: '6px' }}>{f.description}</div>
                      {f.conversationContext && (
                        <details style={{ fontSize: '12px', color: '#64748B' }}>
                          <summary style={{ cursor: 'pointer', marginBottom: '4px' }}>View conversation context</summary>
                          <pre style={{ background: '#0F172A', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-wrap', fontSize: '11px', lineHeight: '1.5', maxHeight: '200px', overflow: 'auto' }}>
                            {f.conversationContext}
                          </pre>
                        </details>
                      )}
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                        Source: {f.page || 'chatbot'} &middot; Status: <span style={{ color: f.status === 'open' ? '#F59E0B' : '#10B981' }}>{f.status || 'new'}</span>
                      </div>
                    </>
                  )}

                  {/* Form feedback — checkbox results + open responses */}
                  {f.type === 'form_feedback' && (
                    <>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {f.easyToNavigate && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#10B98120', color: '#10B981' }}>Easy to navigate</span>}
                        {f.aiSuggestionsHelpful && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#10B98120', color: '#10B981' }}>AI helpful</span>}
                        {f.calendarViewsWork && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#10B98120', color: '#10B981' }}>Calendar works</span>}
                        {f.wouldRecommend && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#10B98120', color: '#10B981' }}>Would recommend</span>}
                        {f.ranIntoBugs && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#F59E0B20', color: '#F59E0B' }}>Had bugs</span>}
                        {f.somethingConfusing && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#F59E0B20', color: '#F59E0B' }}>Something confusing</span>}
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
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                        Usage: {f.usageFrequency || 'not specified'}
                      </div>
                    </>
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
