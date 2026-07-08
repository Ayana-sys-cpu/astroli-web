import { Suspense } from 'react';
import ParentRevealContent from './RevealContent';

export default function ParentRevealPage() {
  return <Suspense fallback={null}><ParentRevealContent /></Suspense>;
}
