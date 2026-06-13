import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSSRServerClient } from '@/lib/supabase-server';
import StartClassCTA from '@/components/teacher/homescreen/StartClassCTA';
import StudentSpotlight from '@/components/teacher/homescreen/StudentSpotlight';
import ClassPicture from '@/components/teacher/homescreen/ClassPicture';
import type { SpotlightStudent, ClassInsight } from '@/app/api/teacher/homescreen/route';

interface HomescreenData {
  journeys: { id: string; title: string }[];
  spotlight: SpotlightStudent[];
  classPicture: ClassInsight[];
}

async function getHomescreenData(cookieHeader: string): Promise<HomescreenData> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';
  const res = await fetch(`${base}/api/teacher/homescreen`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) return { journeys: [], spotlight: [], classPicture: [] };
  return res.json();
}

export default async function TeacherHomepage() {
  const supabase = createSSRServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const cookieHeader = cookies().toString();
  const data = await getHomescreenData(cookieHeader);

  const primaryJourneyId = data.journeys[0]?.id ?? '';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Zone 1 — Start Class */}
      <StartClassCTA journeys={data.journeys} />

      {/* Zone 2 — Student Spotlight */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 13, fontFamily: 'var(--font-space)', fontWeight: 700, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.12em' }}>
            STUDENT SPOTLIGHT
          </h2>
          <div style={{ flex: 1, height: 1, background: 'rgba(26,26,46,0.08)' }} />
        </div>
        <StudentSpotlight students={data.spotlight} journeyId={primaryJourneyId} />
      </section>

      {/* Zone 3 — Class Picture */}
      {data.classPicture.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 13, fontFamily: 'var(--font-space)', fontWeight: 700, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.12em' }}>
              CLASS PICTURE
            </h2>
            <div style={{ flex: 1, height: 1, background: 'rgba(26,26,46,0.08)' }} />
          </div>
          <ClassPicture insights={data.classPicture} />
        </section>
      )}

    </div>
  );
}
