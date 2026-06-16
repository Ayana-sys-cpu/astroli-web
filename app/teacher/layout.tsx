import { redirect } from 'next/navigation';
import { createSSRServerClient } from '@/lib/supabase-server';
import Sidebar from '@/components/teacher/Sidebar';
import { prisma } from '@/lib/prisma';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSSRServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== 'teacher') {
    redirect('/');
  }

  const teacherId = user.user_metadata?.teacher_id as string | undefined;

  // Journey fetch is independent of further auth work — start it immediately
  // after we have the teacherId rather than waiting for any downstream logic.
  // Sidebar shows classes (teacher instances), not curriculum templates —
  // see docs/architecture/2026-06-16-journeys-classes-redesign.md.
  const journeys = teacherId
    ? await prisma.class.findMany({
        where: { teacherId },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      })
    : [];

  return (
    <div data-theme="light" style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #EEF2FF 0%, #F5F0FF 55%, #F0FDF9 100%)', backgroundAttachment: 'fixed', color: '#1a1a2e', display: 'flex', position: 'relative' }}>
      <Sidebar journeys={journeys} />
      <main style={{ flex: 1, minHeight: '100vh', position: 'relative', zIndex: 10 }}>
        {children}
      </main>
    </div>
  );
}
