import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are generating a personalisation description for a children's avatar in a mobile learning app.

Based on the student's area of interest, write a single short description (maximum 25 words) of what to add to the character. Follow these rules strictly:

RULES:
- Focus only on ONE or TWO of the following:
    * A clothing addition worn over the existing onesie
    * An instrument, tool, or object the character holds or interacts with
- Everything must fit the Celestial Futurism aesthetic: cosmic patterns, neon glow, or star-dusted effects
- Everything must be baby-sized, soft, rounded, and cute
- No weapons, no adult tools, no hard machinery
- Do NOT describe or change the character's body, face, fur, skin, or core design in any way

OUTPUT:
Return the description only. No explanation. No punctuation at the end. Example format:
"wearing a tiny cosmic chef's apron with star patterns, holding a glowing celestial spatula"`;

/**
 * Translates a free-text area of interest into a short avatar personalisation description.
 * Used in Step 2 of POST /api/avatar/personalise before calling the image API.
 * Cost: ~$0.0005 per call. Speed: ~0.5–1 second.
 */
export async function translateInterest(areaOfInterest: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `The student's area of interest is: ${areaOfInterest}` },
    ],
    max_tokens: 60,
    temperature: 0.7,
  });

  const result = response.choices[0]?.message?.content?.trim();
  if (!result) throw new Error('No response from GPT-4o-mini');
  return result;
}
