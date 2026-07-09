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
      <div data-theme="light" style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #EEF2FF 0%, #F5F0FF 55%, #F0FDF9 100%)', backgroundAttachment: 'fixed', color: '#1a1a2e', display: 'flex', position: 'relative' }}>
        <ParentSidebar childName={null} childId={parentId} />
        <main style={{ flex: 1, minHeight: '100vh', position: 'relative', zIndex: 10 }}>
          {children}
        </main>
      </div>
    );
  }

  const { data: childAuthUser } = await supabaseAdmin.auth.admin.getUserById(childId);
  const childName =
    (childAuthUser?.user?.user_metadata?.full_name as string | undefined) ??
    (childAuthUser?.user?.email as string | undefined) ??
    null;

  return (
    <div data-theme="light" style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #EEF2FF 0%, #F5F0FF 55%, #F0FDF9 100%)', backgroundAttachment: 'fixed', color: '#1a1a2e', display: 'flex', position: 'relative' }}>
      <ParentSidebar childName={childName} childId={childId} />
      <main style={{ flex: 1, minHeight: '100vh', position: 'relative', zIndex: 10 }}>
        {children}
      </main>
    </div>
  );
}
