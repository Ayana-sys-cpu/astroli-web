// GET /api/parent/dashboard
//
// Returns the parent's dashboard data: child info, family class, mission progress,
// bot usage stats, onboarding setup state, and this week's child signals.
//
// Response: 200 { child, familyClass, missionProgress, botUsage, setupState, weeklySignals }
//           401 — no session
//           403 — not a parent session

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId, getParentContext } from '@/lib/parent-auth';
import { generateSignals } from '@/lib/signals';
import { getSignalCopy } from '@/lib/parent-signal-copy';
import { getConsentStatus } from '@/lib/consent';

const TEN_DAYS_AGO_MS = 10 * 24 * 60 * 60 * 1000;
const SIGNAL_ORDER = { breakthrough: 0, grace_completion: 1, stuck: 2, non_engagement: 3 } as const;

type SetupStep = 'no_child' | 'no_journey' | 'no_activity' | 'active';

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
  let hasStartedMission = false;
  let weeklySignals: {
    signalType: keyof typeof SIGNAL_ORDER;
    signalCreatedAt: string;
    headline: string;
    conversationStarter: string;
  }[] = [];

  if (childId) {
    // Fetch child's name + email — null (never a placeholder string) when nothing
    // is on file. childId is the app users.id, which is NOT the auth uid, so the
    // users row is the reliable source; auth metadata only adds the Google name
    // when the two ids happen to coincide.
    const [childRowRes, childAuthRes] = await Promise.all([
      supabaseAdmin.from('users').select('email, full_name, first_name').eq('id', childId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(childId),
    ]);
    const childRow = childRowRes.data as { email: string | null; full_name: string | null; first_name: string | null } | null;
    const authUser = childAuthRes.data.user;
    const childName =
      authUser?.user_metadata?.full_name
      ?? childRow?.full_name
      ?? childRow?.first_name
      ?? childRow?.email
      ?? authUser?.email
      ?? null;

    child = { id: childId, name: childName, email: childRow?.email ?? authUser?.email ?? null };

    // Fetch mission progress + this week's signals if there's a family class
    if (familyClass) {
      const [{ data: missionStates }, { data: missionRows }] = await Promise.all([
        supabaseAdmin
          .from('class_mission_state')
          .select('mission_id, state')
          .eq('class_id', familyClass.id),
        supabaseAdmin
          .from('missions')
          .select('id')
          .eq('journey_id', familyClass.journey_id),
      ]);

      const total     = (missionStates ?? []).length;
      const completed = (missionStates ?? []).filter((s: any) => s.state === 'completed').length;
      const active    = (missionStates ?? []).find((s: any) => s.state === 'active');

      // The parent sees the mission by the same name their child does — a Hebrew
      // class was showing its parent the English source columns, so a mother who
      // chose Hebrew was told her son was working on "The Element Dossier".
      const classLanguage: 'en' | 'he' = familyClass.language === 'he' ? 'he' : 'en';

      let activeMissionTitle: string | null = null;
      if (active) {
        const { data: mission } = await supabaseAdmin
          .from('missions')
          .select('question, project_title, translations')
          .eq('id', active.mission_id)
          .maybeSingle();
        const tx = classLanguage === 'he'
          ? (((mission?.translations as Record<string, any>) ?? {}).he ?? {})
          : {};
        activeMissionTitle =
          tx.question ?? tx.project_title ?? mission?.question ?? mission?.project_title ?? null;
      }

      missionProgress = {
        total,
        completed,
        activeMissionId:    active?.mission_id ?? null,
        activeMissionTitle,
      };

      const missionIds = (missionRows ?? []).map((m: { id: string }) => m.id);

      if (missionIds.length > 0) {
        const { data: startedRows } = await supabaseAdmin
          .from('mission_started_by_student')
          .select('mission_id')
          .eq('student_id', childId)
          .in('mission_id', missionIds)
          .limit(1);

        hasStartedMission = (startedRows ?? []).length > 0;
      }

      if (hasStartedMission) {
        const rawSignals = await generateSignals(familyClass.journey_id, null, missionIds);
        const tenDaysAgo = new Date(Date.now() - TEN_DAYS_AGO_MS);
        const displayName = childName ?? 'your child';

        weeklySignals = rawSignals
          .filter(s => s.studentId === childId && s.signalCreatedAt > tenDaysAgo)
          .sort((a, b) => SIGNAL_ORDER[a.signalType] - SIGNAL_ORDER[b.signalType])
          .map(s => {
            const copy = getSignalCopy(s.signalType);
            return {
              signalType: s.signalType,
              signalCreatedAt: s.signalCreatedAt.toISOString(),
              headline: copy.headline(displayName, activeMissionTitle),
              conversationStarter: copy.conversationStarter(displayName, activeMissionTitle),
            };
          });
      }
    }
  }

  const setupState = buildSetupState({ hasChild: !!childId, familyClass, hasStartedMission });

  // Consent status drives the onboarding consent step + existing-parent back-fill
  // (a parent from before this feature, or after a policy version bump, is routed
  // to re-consent and their child's AI is blocked until they do).
  const consentStatus = await getConsentStatus(parentId);

  // Pending invite — only relevant while the child hasn't linked yet. Powers the
  // dashboard empty state's "sent to <email> · resend" card.
  let pendingInvite: { childEmail: string; createdAt: string; expiresAt: string } | null = null;
  if (!childId) {
    const { data: invite } = await supabaseAdmin
      .from('child_invites')
      .select('child_email, created_at, expires_at')
      .eq('parent_id', parentId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invite) {
      pendingInvite = {
        childEmail: invite.child_email,
        createdAt:  invite.created_at,
        expiresAt:  invite.expires_at,
      };
    }
  }

  return NextResponse.json({
    child,
    familyClass: familyClass
      ? { id: familyClass.id, title: familyClass.title, journeyId: familyClass.journey_id }
      : null,
    pendingInvite,
    missionProgress,
    botUsage: {
      used:    parentUser?.bot_conversations_used ?? 0,
      limit:   parentUser?.bot_conversations_limit ?? 150,
      resetsAt: parentUser?.bot_cap_reset_at ?? null,
    },
    setupState,
    consentStatus,
    weeklySignals,
  });
}

function buildSetupState(args: {
  hasChild: boolean;
  familyClass: { id: string } | null;
  hasStartedMission: boolean;
}): { step: SetupStep; nextActionLabel: string | null; nextActionHref: string | null } {
  if (!args.hasChild) {
    return {
      step: 'no_child',
      nextActionLabel: "Set up your child's account",
      nextActionHref: '/parent/onboarding',
    };
  }
  if (!args.familyClass) {
    return {
      step: 'no_journey',
      nextActionLabel: 'Choose a journey',
      nextActionHref: '/parent/onboarding?step=journey',
    };
  }
  if (!args.hasStartedMission) {
    return { step: 'no_activity', nextActionLabel: null, nextActionHref: null };
  }
  return { step: 'active', nextActionLabel: null, nextActionHref: null };
}
