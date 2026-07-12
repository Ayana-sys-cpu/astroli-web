/**
 * Live Q&A with the Orin bot for the mission guide panel.
 *
 * The guide panel's free-text "Ask me anything" input goes through here to the
 * deployed astorli-bot service — the same brain (character prompt, intent
 * classification, safety guardrails, family cost cap) that powers the floating
 * AvatarBot. Callers fall back to the mission's scripted answers when this
 * returns null, so a bot outage never leaves the student without a reply.
 */

export const ORIN_BOT_URL = 'https://astorli-bot.vercel.app/api/bot';

export interface OrinQuestion {
  studentId:       string;
  message:         string;
  /** The mission's big question — gives the bot the topic the student is exploring. */
  missionQuestion: string;
  /** Planet names of the mission, so the bot can suggest where to explore next. */
  planetNames:     string[];
  language:        'en' | 'he';
}

/** Returns Orin's reply, or null when the bot is unreachable, capped, or replied empty. */
export async function askOrin(question: OrinQuestion): Promise<string | null> {
  try {
    const res = await fetch(ORIN_BOT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        studentId:      question.studentId,
        message:        question.message,
        screen:         'mission_landscape_hub',
        missionContext: question.missionQuestion,
        planetList:     question.planetNames.join(', '),
        language:       question.language,
      }),
    });
    if (!res.ok) return null;
    const data: { message?: unknown } = await res.json();
    return typeof data.message === 'string' && data.message.trim().length > 0
      ? data.message
      : null;
  } catch {
    return null;
  }
}
