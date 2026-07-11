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

  // Debit + grant happen in one transaction inside the database function, so
  // concurrent purchases can never spend the same coins twice.
  const { data: purchase, error: purchaseError } = await supabaseAdmin.rpc(
    'purchase_store_item',
    {
      p_student_id: studentId,
      p_item_id:    itemId,
      p_category:   item.category,
      p_price:      item.price,
    },
  );

  if (purchaseError) {
    // 23505 = unique violation on (student_id, item_id): already owned.
    if (purchaseError.code === '23505') {
      return NextResponse.json({ error: 'already_owned' }, { status: 409 });
    }
    console.error('[store/purchase] purchase_store_item failed:', purchaseError);
    return NextResponse.json({ error: 'purchase_not_persisted' }, { status: 500 });
  }

  if (purchase.status === 'insufficient_balance') {
    return NextResponse.json(
      { error: 'insufficient_balance', balance: purchase.balance, required: item.price },
      { status: 400 },
    );
  }

  const newBalance: number = purchase.new_balance;

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
