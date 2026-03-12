'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeProvider';
import { NotificationCenter } from '../components/NotificationCenter';
import { reportError, showToast } from '../components/ToastNotifications';

export default function FutureUpdatesPage() {
  const [role, setRole] = useState('student');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Detect role from localStorage or cookies
  useEffect(() => {
    const settings = localStorage.getItem('syncwise_settings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        if (parsed.role) setRole(parsed.role);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Reset feedback form after submission
  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => setSubmitted(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [submitted]);

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    if (!feedbackText.trim()) {
      reportError('Please enter your feedback before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feature_request',
          message: feedbackText,
          user: 'anonymous',
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        showToast('Thank you for your feedback!', 'success');
        setFeedbackText('');
        setSubmitted(true);
      } else {
        reportError('Failed to submit feedback. Please try again.');
      }
    } catch (err) {
      reportError('Error submitting feedback: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isStudent = role === 'student';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary, #f1f5f9)' }}>
      {/* Sidebar */}
      <Sidebar role={role} activeSection="future-updates" />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {/* Top Navigation Bar */}
        <nav
          style={{
            background: 'white',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
            Future Updates
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </nav>

        {/* Page Content */}
        <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#5D0022',
                marginBottom: '12px',
              }}
            >
              {isStudent ? "What's Coming to CMU AI Calendar" : "What's Coming to CMU AI Calendar"}
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.6' }}>
              {isStudent
                ? "We're actively building new features based on student feedback. Here's what's on the way."
                : "We're actively building new features based on instructor feedback. Here's what's on the way."}
            </p>
          </div>

          {/* CMU API Access Banner */}
          <div
            style={{
              background: '#FBCE04',
              border: '1px solid #F59E0B',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '32px',
              color: '#1e293b',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              🔗 Official D2L API Access — Coming Soon
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
              We're currently working with CMU to secure official API access to D2L Brightspace. This will unlock
              significantly more powerful features for both students and instructors. Your feedback helps us make the
              case — let us know what matters most to you!
            </p>
          </div>

          {isStudent ? (
            <>
              {/* STUDENT VERSION */}

              {/* In Development Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                  In Development
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Outlook Calendar Sync',
                      description:
                        'Connect your Outlook calendar to see class schedules, meetings, and campus events alongside your D2L assignments. All in one view.',
                    },
                    {
                      title: 'Email Event Detection',
                      description:
                        "We'll scan your inbox for calendar-worthy events — group project meetings, review sessions, career fairs — and suggest adding them to your calendar.",
                    },
                    {
                      title: 'Syllabus Upload',
                      description:
                        "Upload your course syllabus and we'll automatically extract key dates, exams, and deadlines.",
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #059669',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* On the Roadmap Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                  On the Roadmap
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Canvas LMS Support',
                      description:
                        "We're building compatibility with Canvas so students at other institutions (or courses using Canvas) can use CMU AI Calendar too.",
                    },
                    {
                      title: 'Smart Study Planner',
                      description:
                        'AI-generated study schedules based on your assignment load, difficulty, and personal patterns.',
                    },
                    {
                      title: 'Grade Predictions',
                      description:
                        'See how your current pace might affect your final grade, with suggestions for where to focus.',
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #3B82F6',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* For Instructors Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                  For Instructors
                </h2>
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                    On the instructor side, we're working on submission tracking and grading dashboards, class
                    analytics, announcement posting directly to D2L, and tools to help identify students who may need
                    extra support. Long-term, we envision instructors being able to create and assign coursework, manage
                    announcements, and run their entire course through CMU AI Calendar. These features require the full
                    D2L API access we're pursuing with CMU.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* INSTRUCTOR VERSION */}

              {/* In Development Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                  In Development
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Submission Tracking',
                      description:
                        "See real-time submission rates for every assignment. Know who's turned in work and who hasn't, without leaving the dashboard.",
                    },
                    {
                      title: 'Grading Dashboard',
                      description:
                        'A dedicated grading queue that shows what needs grading, sorted by urgency. Grade directly or link to D2L.',
                    },
                    {
                      title: 'Syllabus Date Import',
                      description:
                        "Upload your syllabus and we'll extract all assignment dates automatically, then sync them with your D2L calendar.",
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #059669',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* On the Roadmap Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                  On the Roadmap
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Class Analytics',
                      description:
                        'See participation trends, grade distributions, and identify students who may be falling behind — all in real-time.',
                    },
                    {
                      title: 'Announcement Posting',
                      description: 'Draft and publish course announcements directly to D2L without leaving the dashboard.',
                    },
                    {
                      title: 'Discussion Monitoring',
                      description:
                        'Track discussion board activity, see participation rates, and get alerts for unanswered student questions.',
                    },
                    {
                      title: 'Canvas LMS Support',
                      description:
                        "We're building Canvas compatibility to support courses and institutions that use Canvas alongside or instead of D2L.",
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #3B82F6',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Long-Term Vision Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                  Long-Term Vision
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Create & Assign Directly from Dashboard',
                      description:
                        "Build and publish assignments, quizzes, and discussions directly through CMU AI Calendar — no need to switch to D2L. Set due dates, point values, and submission types all in one place, and it syncs straight to your D2L course.",
                    },
                    {
                      title: 'Full Announcement Management',
                      description:
                        "Draft, preview, and publish course announcements to D2L without ever leaving the dashboard. Schedule announcements in advance, target specific sections, and track which students have seen them.",
                    },
                    {
                      title: 'Unified Course Management Hub',
                      description:
                        "A single platform where you can manage your entire course — assignments, grades, announcements, discussions, and student communication — all through one clean interface instead of juggling between D2L and other tools.",
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #8B5CF6',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '12px', fontStyle: 'italic' }}>
                  These features represent our longer-term vision and depend on deeper D2L API integration. We're actively working with CMU to make this possible.
                </p>
              </div>

              {/* For Students Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                  For Students
                </h2>
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                    On the student side, we're building Outlook calendar sync, email-based event detection, smart study
                    planning, and grade predictions. These will help students stay on top of their schedules and plan
                    ahead more effectively.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Feedback Section */}
          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
              Share Your Feedback
            </h2>
            {submitted ? (
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #86EFAC',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#166534',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                ✓ Thank you for your feedback! We appreciate your input.
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label
                    htmlFor="feedback-textarea"
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#1e293b',
                      marginBottom: '8px',
                    }}
                  >
                    What feature would make the biggest difference for you? Your input directly shapes what we build
                    next.
                  </label>
                  <textarea
                    id="feedback-textarea"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us what you're looking for..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '12px',
                      fontSize: '14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      color: '#1e293b',
                      backgroundColor: 'white',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: '#5D0022',
                    color: 'white',
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) e.target.style.background = '#470019';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) e.target.style.background = '#5D0022';
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>

          {/* Spacing at bottom */}
          <div style={{ height: '32px' }} />
        </div>
      </main>
    </div>
  );
}
