'use client';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

function buildFrames(childName: string, journeyTitle: string) {
  return [
    {
      num: '01',
      label: 'Invite arrives',
      copy: `${childName} gets an email, clicks it, and signs in with Google`,
    },
    {
      num: '02',
      label: 'Their journey appears',
      copy: `They see the ${journeyTitle} you chose for them`,
    },
    {
      num: '03',
      label: 'They pick a mission',
      copy: 'They decide which big idea to explore first — on their own',
    },
    {
      num: '04',
      label: 'Their AI guide begins',
      copy: 'Planet 1 starts — their companion asks the first question',
    },
  ];
}

export default function ParentRevealPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const childName    = searchParams.get('childName')    || 'your child';
  const journeyTitle = searchParams.get('journeyTitle') || 'the journey you chose';
  const frames       = buildFrames(childName, journeyTitle);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Here&apos;s what {childName}&apos;s first session will look like
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            You&apos;ve done everything. Now it&apos;s their turn.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {frames.map(frame => (
            <div key={frame.num} className="rounded-md border p-4 space-y-1">
              <span className="text-xs text-muted-foreground font-mono">{frame.num}</span>
              <p className="text-sm font-medium">{frame.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{frame.copy}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/parent/dashboard')}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go to your parent dashboard
        </button>
      </div>
    </main>
  );
}
