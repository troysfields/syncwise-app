'use client';

// SyncWise AI — Welcome / Onboarding Instructions Page
// Shown after setup is complete. Explains key features and directs
// users to the chatbot for hands-on guidance.

export default function WelcomePage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>You&apos;re all set up!</h1>
          <p style={styles.subtitle}>
            Here&apos;s a quick rundown of what SyncWise AI can do for you.
          </p>
        </div>

        {/* Feature Cards */}
        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📅</span>
            <div>
              <h3 style={styles.featureName}>Smart Dashboard</h3>
              <p style={styles.featureDesc}>
                All your D2L assignments in one place. Switch between day, week, and
                month views. Color-coded by course.
              </p>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>🤖</span>
            <div>
              <h3 style={styles.featureName}>AI Priority Suggestions</h3>
              <p style={styles.featureDesc}>
                SyncWise AI analyzes your workload and tells you what to tackle first
                based on due dates, weight, and your schedule.
              </p>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>🔔</span>
            <div>
              <h3 style={styles.featureName}>Smart Notifications</h3>
              <p style={styles.featureDesc}>
                Get alerts for upcoming deadlines, date changes, and priority shifts.
                Customize timing, methods, and quiet hours in Settings.
              </p>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>🎯</span>
            <div>
              <h3 style={styles.featureName}>Focus Mode</h3>
              <p style={styles.featureDesc}>
                Hide the noise. Focus Mode shows only your top priority tasks so you
                can zero in on what matters right now.
              </p>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>🌙</span>
            <div>
              <h3 style={styles.featureName}>Dark Mode</h3>
              <p style={styles.featureDesc}>
                Easy on the eyes for late-night study sessions. Toggle with the
                moon icon in the top corner.
              </p>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>📤</span>
            <div>
              <h3 style={styles.featureName}>Export Your Week</h3>
              <p style={styles.featureDesc}>
                Download your schedule for the week to share, print, or keep as a
                reference.
              </p>
            </div>
          </div>
        </div>

        {/* Chatbot CTA */}
        <div style={styles.chatCta}>
          <div style={styles.chatIcon}>💬</div>
          <h2 style={styles.chatTitle}>Need help? Ask the AI assistant</h2>
          <p style={styles.chatDesc}>
            The SyncWise AI chatbot (bottom-right corner) can walk you through
            anything — connecting your D2L account, navigating features, configuring
            notifications, and more. Just click the chat bubble and ask.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <a href="/dashboard" style={styles.primaryBtn}>
            Go to Dashboard
          </a>
          <a href="/settings/notifications" style={styles.secondaryBtn}>
            Set Up Notifications
          </a>
        </div>

        <p style={styles.privacy}>
          Your data is protected. <a href="/privacy" style={styles.privacyLink}>Read our privacy policy</a>.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    maxWidth: '680px',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '2.5rem',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6B7280',
    margin: 0,
  },
  features: {
    display: 'grid',
    gap: '1rem',
    marginBottom: '2rem',
  },
  feature: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    padding: '1rem',
    backgroundColor: '#F9FAFB',
    borderRadius: '10px',
  },
  featureIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
    marginTop: '2px',
  },
  featureName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 0.25rem 0',
  },
  featureDesc: {
    fontSize: '0.85rem',
    color: '#6B7280',
    lineHeight: '1.5',
    margin: 0,
  },
  chatCta: {
    textAlign: 'center',
    padding: '1.5rem',
    backgroundColor: '#FDF2F4',
    borderRadius: '12px',
    marginBottom: '2rem',
    border: '1px solid #E8B4BF',
  },
  chatIcon: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  chatTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#3730A3',
    margin: '0 0 0.5rem 0',
  },
  chatDesc: {
    fontSize: '0.875rem',
    color: '#470019',
    lineHeight: '1.6',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  primaryBtn: {
    padding: '0.75rem 2rem',
    backgroundColor: '#5D0022',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  secondaryBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.95rem',
  },
  privacy: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#9CA3AF',
  },
  privacyLink: {
    color: '#5D0022',
    textDecoration: 'none',
  },
};
