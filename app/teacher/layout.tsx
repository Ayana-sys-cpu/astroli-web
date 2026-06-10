import { redirect } from 'next/navigation';
import { createSSRServerClient } from '@/lib/supabase-server';
import StarField from '@/components/StarField';
import Sidebar from '@/components/teacher/Sidebar';
import { prisma } from '@/lib/prisma';

async function getTeacherJourneys(teacherId: string) {
  return prisma.journey.findMany({
    where: { teacherId },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });
}

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSSRServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'teacher') {
    redirect('/');
  }

  const teacherId = user.user_metadata?.teacher_id as string | undefined;
  const journeys = teacherId ? await getTeacherJourneys(teacherId) : [];

  return (
    <div style={{ minHeight: '100vh', background: '#07070D', color: '#E8E8F0', display: 'flex', position: 'relative' }}>
      <StarField count={80} />
      <Sidebar journeys={journeys} />
      <main style={{ flex: 1, minHeight: '100vh', position: 'relative', zIndex: 10 }}>
        {children}
      </main>
    </div>
  );
}
