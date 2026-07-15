// GET /api/admin/students/[studentId]
//
// Per-student detail for the founder: profile block (same shape as the
// roster row), visit sessions, mission states per enrolled class, per-planet
// effort, and store activity. Founder-only (ADMIN_EMAIL).
// Contract: specs/founder/web-app/pilot-review-dashboard/contracts/admin-api.md

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { buildPilotRoster } from '@/lib/pilot-roster';
import { messageKeysFor } from '@/lib/student-message-keys';
import { sessionDurationMinutes } from '@/lib/activity-sessions';
import { CATALOGUE_BY_ID } from '@/lib/store-catalogue';

export async function GET(
  _req: NextRequest,
  { params }: { params: { studentId: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { studentId } = params;

  let profile;
  try {
    [profile] = await buildPilotRoster({ studentId });
  } catch (error) {
    console.error('[admin/students/detail] profile assembly failed', error);
    return NextResponse.json({ error: 'Profile assembly failed' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Bot-written tables (planet_session_state / planet_summaries) share the
  // messages keying history, so they go through the same two-key bridge.
  const { data: studentRow } = await supabaseAdmin
    .from('users')
    .select('id, auth_user_id')
    .eq('id', studentId)
    .maybeSingle();
  const bridgeKeys = studentRow ? messageKeysFor(studentRow) : [studentId];

  const [
    { data: sessionRows },
    { data: enrollmentRows },
    { data: missionStartRows },
    { data: planetStateRows },
    { data: planetSummaryRows },
    { data: balanceRow },
    { data: rewardRows },
    { data: inventoryRows },
  ] = await Promise.all([
    supabaseAdmin
      .from('student_activity_sessions')
      .select('id, platform, started_at, last_ping_at, source')
      .eq('student_id', studentId)
      .order('last_ping_at', { ascending: false })
      .limit(100),
    supabaseAdmin.from('student_classes').select('class_id').eq('student_id', studentId),
    supabaseAdmin.from('mission_started_by_student').select('mission_id').eq('student_id', studentId),
    supabaseAdmin
      .from('planet_session_state')
      .select('planet_id, session_count, total_time_minutes, last_message_at')
      .in('student_id', bridgeKeys.length > 0 ? bridgeKeys : [studentId]),
    supabaseAdmin
      .from('planet_summaries')
      .select('planet_id, completed_at, highest_perkins_level_demonstrated')
      .eq('student_id', studentId),
    supabaseAdmin.from('student_coin_balances').select('balance').eq('student_id', studentId).maybeSingle(),
    supabaseAdmin
      .from('coin_reward_log')
      .select('event_type, amount, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('student_inventory')
      .select('item_id, category, is_equipped, acquired_at')
      .eq('student_id', studentId),
  ]);

  // Missions per enrolled class (all states, not just active).
  const classIds = (enrollmentRows ?? []).map((row) => row.class_id as string);
  const startedMissionIds = new Set((missionStartRows ?? []).map((row) => row.mission_id as string));

  type MissionEntry = {
    classTitle:       string;
    classType:        'school' | 'family';
    missionTitle:     string;
    state:            string;
    startedByStudent: boolean;
  };
  let missions: MissionEntry[] = [];
  if (classIds.length > 0) {
    const [{ data: classRows }, { data: missionStateRows }] = await Promise.all([
      supabaseAdmin.from('classes').select('id, title, type').in('id', classIds),
      supabaseAdmin.from('class_mission_state').select('class_id, mission_id, state').in('class_id', classIds),
    ]);
    const missionIds = Array.from(new Set((missionStateRows ?? []).map((row) => row.mission_id as string)));
    const missionTitleById = new Map<string, string>();
    if (missionIds.length > 0) {
      const { data: missionRows } = await supabaseAdmin
        .from('missions')
        .select('id, question')
        .in('id', missionIds);
      for (const mission of missionRows ?? []) {
        missionTitleById.set(mission.id as string, mission.question as string);
      }
    }
    const classInfoById = new Map(
      (classRows ?? []).map((c) => [c.id as string, { title: c.title as string, type: (c.type ?? 'school') as 'school' | 'family' }]),
    );
    missions = (missionStateRows ?? []).map((row) => {
      const classInfo = classInfoById.get(row.class_id as string);
      return {
        classTitle:       classInfo?.title ?? 'Class',
        classType:        classInfo?.type ?? 'school',
        missionTitle:     missionTitleById.get(row.mission_id as string) ?? 'Mission',
        state:            row.state as string,
        startedByStudent: startedMissionIds.has(row.mission_id as string),
      };
    });
  }

  // Per-planet effort: live session state + frozen completion summaries.
  const touchedPlanetIds = Array.from(
    new Set([
      ...(planetStateRows ?? []).map((row) => row.planet_id as string),
      ...(planetSummaryRows ?? []).map((row) => row.planet_id as string),
    ]),
  );
  const planetTitleById = new Map<string, string>();
  if (touchedPlanetIds.length > 0) {
    const { data: planetRows } = await supabaseAdmin
      .from('planets')
      .select('id, title')
      .in('id', touchedPlanetIds);
    for (const planet of planetRows ?? []) {
      planetTitleById.set(planet.id as string, planet.title as string);
    }
  }
  const summaryByPlanetId = new Map(
    (planetSummaryRows ?? []).map((row) => [row.planet_id as string, row]),
  );
  const planetEffort = touchedPlanetIds.map((planetId) => {
    const state = (planetStateRows ?? []).find((row) => row.planet_id === planetId);
    const summary = summaryByPlanetId.get(planetId);
    return {
      planetTitle:      planetTitleById.get(planetId) ?? 'Planet',
      sessionCount:     (state?.session_count as number | undefined) ?? 0,
      totalTimeMinutes: Math.round(((state?.total_time_minutes as number | undefined) ?? 0) * 10) / 10,
      lastMessageAt:    (state?.last_message_at as string | undefined) ?? null,
      completedAt:      (summary?.completed_at as string | undefined) ?? null,
      perkinsLevel:     (summary?.highest_perkins_level_demonstrated as number | undefined) ?? null,
    };
  });

  return NextResponse.json({
    student: {
      profile,
      sessions: (sessionRows ?? []).map((row) => ({
        id:              row.id as string,
        platform:        row.platform as 'web' | 'mobile' | 'bot',
        startedAt:       row.started_at as string,
        lastPingAt:      row.last_ping_at as string,
        durationMinutes: sessionDurationMinutes({
          started_at:   row.started_at as string,
          last_ping_at: row.last_ping_at as string,
        }),
        approximate:     row.source === 'backfill',
      })),
      missions,
      planetEffort,
      store: {
        balance: (balanceRow?.balance as number | undefined) ?? 0,
        rewards: (rewardRows ?? []).map((row) => ({
          eventType: row.event_type as string,
          amount:    row.amount as number,
          createdAt: row.created_at as string,
        })),
        inventory: (inventoryRows ?? []).map((row) => {
          const item = CATALOGUE_BY_ID[row.item_id as string];
          return {
            itemId:     row.item_id as string,
            name:       item?.name ?? (row.item_id as string),
            category:   item?.category ?? (row.category as string),
            equipped:   Boolean(row.is_equipped),
            acquiredAt: row.acquired_at as string,
          };
        }),
      },
    },
  });
}
