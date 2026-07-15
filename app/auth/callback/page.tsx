import { Suspense } from 'react';
import CallbackContent from './CallbackContent';
import SigningInAnimation from '@/components/SigningInAnimation';

// Auth callback must run client-side: Supabase invite / magic-link verification
// returns the session in the URL *fragment* (#access_token=…), which never reaches
// a server route handler. Only a client component can read window.location.hash.
export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  // Fallback is the same animation the content renders — no generic spinner
  // flash before the real one mounts.
  return (
    <Suspense fallback={<SigningInAnimation />}>
      <CallbackContent />
    </Suspense>
  );
}
