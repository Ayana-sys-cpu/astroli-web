import { redirect } from 'next/navigation';
import { createSSRServerClient, supabaseAdmin } from '@/lib/supabase-server';
import { resolveParentId, getParentContext } from '@/lib/parent-auth';
import ParentSidebar from '@/components/parent/ParentSidebar';

export default async function ParentAppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSSRServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const parentId = resolveParentId(user);
  if (!parentId) redirect('/');

  const { childId, familyClass } = await getParentContext(parentId);

  // If the parent has neither a linked child nor a family class, they haven't
  // started onboarding — send them back to begin.
  if (!childId && !familyClass) {
    redirect('/parent/onboarding');
  }

  const [childAuthResult, { data: familyClasses }] = await Promise.all([
    childId ? supabaseAdmin.auth.admin.getUserById(childId) : Promise.resolve({ data: { user: null } }),
    supabaseAdmin
      .from('classes')
      .select('id, title')
      .eq('teacher_id', parentId)
      .eq('type', 'family')
      .order('created_at', { ascending: true }),
  ]);

  const childAuthUser = (childAuthResult as { data: { user: { user_metadata?: Record<string, unknown>; email?: string } | null } }).data.user;
  const childName = childAuthUser
    ? ((childAuthUser.user_metadata?.full_name as string | undefined) ?? (childAuthUser.email as string | undefined) ?? null)
    : null;

  const journeys = (familyClasses ?? []).map((c: { id: string; title: string }) => ({
    id: c.id,
    title: c.title,
  }));

  return (
    <div data-theme="light" style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #EEF2FF 0%, #F5F0FF 55%, #F0FDF9 100%)', backgroundAttachment: 'fixed', color: '#1a1a2e', display: 'flex', position: 'relative' }}>
      <ParentSidebar childName={childName} childId={childId} journeys={journeys} />
      <main style={{ flex: 1, minHeight: '100vh', position: 'relative', zIndex: 10 }}>
        {children}
      </main>
    </div>
  );
}
