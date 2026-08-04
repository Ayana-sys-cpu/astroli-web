import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { askOrin, type DiveTurn, type QuizContext, type Segment } from '@/lib/orin-dive';
import { loadDiveSource } from '@/lib/dive-source';
import { awardCoins } from '@/lib/coin-service';

export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 1000;
const COINS_PER_CORRECT_QUESTIONS = 3;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const wantsQuiz = body?.action === 'quiz';
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  const { data: session } = await supabaseAdmin
    .from('master_dive_sessions')
    .select('id, topic, edit_id, quiz_active, quiz_answered_count, quiz_correct_count, quiz_rewarded_at')
    .eq('id', params.id)
    .eq('student_id', studentId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: history } = await supabaseAdmin
    .from('master_dive_messages')
    .select('role, segments')
    .eq('session_id', session.id)
    .order('seq', { ascending: true });

  const studentSegments: Segment[] = [{ type: 'text', text: text.slice(0, MAX_MESSAGE_LENGTH) }];

  const { error: insertError } = await supabaseAdmin
    .from('master_dive_messages')
    .insert({ session_id: session.id, role: 'student', segments: studentSegments });
  if (insertError) {
    return NextResponse.json({ error: 'Could not send that' }, { status: 500 });
  }

  const turns: DiveTurn[] = [
    ...((history ?? []) as DiveTurn[]),
    { role: 'student', segments: studentSegments },
  ];

  // ── Quiz state machine ────────────────────────────────────────────────────
  // The quiz is server-owned: the client only ever says "quiz please" and the
  // model only ever reports verdicts. Counting, capping and coins live here.
  let quizContext: QuizContext | null = null;
  if (wantsQuiz && !session.quiz_active) {
    await supabaseAdmin
      .from('master_dive_sessions')
      .update({ quiz_active: true, quiz_answered_count: 0, quiz_correct_count: 0 })
      .eq('id', session.id);
    quizContext = {
      answered: 0,
      correctSoFar: 0,
      alreadyRewarded: session.quiz_rewarded_at != null,
    };
  } else if (session.quiz_active) {
    // While the quiz runs, every student message answers the open question.
    quizContext = {
      answered: Math.min((session.quiz_answered_count ?? 0) + 1, 3),
      correctSoFar: session.quiz_correct_count ?? 0,
      alreadyRewarded: session.quiz_rewarded_at != null,
    };
  }

  const source = await loadDiveSource(session.edit_id);
  const reply = await askOrin({
    topic: session.topic,
    history: turns,
    source: source?.edit ?? null,
    quiz: quizContext,
  });
  if (!reply) {
    return NextResponse.json({ error: 'orin_recharging' }, { status: 503 });
  }

  await supabaseAdmin
    .from('master_dive_messages')
    .insert({ session_id: session.id, role: 'orin', segments: reply.segments });

  // ── Verdict counting and the payout ───────────────────────────────────────
  console.log('[dive-quiz]', JSON.stringify({ sid: session.id, wantsQuiz, active: session.quiz_active, ctx: quizContext, modelQuiz: reply.quiz }));
  let reward: { amount: number; correct: number; total: number; newBalance: number } | null = null;
  if (quizContext) {
    let correct = quizContext.correctSoFar + (reply.quiz?.verdict === 'correct' ? 1 : 0);

    if (reply.quiz?.done) {
      let newBalance = 0;
      let amount = 0;
      if (!session.quiz_rewarded_at && correct > 0) {
        // One awardCoins call per correct answer — the reward log's
        // (event, mission) dedupe key makes each grant idempotent forever.
        for (let i = 0; i < Math.min(correct, COINS_PER_CORRECT_QUESTIONS); i++) {
          const result = await awardCoins(supabaseAdmin, studentId, 'dive_quiz', `${session.id}:q${i + 1}`);
          amount += result.amount;
          newBalance = result.newBalance;
        }
      }
      await supabaseAdmin
        .from('master_dive_sessions')
        .update({
          quiz_active: false,
          quiz_correct_count: 0,
          ...(amount > 0 ? { quiz_rewarded_at: new Date().toISOString() } : {}),
        })
        .eq('id', session.id);
      if (amount > 0) {
        reward = { amount, correct, total: COINS_PER_CORRECT_QUESTIONS, newBalance };
      }
    } else {
      await supabaseAdmin
        .from('master_dive_sessions')
        .update({ quiz_correct_count: correct, quiz_answered_count: quizContext.answered })
        .eq('id', session.id);
    }
  }

  await supabaseAdmin
    .from('master_dive_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', session.id);

  return NextResponse.json({ reply: { segments: reply.segments }, reward });
}
