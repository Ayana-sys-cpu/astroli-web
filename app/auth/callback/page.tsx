import { Suspense } from 'react';
import CallbackContent from './CallbackContent';

// Auth callback must run client-side: Supabase invite / magic-link verification
// returns the session in the URL *fragment* (#access_token=…), which never reaches
// a server route handler. Only a client component can read window.location.hash.
export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <CallbackContent />
    </Suspense>
  );
}

function CallbackFallback() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-black">
      <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    </main>
  );
}
