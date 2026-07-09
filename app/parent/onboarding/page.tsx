import { Suspense } from 'react';
import ParentOnboardingContent from './OnboardingContent';

function OnboardingSkeleton() {
  return (
    <main className="bg-grid min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div
        className="w-full max-w-md animate-pulse"
        style={{
          background: '#080808',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          borderRadius: '16px',
          height: '320px',
        }}
      />
    </main>
  );
}

export default function ParentOnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <ParentOnboardingContent />
    </Suspense>
  );
}
