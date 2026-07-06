import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { CATEGORIES } from '@/lib/store-catalogue';
import type { Category } from '@/lib/store-catalogue';

export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [{ data: balRow }, { data: invRows, error: invError }] = await Promise.all([
    supabaseAdmin
      .from('student_coin_balances')
      .select('balance')
      .eq('student_id', studentId)
      .maybeSingle(),
    supabaseAdmin
      .from('student_inventory')
      .select('item_id, category, is_equipped')
      .eq('student_id', studentId),
  ]);

  if (invError) console.error('[store/state] inventory query error:', invError);

  const owned = (invRows ?? []).map((r: { item_id: string }) => r.item_id);

  const equipped = Object.fromEntries(
    CATEGORIES.map(cat => {
      const equippedRow = (invRows ?? []).find(
        (r: { category: string; is_equipped: boolean }) =>
          r.category === cat && r.is_equipped,
      );
      return [cat, equippedRow?.item_id ?? null];
    }),
  ) as Record<Category, string | null>;

  return NextResponse.json({
    balance: balRow?.balance ?? 0,
    owned,
    equipped,
  });
}
