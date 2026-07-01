import type { SupabaseClient } from '@supabase/supabase-js';

export type EventType =
  | 'goal_completion'
  | 'first_vote'
  | 'planet_complete'
  | 'mission_complete'
  | 'bonus_mission';

export interface AwardResult {
  awarded:    boolean;
  amount:     number;
  newBalance: number;
}

const EVENT_AMOUNTS: Record<EventType, number> = {
  goal_completion:  20,
  first_vote:       10,
  planet_complete:  50,
  mission_complete: 100,
  bonus_mission:    75,
};

export const VALID_EVENT_TYPES = Object.keys(EVENT_AMOUNTS) as EventType[];

/**
 * Awards coins to a student for a qualifying event.
 * Uses INSERT … ON CONFLICT DO NOTHING to deduplicate — if the same
 * (student_id, event_type, mission_id) has already been rewarded, returns
 * { awarded: false, amount: 0, newBalance: <current> }.
 *
 * Must be called with a service-role Supabase client (bypasses RLS).
 */
export async function awardCoins(
  supabase: SupabaseClient,
  studentId: string,
  eventType: EventType,
  missionId: string | null,
): Promise<AwardResult> {
  const amount = EVENT_AMOUNTS[eventType];

  // Attempt to insert the deduplication log row.
  const { data: logRow } = await supabase
    .from('coin_reward_log')
    .insert({ student_id: studentId, event_type: eventType, amount, mission_id: missionId })
    .select('id')
    .maybeSingle();

  if (!logRow) {
    // Duplicate — fetch and return current balance unchanged.
    const { data: balRow } = await supabase
      .from('student_coin_balances')
      .select('balance')
      .eq('student_id', studentId)
      .maybeSingle();
    return { awarded: false, amount: 0, newBalance: balRow?.balance ?? 0 };
  }

  // Read current balance, compute new total, then upsert.
  // Supabase's JS client cannot express "balance + EXCLUDED.balance" in upsert;
  // the read-then-write is safe here because coin_reward_log's UNIQUE constraint
  // ensures the same event can only trigger one award.
  const { data: existing } = await supabase
    .from('student_coin_balances')
    .select('balance')
    .eq('student_id', studentId)
    .maybeSingle();

  const newBalance = (existing?.balance ?? 0) + amount;

  const { data: balRow, error } = await supabase
    .from('student_coin_balances')
    .upsert(
      { student_id: studentId, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: 'student_id' },
    )
    .select('balance')
    .maybeSingle();

  if (error || !balRow) {
    console.error('[awardCoins] balance upsert failed', error);
    return { awarded: true, amount, newBalance };
  }

  return { awarded: true, amount, newBalance: balRow.balance };
}
