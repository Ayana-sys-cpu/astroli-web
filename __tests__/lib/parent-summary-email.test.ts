import { describe, it, expect } from 'vitest';
import { renderSummaryEmail, type SummaryEmailInput } from '@/lib/parent-summary-email';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/parent-unsubscribe-token';

function input(over: Partial<SummaryEmailInput> = {}): SummaryEmailInput {
  return {
    parentName: 'Noa',
    childName: 'Eran',
    kind: 'topic',
    topicTitle: 'Nothing is ever lost',
    question: 'If you burn a piece of paper, where does it go?',
    language: 'en',
    unsubscribeToken: 'tok',
    ...over,
  };
}

describe('subject line', () => {
  // "Weekly update" gets ignored; a discovery gets opened.
  it('names the discovery, not the product', () => {
    const { subject } = renderSummaryEmail(input());
    expect(subject).toContain('Eran');
    expect(subject.toLowerCase()).not.toContain('weekly');
    expect(subject.toLowerCase()).not.toContain('update');
  });

  it('differs by kind', () => {
    const kinds = (['topic', 'progress', 'nudge'] as const).map(
      k => renderSummaryEmail(input({ kind: k })).subject,
    );
    expect(new Set(kinds).size).toBe(3);
  });
});

describe('body', () => {
  it('carries the topic and the question', () => {
    const { html } = renderSummaryEmail(input());
    expect(html).toContain('Nothing is ever lost');
    expect(html).toContain('where does it go');
    expect(html).toContain('/parent/dashboard');
  });

  it('omits the question block when there is no question', () => {
    const { html } = renderSummaryEmail(input({ question: null }));
    expect(html).not.toContain('Ask at dinner');
    expect(html).toContain('Nothing is ever lost');
  });

  it('carries no stats, minutes, or levels — they compete with the one action', () => {
    const { html } = renderSummaryEmail(input());
    expect(html.toLowerCase()).not.toContain('minutes');
    expect(html.toLowerCase()).not.toContain('perkins');
    expect(html.toLowerCase()).not.toContain('level');
  });

  it('escapes names and questions rather than interpolating them raw', () => {
    const { html } = renderSummaryEmail(input({ childName: '<script>x</script>' }));
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('Hebrew', () => {
  it('renders right-to-left', () => {
    const { html } = renderSummaryEmail(input({ language: 'he' }));
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('text-align:right');
  });

  // A Latin brand name inside an RTL container renders reversed without this.
  it('keeps ASTROLI left-to-right', () => {
    const { html } = renderSummaryEmail(input({ language: 'he' }));
    const brandIndex = html.indexOf('ASTROLI');
    expect(html.slice(0, brandIndex)).toContain('dir="ltr"');
  });

  it('moves the accent bar to the right edge', () => {
    const he = renderSummaryEmail(input({ language: 'he' })).html;
    const en = renderSummaryEmail(input({ language: 'en' })).html;
    expect(he).toContain('border-right:3px solid #00F5D4');
    expect(en).toContain('border-left:3px solid #00F5D4');
  });

  it('writes the subject in Hebrew too', () => {
    const { subject } = renderSummaryEmail(input({ language: 'he' }));
    expect(/[֐-׿]/.test(subject)).toBe(true);
  });
});

describe('unsubscribe token', () => {
  it('round-trips', () => {
    expect(verifyUnsubscribeToken(createUnsubscribeToken('parent-1'))).toBe('parent-1');
  });

  // The token is the only credential — the link works without a session.
  it('rejects a forged signature', () => {
    const forged = `${Buffer.from('parent-2').toString('base64url')}.notasignature`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });

  it('rejects a token whose id was swapped', () => {
    const real = createUnsubscribeToken('parent-1');
    const swapped = `${Buffer.from('parent-2').toString('base64url')}.${real.split('.')[1]}`;
    expect(verifyUnsubscribeToken(swapped)).toBeNull();
  });

  it('rejects missing and malformed tokens', () => {
    for (const t of [null, undefined, '', 'nodot', '.', 'a.']) {
      expect(verifyUnsubscribeToken(t as any)).toBeNull();
    }
  });

  it('embeds the token in the email link', () => {
    const token = createUnsubscribeToken('parent-1');
    const { html } = renderSummaryEmail(input({ unsubscribeToken: token }));
    expect(html).toContain(`token=${encodeURIComponent(token)}`);
  });
});
