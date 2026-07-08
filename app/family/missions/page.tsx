import { Suspense } from 'react';
import FamilyMissionsContent from './MissionsContent';

export default function FamilyMissionsPage() {
  return <Suspense fallback={null}><FamilyMissionsContent /></Suspense>;
}
