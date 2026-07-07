// GET /api/parent/dashboard
//
// Returns the parent's dashboard data: child info, family class, mission progress,
// and bot usage stats.
//
// Response: 200 { child, familyClass, botUsage }
//           401 — no session
//           403 — not a parent session

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId, getParentContext } from '@/lib/parent-auth';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const { childId, familyClass } = await getParentContext(parentId);

  // Fetch parent's bot usage
  const { data: parentUser } = await supabaseAdmin
    .from('users')
    .select('bot_conversations_used, bot_conversations_limit, bot_cap_reset_at')
    .eq('id', parentId)
    .single();

  let child = null;
  let missionProgress = null;

  if (childId) {
    // Fetch child's name
    const { data: childUser } = await supabaseAdmin.auth.admin.getUserById(childId);
    const childName = childUser.user?.user_metadata?.full_name ?? childUser.user?.email ?? 'Your child';

    child = { id: childId, name: childName };

    // Fetch mission progress if there's a family class
    if (familyClass) {
      const { data: missionStates } = await supabaseAdmin
        .from('class_mission_state')
        .select('mission_id, state')
        .eq('class_id', familyClass.id);

      const total     = (missionStates ?? []).length;
      const completed = (missionStates ?? []).filter((s: any) => s.state === 'completed').length;
      const active    = (missionStates ?? []).find((s: any) => s.state === 'active');

      let activeMissionTitle: string | null = null;
      if (active) {
        const { data: mission } = await supabaseAdmin
          .from('missions')
          .select('question, project_title')
          .eq('id', active.mission_id)
          .maybeSingle();
        activeMissionTitle = mission?.question ?? mission?.project_title ?? null;
      }

      missionProgress = {
        total,
        completed,
        activeMissionId:    active?.mission_id ?? null,
        activeMissionTitle,
      };
    }
  }

  return NextResponse.json({
    child,
    familyClass: familyClass
      ? { id: familyClass.id, title: familyClass.title, journeyId: familyClass.journey_id }
      : null,
    missionProgress,
    botUsage: {
      used:    parentUser?.bot_conversations_used ?? 0,
      limit:   parentUser?.bot_conversations_limit ?? 50,
      resetsAt: parentUser?.bot_cap_reset_at ?? null,
    },
  });
}
