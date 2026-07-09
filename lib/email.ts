// Resend email integration using the REST API directly (no SDK dependency).
// API docs: https://resend.com/docs/api-reference/emails/send-email

const RESEND_API = 'https://api.resend.com/emails';
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Astroli <noreply@astroli.ai>';
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://app.astroli.ai';

export async function sendInviteEmail(
  to: string,
  childName: string,
  token: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const link = `${BASE}/auth/accept-invite?token=${token}`;
  const firstName = childName.split(' ')[0] ?? childName;

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    FROM,
      to:      [to],
      subject: 'Your Astroli invite is ready 🚀',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#111;border-radius:16px;overflow:hidden;border:1px solid #222;">
          <tr><td style="height:4px;background:linear-gradient(90deg,#FF0080,#a020f0,#00F5D4);"></td></tr>
          <tr>
            <td style="padding:40px 36px;">
              <p style="margin:0 0 32px;font-size:28px;font-weight:900;letter-spacing:0.15em;color:#fff;">ASTROLI</p>
              <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#fff;">Hi ${firstName}! You've been invited 🎉</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#aaa;">
                Your parent invited you to join Astroli — your personal learning mission in space.
                Click below to create your account and start exploring.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(120deg,#FF0080,#a020f0,#00F5D4);">
                    <a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;letter-spacing:0.08em;color:#fff;text-decoration:none;">
                      JOIN ASTROLI →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;color:#555;">
                This link expires in 48 hours. If you resend, use the newest email.
              </p>
              <p style="margin:0;font-size:11px;color:#444;word-break:break-all;">
                <a href="${link}" style="color:#555;">${link}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #1e1e1e;">
              <p style="margin:0;font-size:11px;color:#444;">
                You received this because a parent added your email to Astroli. If this wasn't you, ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Resend API error ${res.status}: ${JSON.stringify(body)}`);
  }
}
