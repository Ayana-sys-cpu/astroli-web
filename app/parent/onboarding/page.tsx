import { Suspense } from 'react';
import ParentOnboardingContent from './OnboardingContent';

export default function ParentOnboardingPage() {
  return <Suspense fallback={null}><ParentOnboardingContent /></Suspense>;
}
