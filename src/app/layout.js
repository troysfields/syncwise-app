import './globals.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastNotifications';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ThemeProvider } from './components/ThemeProvider';

export const metadata = {
  title: 'SyncWise AI — Smart Academic Calendar',
  description: 'All your deadlines, one smart calendar. Syncs D2L and Outlook with AI prioritization.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ErrorBoundary>
            {children}
            <ToastContainer />
            <FeedbackPanel />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
