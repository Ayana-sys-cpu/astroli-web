// The parent summary email: one thing their child learned, one question to ask
// about it tonight, one button back to the dashboard.
//
// Deliberately not a digest. Stats, minutes and levels all compete with the one
// action we want — asking the question at dinner — so none of them are here.
// The subject line names the discovery rather than the product: "Eran figured
// out where the paper goes" gets opened; "Eran's weekly update" does not.

import type { ParentEmailKind } from '@/lib/parent-email-schedule';
import type { Lang } from '@/lib/i18n';

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://app.astroli.ai';

export interface SummaryEmailInput {
  parentName:  string | null;
  childName:   string;
  kind:        ParentEmailKind;
  topicTitle:  string | null;
  question:    string | null;
  language:    Lang;
  /** Signed value identifying the parent for one-click unsubscribe. */
  unsubscribeToken: string;
}

export interface RenderedEmail {
  subject: string;
  html:    string;
}

const COPY = {
  en: {
    greeting:      (p: string | null) => (p ? `Hi ${p},` : 'Hi,'),
    subjectTopic:  (c: string) => `${c} figured something out`,
    subjectProg:   (c: string) => `${c} is working on something good`,
    subjectNudge:  (c: string) => `${c} hasn't visited this week`,
    finishedLabel: (c: string) => `Yesterday ${c} finished`,
    progressLabel: (c: string) => `${c} is in the middle of`,
    askLabel:      'Ask at dinner',
    letThemExplain:'Let them do the explaining — that\'s where it sticks.',
    nudgeBody:     (c: string) =>
      `${c} hasn't opened Astroli this week. A nudge from you goes further than one from us — ` +
      'even five minutes is enough to get going again.',
    cta:           (c: string) => `See everything ${c} is learning`,
    footer:        (c: string) => `You're getting this because ${c} is linked to your Astroli account.`,
    unsubscribe:   'Turn these emails off',
  },
  he: {
    greeting:      (p: string | null) => (p ? `היי ${p},` : 'היי,'),
    subjectTopic:  (c: string) => `${c} הבין משהו חדש`,
    subjectProg:   (c: string) => `${c} באמצע משהו טוב`,
    subjectNudge:  (c: string) => `${c} לא נכנס השבוע`,
    finishedLabel: (c: string) => `אתמול ${c} השלים`,
    progressLabel: (c: string) => `${c} נמצא באמצע`,
    askLabel:      'שאלי בארוחת ערב',
    letThemExplain:'תני לו להסביר — שם זה נשאר.',
    nudgeBody:     (c: string) =>
      `${c} לא נכנס לאסטרולי השבוע. דחיפה קטנה ממך שווה יותר מאיתנו — ` +
      'אפילו חמש דקות מספיקות כדי לחזור לקצב.',
    cta:           (c: string) => `לראות את כל מה ש${c} לומד`,
    footer:        (c: string) => `קיבלת את המייל הזה כי ${c} מקושר לחשבון שלך באסטרולי.`,
    unsubscribe:   'להפסיק לקבל מיילים',
  },
} as const;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}

export function renderSummaryEmail(input: SummaryEmailInput): RenderedEmail {
  const { parentName, childName, kind, topicTitle, question, language, unsubscribeToken } = input;
  const t = COPY[language];
  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  // Hebrew flips the accent bar to the other edge with it.
  const accentSide = rtl ? 'border-right' : 'border-left';

  const child = escapeHtml(childName);
  const subject =
    kind === 'topic'    ? t.subjectTopic(child)
    : kind === 'progress' ? t.subjectProg(child)
    :                       t.subjectNudge(child);

  const label = kind === 'topic' ? t.finishedLabel(child) : t.progressLabel(child);

  const body = kind === 'nudge'
    ? `<p style="margin:0 0 26px;font-size:15px;line-height:1.7;color:#aaa;">${escapeHtml(t.nudgeBody(childName))}</p>`
    : `
      <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.05em;color:#777;">${escapeHtml(label)}</p>
      <p style="margin:0 0 22px;font-size:18px;color:#fff;">${escapeHtml(topicTitle ?? '')}</p>
      ${question ? `
      <div style="background:#1a1a1a;${accentSide}:3px solid #00F5D4;padding:16px 18px;margin:0 0 14px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.05em;color:#00F5D4;">${escapeHtml(t.askLabel)}</p>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#fff;">&ldquo;${escapeHtml(question)}&rdquo;</p>
      </div>
      <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#888;">${escapeHtml(t.letThemExplain)}</p>
      ` : ''}
    `;

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" dir="${dir}" style="max-width:480px;background:#111;border-radius:16px;overflow:hidden;border:1px solid #222;text-align:${align};">
        <tr><td style="height:4px;background:#a020f0;"></td></tr>
        <tr><td style="padding:36px 32px;">
          <!-- A Latin brand name inside an RTL container renders reversed without an explicit direction. -->
          <p dir="ltr" style="margin:0 0 28px;font-size:20px;letter-spacing:0.15em;color:#fff;text-align:${align};">ASTROLI</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#ddd;">${escapeHtml(t.greeting(parentName))}</p>
          ${body}
          <a href="${BASE}/parent/dashboard" style="display:block;text-align:center;background:#a020f0;color:#fff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:15px;margin:0 0 26px;">${escapeHtml(t.cta(childName))}</a>
          <p style="margin:0;padding-top:20px;border-top:1px solid #222;font-size:12px;line-height:1.7;color:#666;">
            ${escapeHtml(t.footer(childName))}
            <a href="${BASE}/api/parent/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}" style="color:#999;">${escapeHtml(t.unsubscribe)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
