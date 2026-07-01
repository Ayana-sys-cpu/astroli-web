import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { z, parseBody } from '@/lib/validate';
import { awardCoins, VALID_EVENT_TYPES } from '@/lib/coin-service';
import type { EventType } from '@/lib/coin-service';

const AwardSchema = z.object({
  eventType: z.string().trim().min(1),
  missionId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = await parseBody(req, AwardSchema);
  if (!parsed.ok) return parsed.response;
  const { eventType: rawEventType, missionId } = parsed.data;

  if (!VALID_EVENT_TYPES.includes(rawEventType as EventType)) {
    return NextResponse.json({ error: 'invalid_event_type' }, { status: 400 });
  }
  const eventType = rawEventType as EventType;

  const result = await awardCoins(
    supabaseAdmin,
    studentId,
    eventType,
    missionId ?? null,
  );

  return NextResponse.json({ ...result, eventType });
}
