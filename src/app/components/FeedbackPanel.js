'use client';

import { useState } from 'react';

// ============================================================
// Feedback Panel — Always-available slide-out feedback form
// Persistent tab on the right side of the dashboard
// ============================================================

export function FeedbackPanel({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Checkbox states
  const [easyToNavigate, setEasyToNavigate] = useState(false);
  const [aiSuggestionsHelpful, setAiSuggestionsHelpful] = useState(false);
  const [emailScanningUseful, setEmailScanningUseful] = useState(false);
  const [calendarViewsWork, setCalendarViewsWork] = useState(false);
  const [ranIntoBugs, setRanIntoBugs] = useState(false);
  const [somethingConfusing, setSomethingConfusing] = useState(false);
  const [wouldRecommend, setWouldRecommend] = useState(false);

  // Other fields
  const [usageFrequency, setUsageFrequency] = useState('');
  const [mostUsefulThing, setMostUsefulThing] = useState('');
  const [wishDifferently, setWishDifferently] = useState('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');

  function resetForm() {
    setEasyToNavigate(false);
    setAiSuggestionsHelpful(false);
    setEmailScanningUseful(false);
    setCalendarViewsWork(false);
    setRanIntoBugs(false);
    setSomethingConfusing(false);
    setWouldRecommend(false);
    setUsageFrequency('');
    setMostUsefulThing('');
    setWishDifferently('');
    setAdditionalFeedback('');
    setSubmitted(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user || 'anonymous',
          easyToNavigate,
          aiSuggestionsHelpful,
          emailScanningUseful,
          calendarViewsWork,
          ranIntoBugs,
          somethingConfusing,
          wouldRecommend,
          usageFrequency,
          mostUsefulThing,
          wishDifferently,
          additionalFeedback,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Feedback submission failed:', err);
    }
    setSubmitting(false);
  }

  return (
    <>
      {/* Persistent Feedback Tab */}
      <button
        className="feedback-tab"
        onClick={() => { setIsOpen(true); if (submitted) resetForm(); }}
        aria-label="Give feedback"
      >
        Feedback
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="feedback-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* Slide-out Panel */}
      <div className={`feedback-panel ${isOpen ? 'open' : ''}`}>
        <div className="feedback-panel-header">
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Share Your Feedback</h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
          >
            &times;
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#128588;</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: '#059669' }}>Thanks for your feedback!</h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '20px' }}>
              Your input directly shapes what we build next. Every response helps us make SyncWise better for you and your classmates.
            </p>
            <button
              className="btn btn-outline"
              onClick={() => { resetForm(); }}
              style={{ fontSize: '13px' }}
            >
              Submit More Feedback
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="feedback-intro">
              <p>
                This beta is built for <strong>you</strong>. Any and all feedback is hugely valuable and appreciated &mdash; even the small stuff. Be honest, it helps us improve.
              </p>
            </div>

            {/* Checkboxes */}
            <div className="feedback-section">
              <label className="feedback-section-label">Check all that apply:</label>

              <label className="feedback-checkbox">
                <input type="checkbox" checked={easyToNavigate} onChange={e => setEasyToNavigate(e.target.checked)} />
                <span>The dashboard is easy to navigate</span>
              </label>
              <label className="feedback-checkbox">
                <input type="checkbox" checked={aiSuggestionsHelpful} onChange={e => setAiSuggestionsHelpful(e.target.checked)} />
                <span>AI suggestions are helpful</span>
              </label>
              <label className="feedback-checkbox">
                <input type="checkbox" checked={emailScanningUseful} onChange={e => setEmailScanningUseful(e.target.checked)} />
                <span>Email scanning found useful events</span>
              </label>
              <label className="feedback-checkbox">
                <input type="checkbox" checked={calendarViewsWork} onChange={e => setCalendarViewsWork(e.target.checked)} />
                <span>Calendar views work well</span>
              </label>
              <label className="feedback-checkbox negative">
                <input type="checkbox" checked={ranIntoBugs} onChange={e => setRanIntoBugs(e.target.checked)} />
                <span>I ran into bugs or errors</span>
              </label>
              <label className="feedback-checkbox negative">
                <input type="checkbox" checked={somethingConfusing} onChange={e => setSomethingConfusing(e.target.checked)} />
                <span>Something felt confusing</span>
              </label>
              <label className="feedback-checkbox positive">
                <input type="checkbox" checked={wouldRecommend} onChange={e => setWouldRecommend(e.target.checked)} />
                <span>I&apos;d recommend this to a friend</span>
              </label>
            </div>

            {/* Usage frequency */}
            <div className="feedback-section">
              <label className="feedback-section-label">How often do you use SyncWise?</label>
              <div className="feedback-radio-group">
                {[
                  { value: 'daily', label: 'Daily' },
                  { value: 'few_times_week', label: 'A few times a week' },
                  { value: 'once_week', label: 'Once a week' },
                  { value: 'rarely', label: 'Rarely' },
                ].map(opt => (
                  <label key={opt.value} className="feedback-radio">
                    <input
                      type="radio"
                      name="usageFrequency"
                      value={opt.value}
                      checked={usageFrequency === opt.value}
                      onChange={e => setUsageFrequency(e.target.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fill in the blanks */}
            <div className="feedback-section">
              <label className="feedback-section-label">
                The most useful thing about SyncWise is...
              </label>
              <input
                type="text"
                className="feedback-input"
                value={mostUsefulThing}
                onChange={e => setMostUsefulThing(e.target.value)}
                placeholder="e.g., seeing all my deadlines in one place"
              />
            </div>

            <div className="feedback-section">
              <label className="feedback-section-label">
                One thing I wish it did differently is...
              </label>
              <input
                type="text"
                className="feedback-input"
                value={wishDifferently}
                onChange={e => setWishDifferently(e.target.value)}
                placeholder="e.g., show study group times more prominently"
              />
            </div>

            {/* Open text */}
            <div className="feedback-section">
              <label className="feedback-section-label">
                Anything else? <span style={{ fontWeight: '400', color: '#94A3B8' }}>(optional)</span>
              </label>
              <textarea
                className="feedback-textarea"
                value={additionalFeedback}
                onChange={e => setAdditionalFeedback(e.target.value)}
                placeholder="Feature ideas, complaints, compliments — all welcome"
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary feedback-submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
