// GET /api/admin/families
//
// Returns all parents on the platform: waitlisted + approved, with child info and usage.
// Founder-only (ADMIN_EMAIL env var).
//
// Response: 200 { waitlisted: ParentRow[], approved: ParentRow[] }

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

type ParentRow = {
  id:           string;
  email:        string;
  name:         string | null;
  createdAt:    string;
  childEmail:   string | null;
  childName:    string | null;
  botUsed:      number;
  botLimit:     number;
  journeyTitle: string | null;
  missionsCompleted: number;
  missionsTotal:     number;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // 1. Waitlisted emails (not yet approved)
  const { data: waitlist } = await supabaseAdmin
    .from('parent_waitlist')
    .select('email, name, created_at')
    .order('created_at', { ascending: false });

  // 2. Approved parents (in authorized_parents)
  const { data: approvedRows } = await supabaseAdmin
    .from('authorized_parents')
    .select('email');

  const approvedEmails = new Set((approvedRows ?? []).map((r: any) => r.email.toLowerCase()));

  // 3. Parent users (role = 'parent' in users table)
  const { data: parentUsers } = await supabaseAdmin
    .from('users')
    .select('id, email, name, created_at, bot_conversations_used, bot_conversations_limit')
    .eq('role', 'parent')
    .order('created_at', { ascending: false });

  const parentIds = (parentUsers ?? []).map((p: any) => p.id);

  // 4. Parent-child links
  const { data: links } = await supabaseAdmin
    .from('parent_child_link')
    .select('parent_id, child_id')
    .in('parent_id', parentIds.length > 0 ? parentIds : ['__none__']);

  const childIdByParent = new Map((links ?? []).map((l: any) => [l.parent_id, l.child_id]));

  // 5. Child user metadata from Auth — parallel to avoid serial N requests
  const childIds = Array.from(childIdByParent.values());
  const childMetaMap = new Map<string, { email: string; name: string }>();
  await Promise.all(
    childIds.map(async (childId) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(childId);
      if (data.user) {
        childMetaMap.set(childId, {
          email: data.user.email ?? '',
          name:  data.user.user_metadata?.full_name ?? '',
        });
      }
    }),
  );

  // 6. Family classes
  const { data: familyClasses } = await supabaseAdmin
    .from('classes')
    .select('id, teacher_id, title, journey_id')
    .eq('type', 'family')
    .in('teacher_id', parentIds.length > 0 ? parentIds : ['__none__']);

  const classIdByParent = new Map((familyClasses ?? []).map((c: any) => [c.teacher_id, c]));

  // 7. Mission state counts
  const classIds = (familyClasses ?? []).map((c: any) => c.id);
  const { data: missionStates } = await supabaseAdmin
    .from('class_mission_state')
    .select('class_id, state')
    .in('class_id', classIds.length > 0 ? classIds : ['__none__']);

  const statesByClass = new Map<string, string[]>();
  for (const s of missionStates ?? []) {
    const list = statesByClass.get(s.class_id) ?? [];
    list.push(s.state);
    statesByClass.set(s.class_id, list);
  }

  const approved: ParentRow[] = (parentUsers ?? []).map((p: any) => {
    const childId = childIdByParent.get(p.id) ?? null;
    const childMeta = childId ? childMetaMap.get(childId) : null;
    const familyClass = classIdByParent.get(p.id) ?? null;
    const states = familyClass ? (statesByClass.get(familyClass.id) ?? []) : [];

    return {
      id:           p.id,
      email:        p.email,
      name:         p.name,
      createdAt:    p.created_at,
      childEmail:   childMeta?.email ?? null,
      childName:    childMeta?.name ?? null,
      botUsed:      p.bot_conversations_used ?? 0,
      botLimit:     p.bot_conversations_limit ?? 150,
      journeyTitle: familyClass?.title ?? null,
      missionsCompleted: states.filter(s => s === 'completed').length,
      missionsTotal:     states.length,
    };
  });

  const waitlisted = (waitlist ?? []).map((w: any) => ({
    id:           '',
    email:        w.email,
    name:         w.name ?? null,
    createdAt:    w.created_at,
    childEmail:   null,
    childName:    null,
    botUsed:      0,
    botLimit:     0,
    journeyTitle: null,
    missionsCompleted: 0,
    missionsTotal:     0,
  }));

  return NextResponse.json({ waitlisted, approved });
}
