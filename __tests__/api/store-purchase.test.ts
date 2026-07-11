import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  resolveStudentIdFromRequest: vi.fn().mockResolvedValue('student-1'),
}));

const rpc = vi.fn();
const inventoryRows: any[] = [];

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    rpc: (...args: any[]) => rpc(...args),
    from: vi.fn(() => {
      const result = Promise.resolve({ data: inventoryRows });
      const builder: any = {
        select: () => builder,
        eq:     () => builder,
        then:   result.then.bind(result),
        catch:  result.catch.bind(result),
      };
      return builder;
    }),
  },
}));

// 'cp1' is a real catalogue item: category 'capes', price 130.
function purchaseRequest(itemId: string) {
  return new NextRequest('http://localhost/api/store/purchase', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
    headers: { 'content-type': 'application/json' },
  });
}

async function callPurchase(itemId: string) {
  const { POST } = await import('@/app/api/store/purchase/route');
  return POST(purchaseRequest(itemId));
}

describe('POST /api/store/purchase', () => {
  beforeEach(() => {
    rpc.mockReset();
    inventoryRows.length = 0;
  });

  it('purchases atomically via the purchase_store_item RPC and returns the new balance', async () => {
    rpc.mockResolvedValue({ data: { status: 'ok', new_balance: 70 }, error: null });
    inventoryRows.push({ item_id: 'cp1', category: 'capes', is_equipped: true });

    const res = await callPurchase('cp1');
    const body = await res.json();

    expect(rpc).toHaveBeenCalledWith('purchase_store_item', {
      p_student_id: 'student-1',
      p_item_id:    'cp1',
      p_category:   'capes',
      p_price:      130,
    });
    expect(res.status).toBe(200);
    expect(body.newBalance).toBe(70);
    expect(body.itemId).toBe('cp1');
    expect(body.equipped.capes).toBe('cp1');
  });

  it('returns 400 with the current balance when coins are insufficient', async () => {
    rpc.mockResolvedValue({ data: { status: 'insufficient_balance', balance: 40 }, error: null });

    const res = await callPurchase('cp1');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'insufficient_balance', balance: 40, required: 130 });
  });

  it('returns 409 when the item is already owned (unique violation from the RPC)', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });

    const res = await callPurchase('cp1');
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({ error: 'already_owned' });
  });

  it('returns 500 when the RPC fails for any other reason', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } });

    const res = await callPurchase('cp1');

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('purchase_not_persisted');
  });

  it('returns 400 for an unknown item without calling the RPC', async () => {
    const res = await callPurchase('no-such-item');

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('item_not_found');
    expect(rpc).not.toHaveBeenCalled();
  });
});
