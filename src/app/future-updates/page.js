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
    <div className="layout-with-sidebar">
      {/* Sidebar */}
      <Sidebar role={role} activeSection="future-updates" />

      {/* Main Content */}
      <main className="main-content">
        {/* Top Navigation Bar */}
        <nav className="topnav">
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gray-900)' }}>
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
                color: 'var(--primary)',
                marginBottom: '12px',
              }}
            >
              What We're Cooking
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
              {isStudent
                ? "Stuff that's actually in the works — not vaporware. Built on what you've told us you need."
                : "Real features, actively being built. No \"we'll look into it\" energy here."}
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
              🔗 Official D2L API Access — Hopefully Coming Soon
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
              We're pushing for CMU to give us limited API access to D2L Brightspace. That would unlock
              significantly more powerful features for both students and instructors with way more intuition
              than what we can do with calendar feeds alone.
            </p>
          </div>

          {isStudent ? (
            <>
              {/* STUDENT VERSION */}

              {/* In Development Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
                  In the Oven
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Outlook Calendar Sync',
                      description:
                        'Your D2L assignments and your Outlook schedule in the same place. No more "wait, did I have something at 2?" moments.',
                    },
                    {
                      title: 'Email Event Detection',
                      description:
                        'That group project meeting buried in a 47-reply email chain? We\'ll find it and throw it on your calendar before you forget it exists.',
                    },
                    {
                      title: 'Smart Priority Engine',
                      description:
                        'Right now we sort by due date. That\'s fine, but it\'s not smart. We\'re building a system that factors in grade weighting, assignment type, how long things actually take you, and what\'s worth the most to your GPA — so when we tell you what to work on first, it\'s not just "this is due soonest."',
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--white)',
                        border: '1px solid var(--gray-300)',
                        borderLeft: '4px solid #059669',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* On the Roadmap Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
                  On the Whiteboard
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Canvas LMS Support',
                      description:
                        'Not everyone uses D2L. We get it. Canvas support is coming so it doesn\'t have to be just a CMU thing.',
                    },
                    {
                      title: 'Smart Study Planner',
                      description:
                        'AI that actually looks at your workload, knows what\'s worth more points, and builds you a study schedule that isn\'t delusional.',
                    },
                    {
                      title: 'Grade Predictions',
                      description:
                        'A brutally honest forecast of where your grade is headed based on your current pace. Think of it as a reality check that\'s actually trying to help.',
                    },
                    {
                      title: 'Mobile App (iOS & Android)',
                      description:
                        'Everything you see here, but in your pocket. Push notifications, calendar, the whole deal. For when you\'re not near a laptop — so, always.',
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--white)',
                        border: '1px solid var(--gray-300)',
                        borderLeft: '4px solid #3B82F6',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* For Instructors Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
                  For Instructors
                </h2>
                <div
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
                    Professors are getting their own upgrades too — submission tracking, grading dashboards, class
                    analytics, and the ability to post announcements straight from here. The goal is for them to run
                    their whole course through this instead of wrestling with D2L. More features for them means a
                    better experience for you.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* INSTRUCTOR VERSION */}

              {/* In Development Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
                  In the Oven
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Submission Tracking',
                      description:
                        "Real-time view of who's turned in what. No more opening D2L, clicking through three menus, and squinting at a spreadsheet.",
                    },
                    {
                      title: 'Grading Dashboard',
                      description:
                        'A grading queue sorted by urgency so you know exactly what needs attention first. Less time in D2L, more time doing literally anything else.',
                    },
                    {
                      title: 'Weighted Grade Intelligence',
                      description:
                        "See which assignments actually move the needle on student grades. Know when a 10-point homework is drowning out a 200-point project in your students' attention. Helps you spot when the workload math isn't adding up.",
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--white)',
                        border: '1px solid var(--gray-300)',
                        borderLeft: '4px solid #059669',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* On the Roadmap Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
                  On the Whiteboard
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Class Analytics',
                      description:
                        'Participation trends, grade distributions, students falling behind — all visible at a glance instead of buried in D2L reports nobody opens.',
                    },
                    {
                      title: 'Announcement Posting',
                      description: 'Write and publish announcements to D2L without leaving this dashboard. One less tab to keep open.',
                    },
                    {
                      title: 'Discussion Monitoring',
                      description:
                        'See who\'s actually participating in discussions and get pinged when a student question goes unanswered. No more checking manually.',
                    },
                    {
                      title: 'Canvas LMS Support',
                      description:
                        'Not every course runs on D2L. Canvas support is coming so this works wherever you teach.',
                    },
                    {
                      title: 'Mobile App (iOS & Android)',
                      description:
                        'Manage courses from your phone. Check submissions, review deadlines, stay on top of things without opening a laptop.',
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--white)',
                        border: '1px solid var(--gray-300)',
                        borderLeft: '4px solid #3B82F6',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Long-Term Vision Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
                  The Endgame
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    {
                      title: 'Create & Assign from Here',
                      description:
                        "Build assignments, quizzes, and discussions right here. Set due dates, points, submission types — it all syncs to D2L. No more switching back and forth between platforms for every little thing.",
                    },
                    {
                      title: 'Full Announcement Management',
                      description:
                        "Draft, schedule, and publish announcements to D2L from this dashboard. Target specific sections, track who's seen them. Basically, D2L's announcement system but usable.",
                    },
                    {
                      title: 'One Dashboard to Rule Them All',
                      description:
                        "Assignments, grades, announcements, discussions, student communication — all in one place. The dream is you never have to open D2L directly again. We're not there yet, but that's where this is going.",
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--white)',
                        border: '1px solid var(--gray-300)',
                        borderLeft: '4px solid #8B5CF6',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '8px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '12px', fontStyle: 'italic' }}>
                  These depend on full D2L API access. We're working on it — CMU knows we want in.
                </p>
              </div>

              {/* For Students Section */}
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
                  For Students
                </h2>
                <div
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: '1.6' }}>
                    Students are getting Outlook sync, email event detection, smart study planning, and grade predictions.
                    The better they can manage their workload, the fewer "can I get an extension?" emails you get. Everybody wins.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Feedback Section */}
          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '16px' }}>
              Tell Us What to Build Next
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
                ✓ Got it. Your feedback is logged and on our radar.
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
                      color: 'var(--gray-900)',
                      marginBottom: '8px',
                    }}
                  >
                    What's missing? What's annoying? What would make this actually indispensable? We read every one of these.
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
                      border: '1px solid var(--gray-300)',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      color: 'var(--gray-900)',
                      backgroundColor: 'var(--white)',
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
