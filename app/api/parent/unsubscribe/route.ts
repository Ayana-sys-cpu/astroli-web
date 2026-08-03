// GET /api/parent/unsubscribe?token=…
//
// One-click, no session. The link arrives in an inbox, and a parent should not
// have to log in to stop emails — so the signed token is the only credential.
//
// Stops summary emails ONLY. Invite and account email are unaffected; a parent
// who mutes the weekly note must still receive the link their child needs.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyUnsubscribeToken } from '@/lib/parent-unsubscribe-token';
import { resolveUserLanguage } from '@/lib/student-language';

export async function GET(req: NextRequest) {
  const parentId = verifyUnsubscribeToken(req.nextUrl.searchParams.get('token'));

  if (!parentId) {
    return html('en', 'That link is not valid.', 'Ask us to resend it, or turn emails off from your dashboard.');
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ summary_emails_enabled: false })
    .eq('id', parentId);

  if (error) {
    console.error('[parent/unsubscribe] update error:', error);
    return html('en', "We couldn't turn them off.", 'Please try the link again in a moment.');
  }

  const language = await resolveUserLanguage(parentId);

  return language === 'he'
    ? html('he', 'המיילים הופסקו.', 'לא נשלח לך יותר סיכומים. עדיין תקבלי מיילים על החשבון עצמו.')
    : html('en', 'Emails turned off.', "We won't send you summaries any more. You'll still get account email.");
}

function html(language: 'en' | 'he', title: string, body: string): NextResponse {
  const dir = language === 'he' ? 'rtl' : 'ltr';
  return new NextResponse(
    `<!DOCTYPE html><html dir="${dir}" lang="${language}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Astroli</title></head>
<body style="margin:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div dir="${dir}" style="max-width:420px;padding:36px 32px;background:#111;border:1px solid #222;border-radius:16px;text-align:center;">
<p dir="ltr" style="margin:0 0 24px;font-size:18px;letter-spacing:0.15em;color:#fff;">ASTROLI</p>
<p style="margin:0 0 10px;font-size:18px;color:#fff;">${title}</p>
<p style="margin:0;font-size:14px;line-height:1.7;color:#888;">${body}</p>
</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
