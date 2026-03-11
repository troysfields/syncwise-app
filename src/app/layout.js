import './globals.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastNotifications';

export const metadata = {
  title: 'SyncWise AI — Smart Academic Calendar',
  description: 'All your deadlines, one smart calendar. Syncs D2L and Outlook with AI prioritization.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
          <ToastContainer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
