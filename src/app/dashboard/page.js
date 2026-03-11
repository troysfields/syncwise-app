'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary, #0f1923)', color: 'var(--text-primary, #e2e8f0)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📚</div>
        <div>Loading SyncWise AI...</div>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardClient />;
}
