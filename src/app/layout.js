import './globals.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastNotifications';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ThemeProvider } from './components/ThemeProvider';
import ChatWidget from './components/ChatWidget';

export const metadata = {
  title: 'CMU AI Calendar — Smart Academic Calendar by SyncWise AI',
  description: 'All your deadlines, one smart calendar. Syncs D2L with AI prioritization for Colorado Mesa University.',
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
            <ChatWidget />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
