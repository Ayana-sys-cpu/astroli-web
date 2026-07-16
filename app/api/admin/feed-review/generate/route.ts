import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

const COST_PER_EDIT_USD = 0.015;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body?.planet_id || !Array.isArray(body.edit_types) || !Array.isArray(body.interest_themes)) {
    return NextResponse.json({ error: 'planet_id, edit_types, and interest_themes are required' }, { status: 400 });
  }

  const { planet_id, edit_types, interest_themes, pilot } = body as {
    planet_id: string;
    edit_types: string[];
    interest_themes: (string | null)[];
    pilot?: boolean;
  };

  const themesWithGeneric = interest_themes.length === 0 ? [null] : interest_themes;
  const editsQueued = pilot ? edit_types.length : edit_types.length * themesWithGeneric.length;
  const estimatedCost = parseFloat((editsQueued * COST_PER_EDIT_USD).toFixed(3));

  const botUrl = process.env.ASTORLI_BOT_URL;
  const secret = process.env.FEED_GENERATE_SECRET;

  if (!botUrl || !secret) {
    return NextResponse.json(
      { error: 'ASTORLI_BOT_URL or FEED_GENERATE_SECRET not configured' },
      { status: 503 },
    );
  }

  try {
    const botRes = await fetch(`${botUrl}/api/feed/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ planet_id, edit_types, interest_themes: themesWithGeneric, pilot }),
    });

    if (!botRes.ok) {
      const text = await botRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Bot returned ${botRes.status}: ${text}` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      edits_queued: editsQueued,
      estimated_cost_usd: estimatedCost,
      message: 'Drafts will appear in the review queue within 2 minutes',
    });
  } catch {
    return NextResponse.json({ error: 'astorli-bot unreachable' }, { status: 503 });
  }
}
