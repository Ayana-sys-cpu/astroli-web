import { Suspense } from 'react';
import AcceptInviteContent from './AcceptInviteContent';

export default function AcceptInvitePage() {
  return <Suspense fallback={null}><AcceptInviteContent /></Suspense>;
}
