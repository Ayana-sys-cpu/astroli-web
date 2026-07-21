import { redirect } from 'next/navigation';

// The 3-slide preview tour that lived here now renders inside the onboarding
// flow itself (app/parent/onboarding/WelcomeTour.tsx) so login-routing changes
// can never orphan it again. Old links land on the flow, which shows the tour
// to brand-new parents anyway.
export default function ParentWelcomeRedirect() {
  redirect('/parent/onboarding');
}
