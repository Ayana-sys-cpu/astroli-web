import { redirect } from 'next/navigation';
import { createSSRServerClient } from '@/lib/supabase-server';
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
    <div data-theme="light" style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #EEF2FF 0%, #F5F0FF 55%, #F0FDF9 100%)', backgroundAttachment: 'fixed', color: '#1a1a2e', display: 'flex', position: 'relative' }}>
      <Sidebar journeys={journeys} />
      <main style={{ flex: 1, minHeight: '100vh', position: 'relative', zIndex: 10 }}>
        {children}
      </main>
    </div>
  );
}
