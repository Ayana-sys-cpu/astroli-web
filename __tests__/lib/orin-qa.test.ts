import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askOrin, ORIN_BOT_URL } from '@/lib/orin-qa';

const QUESTION = {
  studentId:       'student-1',
  message:         'Why did the Church have power over kings?',
  missionQuestion: 'Who owns the truth?',
  planetNames:     ['The Investiture Controversy', 'The Central Role of the Catholic Church'],
  language:        'en' as const,
};

describe('askOrin', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetchResponse(body: unknown, ok = true) {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    });
  }

  it('returns the bot reply and sends mission context to the live bot endpoint', async () => {
    mockFetchResponse({ message: 'Zync! One letter dissolved every loyalty oath.' });

    const reply = await askOrin(QUESTION);

    expect(reply).toBe('Zync! One letter dissolved every loyalty oath.');
    expect(fetch).toHaveBeenCalledWith(ORIN_BOT_URL, expect.objectContaining({ method: 'POST' }));
    const sentBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(sentBody).toEqual({
      studentId:      'student-1',
      message:        'Why did the Church have power over kings?',
      screen:         'mission_landscape_hub',
      missionContext: 'Who owns the truth?',
      planetList:     'The Investiture Controversy, The Central Role of the Catholic Church',
      language:       'en',
    });
  });

  it('returns null when the bot responds without a message (e.g. monthly cap)', async () => {
    mockFetchResponse({ error: 'Monthly bot limit reached' }, false);
    expect(await askOrin(QUESTION)).toBeNull();
  });

  it('returns null when the network call fails', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    expect(await askOrin(QUESTION)).toBeNull();
  });

  it('returns null when the reply message is empty', async () => {
    mockFetchResponse({ message: '   ' });
    expect(await askOrin(QUESTION)).toBeNull();
  });
});
