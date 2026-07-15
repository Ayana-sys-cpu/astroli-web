// GET /api/parent/journeys
// Returns the parent's child's enrolled journeys in JourneyCardData shape.
// Response: 200 { journeys: JourneyCardData[] }
//
// POST /api/parent/journeys
// Enrolls the parent's child in a new journey (creates a family class).
// Allows multiple journeys per parent; rejects duplicate enrollment of the
// same journey template.
// Request:  { journeyId: string, language?: 'en' | 'he' }
// Response: 200 { ok: true, classId: string }
//           409 — child already enrolled in this journey template
//                 (code: 'child_already_enrolled')

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId, getParentContext } from '@/lib/parent-auth';
import {
  childAlreadyEnrolledOnTemplate,
  enrollChildInFamilyClass,
  enrollmentConflictResponse,
} from '@/lib/family-class';
import { deriveJourneyStatus } from '@/lib/journey-status';
import { z, parseBody } from '@/lib/validate';

const COVER_GRADIENTS = [
  { from: '#0d2137', mid: '#1e4d7a', accent: '#204060' },
  { from: '#140a30', mid: '#3d1f8a', accent: '#2a1560' },
  { from: '#0a1f12', mid: '#1a4a2e', accent: '#0d2018' },
  { from: '#2a0e0e', mid: '#6b1f1f', accent: '#3d1212' },
  { from: '#0e1a2a', mid: '#1f3a5a', accent: '#142035' },
  { from: '#1a0a30', mid: '#4a2070', accent: '#2a1050' },
];

function coverGradient(id: string) {
  const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const { childId } = await getParentContext(parentId);

  // Fetch family classes owned by this parent
  const { data: classes, error: classErr } = await supabaseAdmin
    .from('classes')
    .select(`
      id,
      title,
      journey_id,
      class_mission_state (mission_id, state),
      vote_sessions (id, ends_at, status)
    `)
    .eq('teacher_id', parentId)
    .eq('type', 'family')
    .order('created_at', { ascending: true });

  if (classErr) {
    console.error('[parent/journeys GET] fetch error:', classErr);
    return NextResponse.json({ error: classErr.message }, { status: 500 });
  }

  const journeys = (classes ?? []).map((c: any) => {
    const missions: { state: string }[] = Array.isArray(c.class_mission_state)
      ? c.class_mission_state
      : [];
    const openVote = Array.isArray(c.vote_sessions)
      ? c.vote_sessions.find((v: any) => v.status === 'open') ?? null
      : null;

    const status = deriveJourneyStatus(
      missions as any,
      openVote !== null,
    );

    const activeMission = missions.find((m: any) => m.state === 'active') as any ?? null;

    // Build statusNote
    let statusNote = '';
    if (status === 'live' && activeMission) {
      const idx = missions.findIndex((m: any) => m.state === 'active') + 1;
      statusNote = `Mission ${idx} of ${missions.length}`;
    } else if (status === 'done') {
      const finished = missions.filter((m: any) => m.state === 'completed' || m.state === 'skipped').length;
      statusNote = `${finished} of ${missions.length} missions`;
    } else if (status === 'voting') {
      statusNote = openVote?.ends_at
        ? `Closes in ${Math.max(0, Math.round((new Date(openVote.ends_at).getTime() - Date.now()) / 3_600_000))}h`
        : 'Voting open';
    }

    return {
      id: c.id,
      title: c.title as string,
      status,
      statusNote,
      voteEndsAt: openVote?.ends_at ? new Date(openVote.ends_at).toISOString() : null,
      studentCount: 1,
      attentionCount: 0,
      activeMissionQuestion: null,
      coverGradient: coverGradient(c.id),
    };
  });

  return NextResponse.json({ journeys });
}

// ── POST ─────────────────────────────────────────────────────────────────────

const EnrollSchema = z.object({
  journeyId: z.string().min(1, 'journeyId required'),
  language:  z.enum(['en', 'he']).default('en'),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const parsed = await parseBody(req, EnrollSchema);
  if (!parsed.ok) return parsed.response;
  const { journeyId, language } = parsed.data;

  const { childId } = await getParentContext(parentId);
  if (!childId) {
    return NextResponse.json({ error: 'No linked child — invite must be accepted first' }, { status: 403 });
  }

  // Verify journey template exists
  const { data: journey } = await supabaseAdmin
    .from('journeys')
    .select('id, title')
    .eq('id', journeyId)
    .maybeSingle();

  if (!journey) {
    return NextResponse.json({ error: 'Journey not found' }, { status: 422 });
  }

  // Reject duplicate enrollment for this specific template per child —
  // school and family classes can't coexist on one template.
  if (await childAlreadyEnrolledOnTemplate(childId, journeyId)) {
    return enrollmentConflictResponse();
  }

  // Create the family class
  const { data: newClass, error: classError } = await supabaseAdmin
    .from('classes')
    .insert({
      journey_id: journeyId,
      teacher_id: parentId,
      title:      journey.title,
      type:       'family',
      language,
    })
    .select('id')
    .single();

  if (classError || !newClass) {
    console.error('[parent/journeys POST] insert class error:', classError);
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }

  // Enroll child
  const enrolled = await enrollChildInFamilyClass({
    childId,
    classId:           newClass.id,
    templateJourneyId: journeyId,
  });

  if (!enrolled.ok) {
    return enrolled.conflict
      ? enrollmentConflictResponse()
      : NextResponse.json({ error: 'Failed to enroll child' }, { status: 500 });
  }

  // Seed class_mission_state (all locked)
  const { data: missions } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('journey_id', journeyId);

  if (missions && missions.length > 0) {
    await supabaseAdmin
      .from('class_mission_state')
      .upsert(
        missions.map((m: { id: string }) => ({ class_id: newClass.id, mission_id: m.id, state: 'locked' })),
        { onConflict: 'class_id,mission_id', ignoreDuplicates: true },
      );
  }

  return NextResponse.json({ ok: true, classId: newClass.id });
}
