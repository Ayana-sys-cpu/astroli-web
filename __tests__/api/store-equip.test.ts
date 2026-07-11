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

// 'cp1' is a real catalogue item: category 'capes'.
function equipRequest(itemId: string) {
  return new NextRequest('http://localhost/api/store/equip', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
    headers: { 'content-type': 'application/json' },
  });
}

async function callEquip(itemId: string) {
  const { POST } = await import('@/app/api/store/equip/route');
  return POST(equipRequest(itemId));
}

describe('POST /api/store/equip', () => {
  beforeEach(() => {
    rpc.mockReset();
    inventoryRows.length = 0;
  });

  it('equips atomically via the equip_store_item RPC and returns the equipped map', async () => {
    rpc.mockResolvedValue({ data: { status: 'ok' }, error: null });
    inventoryRows.push({ item_id: 'cp1', category: 'capes', is_equipped: true });

    const res = await callEquip('cp1');
    const body = await res.json();

    expect(rpc).toHaveBeenCalledWith('equip_store_item', {
      p_student_id: 'student-1',
      p_item_id:    'cp1',
    });
    expect(res.status).toBe(200);
    expect(body.equipped.capes).toBe('cp1');
  });

  it('reports an empty slot after toggling an equipped item off', async () => {
    rpc.mockResolvedValue({ data: { status: 'ok' }, error: null });
    inventoryRows.push({ item_id: 'cp1', category: 'capes', is_equipped: false });

    const res = await callEquip('cp1');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.equipped.capes).toBeNull();
  });

  it('returns 400 when the student does not own the item', async () => {
    rpc.mockResolvedValue({ data: { status: 'not_owned' }, error: null });

    const res = await callEquip('cp1');

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('not_owned');
  });

  it('returns 500 when the RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } });

    const res = await callEquip('cp1');

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('equip_failed');
  });

  it('returns 400 for an unknown item without calling the RPC', async () => {
    const res = await callEquip('no-such-item');

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('item_not_found');
    expect(rpc).not.toHaveBeenCalled();
  });
});
