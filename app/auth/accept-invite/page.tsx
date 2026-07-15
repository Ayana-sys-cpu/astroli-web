import { Suspense } from 'react';
import AcceptInviteContent from './AcceptInviteContent';
import SigningInAnimation from '@/components/SigningInAnimation';

export default function AcceptInvitePage() {
  // Fallback is the same animation the content renders, so the student never
  // sees a blank frame or a second, different loader while Suspense resolves.
  return (
    <Suspense fallback={<SigningInAnimation />}>
      <AcceptInviteContent />
    </Suspense>
  );
}
