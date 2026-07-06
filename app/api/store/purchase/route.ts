import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { z, parseBody } from '@/lib/validate';
import { CATALOGUE_BY_ID, CATEGORIES } from '@/lib/store-catalogue';
import type { Category } from '@/lib/store-catalogue';

const PurchaseSchema = z.object({
  itemId: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = await parseBody(req, PurchaseSchema);
  if (!parsed.ok) return parsed.response;
  const { itemId } = parsed.data;

  const item = CATALOGUE_BY_ID[itemId];
  if (!item || item.price === null) {
    return NextResponse.json({ error: 'item_not_found' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('student_inventory')
    .select('id')
    .eq('student_id', studentId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'already_owned' }, { status: 409 });

  const { data: balRow } = await supabaseAdmin
    .from('student_coin_balances')
    .select('balance')
    .eq('student_id', studentId)
    .maybeSingle();

  const currentBalance = balRow?.balance ?? 0;
  if (currentBalance < item.price) {
    return NextResponse.json(
      { error: 'insufficient_balance', balance: currentBalance, required: item.price },
      { status: 400 },
    );
  }

  const newBalance = currentBalance - item.price;

  // Single-slot: unequip everything across all categories before equipping new item
  await supabaseAdmin
    .from('student_inventory')
    .update({ is_equipped: false })
    .eq('student_id', studentId)
    .eq('is_equipped', true);

  await supabaseAdmin
    .from('student_coin_balances')
    .upsert(
      { student_id: studentId, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: 'student_id' },
    );

  await supabaseAdmin
    .from('student_inventory')
    .insert({
      student_id:  studentId,
      item_id:     itemId,
      category:    item.category,
      is_equipped: true,
    });

  const { data: invRows } = await supabaseAdmin
    .from('student_inventory')
    .select('item_id, category, is_equipped')
    .eq('student_id', studentId);

  const equipped = Object.fromEntries(
    CATEGORIES.map(cat => {
      const row = (invRows ?? []).find(
        (r: { category: string; is_equipped: boolean }) =>
          r.category === cat && r.is_equipped,
      );
      return [cat, row?.item_id ?? null];
    }),
  ) as Record<Category, string | null>;

  return NextResponse.json({ newBalance, itemId, equipped });
}
