'use client';

import dynamic from 'next/dynamic';
import { ErrorBoundary } from '../components/ErrorBoundary';

const InstructorClient = dynamic(() => import('./InstructorClient'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary, #0f1923)', color: 'var(--text-primary, #e2e8f0)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
        <div>Loading Instructor Dashboard...</div>
      </div>
    </div>
  ),
});

export default function InstructorPage() {
  return (
    <ErrorBoundary>
      <InstructorClient />
    </ErrorBoundary>
  );
}
