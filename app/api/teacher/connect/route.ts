// =============================================================================
// /api/teacher/connect
//
// POST { courses: { id: string; name: string }[] }
//
// The teacher is already in Supabase by the time this is called — the
// identify route upserts the teacher row during sign-in.
// This route only handles the course → journey step:
//
//   For each course:
//     1. Upsert a journey row (keyed by google_course_id — safe to re-call).
//     2. If the journey is brand new (no missions yet), seed it with the
//        3 hardcoded missions and all 16 hardcoded plants automatically.
//
// Returns the first journey's id as journeyId (matches existing contract).
//
// teacherId is taken from the session — the body's teacherId field is ignored.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { HARDCODED_MISSIONS } from '@/lib/hardcoded-missions';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { z, parseBody } from '@/lib/validate';
import type { WorldBriefItem } from '@/lib/pip-mission-types';

// ── Pip-guide metadata: icons, hints, Q&A — written to DB on every seed ───────
// Editing these constants changes what new journeys get. To update existing
// journeys, edit the rows directly in Supabase dashboard.

const PLANET_META: Record<string, { icon: string; hint: string }> = {
  Church:     { icon: '⛪', hint: 'Spiritual power & excommunication' },
  Canossa:    { icon: '🏰', hint: 'The humiliation at the castle gates' },
  Ashkenaz:   { icon: '✡',  hint: 'Jewish self-governance in exile' },
  Babylonia:  { icon: '📜', hint: 'Law across borders, without power' },
  Rome:       { icon: '🏛', hint: 'The collapse that made feudalism' },
  Hierarchy:  { icon: '👑', hint: 'Oaths, lords, and vassals' },
  Orders:     { icon: '⚔️', hint: 'Those who pray, fight, and work' },
  Serfdom:    { icon: '🌾', hint: 'Life bound to the manor' },
  Cities:     { icon: '🏙', hint: 'Guilds, universities, and freedom' },
  Toleration: { icon: '✝',  hint: 'Official tolerance vs. mob violence' },
  Islam:      { icon: '☽',  hint: 'The faith and the People of the Book' },
  Jihad:      { icon: '⚔️', hint: 'The theology of struggle' },
  Dhimmi:     { icon: '📖', hint: 'Protected but subordinate' },
  Baghdad:    { icon: '✨', hint: 'The golden age of Islamic scholarship' },
  Crusades:   { icon: '🗡',  hint: 'Rhineland massacres to Jerusalem' },
  Jerusalem:  { icon: '🕍', hint: '200 years of complicated coexistence' },
};

const CHAPTER_LABELS: Record<number, string> = {
  1: 'Medieval History · Ch.1',
  2: 'Medieval History · Ch.2',
  3: 'Medieval History · Ch.3',
};

const OPENING_MESSAGE_2: Record<number, string> = {
  1: 'Before you weigh in, do you want context on the world they lived in?',
  2: 'Before you dive in, want a quick read on the world these people were living in?',
  3: 'Before you explore, do you want context on the world that made these events possible?',
};

const WORLD_BRIEF_SUMMARY: Record<number, string> = {
  1: 'Two leaders, one claim of divine authority…',
  2: 'A world built on sworn oaths and sacred duty…',
  3: 'Three faiths, one holy land, centuries of entanglement…',
};

const WORLD_BRIEF_ITEMS: Record<number, WorldBriefItem[]> = {
  1: [
    {
      title: 'THE OFFICIAL TRUTH',
      body:  'In the Middle Ages, <strong>"truth" was not a personal opinion</strong> — it was an official position, guarded and declared by powerful institutions, not individuals.',
    },
    {
      title: 'TWO COMPETING CLAIMS',
      body:  '<strong>The Church</strong> controlled spiritual legitimacy — your soul, your afterlife. <strong>The Emperor</strong> controlled armies and land. Both needed the other to survive.',
    },
    {
      title: 'THE REAL QUESTION',
      body:  'When two institutions <strong>both claim divine authority</strong>, who can actually enforce it? And what happens to everyone caught in between?',
    },
  ],
  2: [
    {
      title: 'THE FEUDAL BARGAIN',
      body:  'In a world without police or standing armies, <strong>protection cost everything</strong> — your freedom, your land, your loyalty. The feudal system was a contract written in survival.',
    },
    {
      title: 'THREE ORDERS, ONE TRUTH',
      body:  "<strong>Those who pray, those who fight, those who work</strong> — medieval society divided humanity into sacred roles. To question your order was to question God's design.",
    },
    {
      title: 'THE CRACK IN THE SYSTEM',
      body:  'When cities began offering <strong>a different kind of security</strong> — through guilds, markets, and community — the feudal bargain started to come apart at the seams.',
    },
  ],
  3: [
    {
      title: 'A WORLD OF BOUNDARIES',
      body:  'In the medieval Islamic world, <strong>faith determined your legal status</strong> — not your nationality. The Dhimmi system offered protection at the price of permanent second-class standing.',
    },
    {
      title: 'THE GOLDEN AGE',
      body:  '<strong>Algebra, medicine, and preserved philosophy</strong> flowed out of Baghdad while Europe was rebuilding from Roman collapse. The "clash of civilisations" story hides how much they built together.',
    },
    {
      title: 'WHEN BELIEF BECOMES VIOLENCE',
      body:  'The Crusades reveal an uncomfortable truth: <strong>sincere religious conviction and mass atrocity can coexist</strong>. The Rhineland massacres happened before the Crusaders reached Jerusalem.',
    },
  ],
};

const QA_ANSWERS: Record<number, string[]> = {
  1: [
    "The Pope's real power was the threat of excommunication — being cut off from heaven itself. In a world where almost everyone believed that was real, no army could match that leverage.",
    "Good instinct. The Emperor had soldiers, but soldiers couldn't fight what people believed. When Gregory excommunicated Henry IV, his own nobles abandoned him — because their oaths were suddenly invalidated by God's representative.",
    "Think of it this way: this wasn't really a fight about soldiers or land. It was about who got to define what was true and legitimate. In a deeply religious world, that question cut to the core of everything.",
  ],
  2: [
    "The feudal bargain made sense precisely because the danger was real — Viking raids, no police, no army to call. People genuinely needed someone with walls and weapons. The question your mission asks is whether the price they paid was fair.",
    "Exactly — the Three Orders ideology was essentially a religious justification for the status quo. If God designed your position in society, questioning it becomes not just rebellious but sinful. That's powerful social control.",
    "Cities cracked the feudal model open. They offered a different kind of security — through guilds and community — without demanding total surrender of freedom. But they came with their own trade-offs worth exploring.",
  ],
  3: [
    "The Dhimmi system is worth sitting with. Jewish communities were genuinely protected under Islamic rule — often better than under Christian rulers. But that protection came with explicit subordination. Both things are true at once.",
    "The Crusades reveal something uncomfortable: sincere religious belief and moral atrocity can coexist. The Rhineland massacres happened before the Crusaders even reached Jerusalem — by people who genuinely thought they were doing God's work.",
    "The Golden Age of Baghdad gets left out of most Western history stories. But algebra, advanced medicine, and preserved Aristotle all came through Islamic scholars. The 'clash of civilisations' narrative hides how much they built together.",
  ],
};

const MISSION_QA_ANSWERS: Record<number, string[]> = {
  1: [
    "The project asks you to act as a mediator — your job isn't to pick a winner, but to show why both sides genuinely believed they were right. The strongest arguments acknowledge what each side was actually protecting.",
    "You'll be building a written argument, so focus on collecting specific quotes and evidence as you explore each planet. Save anything that explains *why* someone acted the way they did — motive is everything in this mission.",
    "Don't worry about covering every planet — pick the ones that feel most relevant to the question and go deep. Two or three well-explored planets will give you more to work with than a rushed visit to all of them.",
  ],
  2: [
    "Your project asks whether the feudal bargain was fair — not just whether it worked. You're not looking for a verdict, you're building a case that shows the trade-offs clearly from multiple perspectives.",
    "The strongest arguments will acknowledge that people at the time didn't experience this as oppression — they experienced it as order, safety, and God's plan. Understanding *their* logic is what makes your argument compelling.",
    "Concentrate on the planets that show contrast — serfdom vs. cities, for example. That tension is where your most interesting evidence will come from.",
  ],
  3: [
    "This mission asks you to hold complexity without resolving it too quickly. Protection and subordination coexisted. Religious conviction and violence coexisted. Your project is about showing *how*, not just *whether*.",
    "The best evidence will come from the moments of contact — where the three faiths actually interacted, traded, debated, or clashed. Focus less on doctrine, more on what people actually did to each other.",
    "You don't need to take a side. The most powerful arguments in this mission will be ones that resist the easy 'clash of civilisations' story and show the full, messy picture instead.",
  ],
};

const ConnectSchema = z.object({
  courses: z.array(
    z.object({
      id:      z.string().trim().min(1, 'Course id is required'),
      name:    z.string().trim().min(1, 'Course name is required'),
      section: z.string().nullable().optional(),
    }),
  ).min(1, 'At least one course is required'),
});

type Course = z.infer<typeof ConnectSchema>['courses'][number];

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  const parsed = await parseBody(req, ConnectSchema);
  if (!parsed.ok) return parsed.response;
  const { courses } = parsed.data;

  let firstJourneyId: string | null = null;

  for (const course of courses) {
    // ── Upsert journey ────────────────────────────────────────────────────────
    // onConflict: 'google_course_id' means re-connecting the same course is safe.
    const { data: journey, error: journeyError } = await supabaseAdmin
      .from('journeys')
      .upsert(
        { google_course_id: course.id, title: course.name, teacher_id: teacherId },
        { onConflict: 'google_course_id' },
      )
      .select('id')
      .single();

    if (journeyError || !journey) {
      console.error('[teacher/connect] upsert journey', course.id, journeyError);
      continue;
    }

    const journeyId = journey.id as string;
    if (!firstJourneyId) firstJourneyId = journeyId;

    // ── Seed if brand-new ─────────────────────────────────────────────────────
    // Count existing missions. If zero, this is a fresh journey — seed it.
    const { count } = await supabaseAdmin
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('journey_id', journeyId);

    if ((count ?? 0) === 0) {
      await seedJourney(journeyId, teacherId);
      console.log(`[teacher/connect] seeded journey ${journeyId} for course "${course.name}"`);
    }
  }

  if (!firstJourneyId) {
    return NextResponse.json({ error: 'Failed to create any journeys' }, { status: 500 });
  }

  // Match the exact response shape the frontend expects.
  return NextResponse.json({ ok: true, journeyId: firstJourneyId });
}

// -----------------------------------------------------------------------------
// seedJourney — inserts 3 hardcoded missions + all plants for a new journey.
// Runs missions one at a time (sequential) so the plants FK is always satisfied.
// -----------------------------------------------------------------------------
async function seedJourney(journeyId: string, teacherId: string): Promise<void> {
  for (const missionSeed of HARDCODED_MISSIONS) {
    const order        = missionSeed.mission_order;
    const q            = missionSeed.question;
    const missionBrief = q.length > 60 ? q.slice(0, 57) + '…' : q;

    const { data: mission, error: missionError } = await supabaseAdmin
      .from('missions')
      .insert({
        journey_id:           journeyId,
        mission_order:        order,
        question:             q,
        question_description: missionSeed.question_description,
        project_title:        missionSeed.project_title,
        project_description:  missionSeed.project_description,
        opening_message:      missionSeed.opening_message,
        // Pip-guide UI metadata — now stored in DB as single source of truth
        chapter:              CHAPTER_LABELS[order],
        mission_brief:        missionBrief,
        opening_message_2:    OPENING_MESSAGE_2[order],
        world_brief_summary:  WORLD_BRIEF_SUMMARY[order],
        world_brief_items:    WORLD_BRIEF_ITEMS[order],
        qa_answers:           QA_ANSWERS[order],
        mission_qa_answers:   MISSION_QA_ANSWERS[order],
        state:                'locked',
        source:               'HARDCODED',
        created_by:           teacherId,
      })
      .select('id')
      .single();

    if (missionError || !mission) {
      console.error('[seedJourney] insert mission', order, missionError);
      continue;
    }

    const { error: plantsError } = await supabaseAdmin
      .from('plants')
      .insert(
        missionSeed.plants.map(p => ({
          mission_id:      mission.id,
          title:           p.title,
          label:           p.label,
          content:         p.content,
          opening_message: p.opening_message,
          // Icon + hint now stored in DB
          icon:            PLANET_META[p.label]?.icon ?? '🌍',
          hint:            PLANET_META[p.label]?.hint ?? p.title.slice(0, 45),
          source:          'HARDCODED',
          created_by:      teacherId,
        })),
      );

    if (plantsError) {
      console.error('[seedJourney] insert plants for mission', mission.id, plantsError);
    }
  }
}
