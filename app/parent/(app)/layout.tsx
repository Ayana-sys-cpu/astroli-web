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

  const { childId } = await getParentContext(parentId);
  if (!childId) {
    return (
      <div data-theme="light" style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #EEF2FF 0%, #F5F0FF 55%, #F0FDF9 100%)', backgroundAttachment: 'fixed', color: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 420, padding: '32px 28px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 10 }}>
            Account not linked yet
          </p>
          <p style={{ fontSize: 13, color: 'rgba(26,26,46,0.55)', lineHeight: 1.6 }}>
            Your account is registered but not yet linked to a child. Check your email for an invite link, or contact support.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: childAuthUser }, { data: familyClasses }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(childId),
    supabaseAdmin
      .from('classes')
      .select('id, title')
      .eq('teacher_id', parentId)
      .eq('type', 'family')
      .order('created_at', { ascending: true }),
  ]);

  const childName =
    (childAuthUser?.user?.user_metadata?.full_name as string | undefined) ??
    (childAuthUser?.user?.email as string | undefined) ??
    null;

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
