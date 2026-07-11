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

  // Single-slot toggle runs as one transaction in Postgres — two rapid equips
  // used to interleave and could leave nothing equipped.
  const { data: result, error: equipError } = await supabaseAdmin.rpc(
    'equip_store_item',
    { p_student_id: studentId, p_item_id: itemId },
  );

  if (equipError) {
    console.error('[store/equip] equip_store_item failed:', equipError);
    return NextResponse.json({ error: 'equip_failed' }, { status: 500 });
  }
  if (result.status === 'not_owned') {
    return NextResponse.json({ error: 'not_owned' }, { status: 400 });
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
