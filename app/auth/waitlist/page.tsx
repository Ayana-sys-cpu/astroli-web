'use client';

export default function WaitlistPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">You&apos;re on the list</h1>
        <p className="text-muted-foreground">
          Astroli is currently in limited early access. We&apos;ve noted your
          interest and will reach out when a spot opens up.
        </p>
        <p className="text-sm text-muted-foreground">
          Already have access?{' '}
          <a href="/" className="underline underline-offset-4">
            Sign in again
          </a>
        </p>
      </div>
    </main>
  );
}
