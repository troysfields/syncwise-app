import './globals.css';

export const metadata = {
  title: 'SyncWise AI — Smart Academic Calendar',
  description: 'All your deadlines, one smart calendar. Syncs D2L and Outlook with AI prioritization.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
