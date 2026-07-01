import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { z, parseBody } from '@/lib/validate';
import { CATALOGUE_BY_ID, CATEGORIES } from '@/lib/store-catalogue';
import type { Category } from '@/lib/store-catalogue';

const EquipSchema = z.object({
  itemId: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = await parseBody(req, EquipSchema);
  if (!parsed.ok) return parsed.response;
  const { itemId } = parsed.data;

  const item = CATALOGUE_BY_ID[itemId];
  if (!item) return NextResponse.json({ error: 'item_not_found' }, { status: 400 });

  const { data: ownedRow } = await supabaseAdmin
    .from('student_inventory')
    .select('id, is_equipped')
    .eq('student_id', studentId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (!ownedRow) return NextResponse.json({ error: 'not_owned' }, { status: 400 });

  if (ownedRow.is_equipped) {
    await supabaseAdmin
      .from('student_inventory')
      .update({ is_equipped: false })
      .eq('student_id', studentId)
      .eq('item_id', itemId);
  } else {
    await supabaseAdmin
      .from('student_inventory')
      .update({ is_equipped: false })
      .eq('student_id', studentId)
      .eq('category', item.category)
      .eq('is_equipped', true);

    await supabaseAdmin
      .from('student_inventory')
      .update({ is_equipped: true })
      .eq('student_id', studentId)
      .eq('item_id', itemId);
  }

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

  return NextResponse.json({ equipped });
}
