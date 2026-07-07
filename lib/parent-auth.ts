import { supabaseAdmin } from './supabase-server';

export type BotCapResult =
  | { allowed: true }
  | { allowed: false; resetsAt: string };

/**
 * Checks whether a student's parent has remaining bot conversation quota.
 * If the cap reset date has passed, resets the counter lazily before checking.
 *
 * Returns { allowed: true } for school-enrolled students (no parent link = no cap).
 * Returns { allowed: false, resetsAt } when the cap is reached.
 *
 * Call BEFORE AI generation. Increment happens after successful response.
 */
export async function checkBotCap(studentId: string): Promise<BotCapResult> {
  const { data: link } = await supabaseAdmin
    .from('parent_child_link')
    .select('parent_id')
    .eq('child_id', studentId)
    .maybeSingle();

  if (!link) return { allowed: true };

  const { data: parent, error } = await supabaseAdmin
    .from('users')
    .select('bot_conversations_used, bot_conversations_limit, bot_cap_reset_at')
    .eq('id', link.parent_id)
    .single();

  if (error || !parent) return { allowed: true };

  const now = new Date();
  const resetAt = parent.bot_cap_reset_at ? new Date(parent.bot_cap_reset_at) : null;

  if (resetAt && now >= resetAt) {
    const nextReset = new Date(resetAt);
    nextReset.setMonth(nextReset.getMonth() + 1);

    await supabaseAdmin
      .from('users')
      .update({ bot_conversations_used: 0, bot_cap_reset_at: nextReset.toISOString() })
      .eq('id', link.parent_id);

    return { allowed: true };
  }

  if (parent.bot_conversations_used >= parent.bot_conversations_limit) {
    return {
      allowed: false,
      resetsAt: parent.bot_cap_reset_at ?? new Date().toISOString(),
    };
  }

  return { allowed: true };
}

/**
 * Increments the bot conversation counter for the parent of a given student.
 * Call AFTER a successful AI response is saved.
 * No-op for school students (no parent link).
 */
export async function incrementBotCap(studentId: string): Promise<void> {
  const { data: link } = await supabaseAdmin
    .from('parent_child_link')
    .select('parent_id')
    .eq('child_id', studentId)
    .maybeSingle();

  if (!link) return;

  const { data: parent } = await supabaseAdmin
    .from('users')
    .select('bot_conversations_used')
    .eq('id', link.parent_id)
    .single();

  if (!parent) return;

  await supabaseAdmin
    .from('users')
    .update({ bot_conversations_used: (parent.bot_conversations_used ?? 0) + 1 })
    .eq('id', link.parent_id);
}

/**
 * Fetches the parent + linked child + family class for a given parent user ID.
 * Used by the dashboard API and other parent-scoped routes.
 */
export async function getParentContext(parentId: string) {
  const [{ data: link }, { data: familyClass }] = await Promise.all([
    supabaseAdmin
      .from('parent_child_link')
      .select('child_id')
      .eq('parent_id', parentId)
      .maybeSingle(),
    supabaseAdmin
      .from('classes')
      .select('id, journey_id, title')
      .eq('teacher_id', parentId)
      .eq('type', 'family')
      .maybeSingle(),
  ]);

  return { childId: link?.child_id ?? null, familyClass: familyClass ?? null };
}

/**
 * Asserts the session user has role = 'parent' in their metadata.
 * Returns the parentId string or null if not a parent session.
 */
export function resolveParentId(user: { user_metadata?: Record<string, unknown> }): string | null {
  const role = user.user_metadata?.role as string | undefined;
  const parentId = user.user_metadata?.parent_id as string | undefined;
  if (role !== 'parent' || !parentId) return null;
  return parentId;
}
