'use client';

// SyncWise AI — Privacy Policy
// Required for beta launch and D2L/Microsoft API access requests

export default function PrivacyPolicy() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.updated}>Last updated: March 11, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.heading}>Overview</h2>
          <p style={styles.text}>
            CMU AI Calendar (by SyncWise AI) is an academic productivity tool built by Troy Fields as part of
            the ENTR 450 capstone at Colorado Mesa University. This policy explains what
            data we collect, how we use it, and how we protect it.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Data We Collect</h2>
          <p style={styles.text}>
            <strong>D2L Calendar Feed:</strong> When you connect your D2L account, we
            access your iCal calendar feed URL to retrieve assignment names, due dates,
            course names, and event times. This data is fetched on demand and processed
            in real-time — it is not permanently stored on our servers.
          </p>
          <p style={styles.text}>
            <strong>Basic Profile Info:</strong> During setup, you provide your name and
            optionally your email address. This is stored locally in your browser and in
            an encrypted session cookie.
          </p>
          <p style={styles.text}>
            <strong>Feedback:</strong> If you submit feedback through the in-app feedback
            panel, your responses are stored server-side for product improvement.
          </p>
          <p style={styles.text}>
            <strong>Usage Analytics:</strong> We collect anonymous session analytics
            (page views, feature usage) to understand how the platform is used. No
            personally identifiable information is included.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Data We Do NOT Collect</h2>
          <p style={styles.text}>
            We do not access your grades, submissions, discussion posts, course content,
            or any D2L data beyond your calendar feed. We do not read your email content
            unless you explicitly use the email scanning feature (coming soon), and even
            then, email content is parsed in real-time and never permanently stored. We
            do not sell, share, or transfer any user data to third parties.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>How We Use Your Data</h2>
          <p style={styles.text}>
            Your calendar data is used solely to display your assignments and due dates
            on your CMU AI Calendar dashboard. AI prioritization features analyze your task list
            to suggest study priorities — this analysis happens in real-time and results
            are not stored. Instructor-uploaded documents (syllabi, schedules) are parsed
            for dates and course information to supplement your calendar.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Data Storage and Security</h2>
          <p style={styles.text}>
            CMU AI Calendar is hosted on Vercel with HTTPS encryption for all connections.
            Session data is signed with HMAC-SHA256 and stored in httpOnly, secure
            cookies that cannot be accessed by JavaScript. API routes are protected by
            session authentication. Admin routes require a separate secret key and fail
            closed (deny all access) if not configured.
          </p>
          <p style={styles.text}>
            All API requests are rate-limited to prevent abuse. Security headers include
            Content Security Policy (CSP), HTTP Strict Transport Security (HSTS),
            X-Frame-Options, and X-Content-Type-Options. All API activity is logged for
            FERPA compliance auditing.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>FERPA Compliance</h2>
          <p style={styles.text}>
            CMU AI Calendar is designed with FERPA (Family Educational Rights and Privacy Act)
            compliance in mind. We access only data that the student explicitly consents
            to share (calendar feed URL). No education records are accessed without
            student consent. All data access is audit-logged. Students can disconnect
            their data sources at any time by clearing their browser data or logging out.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>AI Processing</h2>
          <p style={styles.text}>
            CMU AI Calendar uses Anthropic&apos;s Claude AI for task prioritization and document
            analysis. When AI features are used, your task names and due dates may be
            sent to Anthropic&apos;s API for processing. Anthropic does not use this data
            for training. No personally identifiable information (names, emails, student
            IDs) is included in AI requests.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Your Rights</h2>
          <p style={styles.text}>
            You can disconnect your D2L calendar feed at any time by clearing your
            browser data or going to Settings. You can request deletion of any feedback
            you&apos;ve submitted by contacting troysfields@gmail.com. You can revoke
            Microsoft OAuth access at any time through your Microsoft account settings.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Third-Party Services</h2>
          <p style={styles.text}>
            <strong>Vercel:</strong> Hosting and serverless functions (vercel.com).
            <br />
            <strong>Anthropic:</strong> AI processing via Claude API (anthropic.com).
            <br />
            <strong>D2L Brightspace:</strong> Calendar feed data (d2l.coloradomesa.edu).
            <br />
            No data is shared with advertisers, analytics companies, or data brokers.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Changes to This Policy</h2>
          <p style={styles.text}>
            We may update this policy as features are added. Significant changes will be
            communicated through the app. The &quot;Last updated&quot; date at the top reflects
            the most recent revision.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Contact</h2>
          <p style={styles.text}>
            For questions about this privacy policy or your data, contact Troy Fields at
            troysfields@gmail.com.
          </p>
        </section>

        <div style={styles.footer}>
          <a href="/dashboard" style={styles.link}>Back to Dashboard</a>
        </div>
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
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '3rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.25rem 0',
  },
  updated: {
    fontSize: '0.875rem',
    color: '#9CA3AF',
    marginBottom: '2rem',
  },
  section: {
    marginBottom: '2rem',
  },
  heading: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: '0.75rem',
  },
  text: {
    fontSize: '0.95rem',
    color: '#374151',
    lineHeight: '1.7',
    marginBottom: '0.75rem',
  },
  footer: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #E5E7EB',
    textAlign: 'center',
  },
  link: {
    color: '#5D0022',
    textDecoration: 'none',
    fontWeight: '500',
  },
};
