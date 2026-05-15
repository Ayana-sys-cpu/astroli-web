// Run with: node scripts/test-translate.mjs
// Requires OPENAI_API_KEY to be set in .env.local or exported in your shell

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌  OPENAI_API_KEY is not set. Export it in your shell first:');
  console.error('   export OPENAI_API_KEY=your-key-here');
  process.exit(1);
}

const client = new OpenAI({ apiKey });

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

async function translateInterest(interest) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `The student's area of interest is: ${interest}` },
    ],
    max_tokens: 60,
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content?.trim() ?? '(no response)';
}

const TEST_INPUTS = ['dinosaurs', 'K-pop', 'bread baking', 'deep sea creatures', 'football'];

console.log('Testing translateInterest() with 5 inputs...\n');
for (const interest of TEST_INPUTS) {
  const result = await translateInterest(interest);
  const wordCount = result.split(' ').length;
  const status = wordCount <= 25 ? '✅' : '❌ TOO LONG';
  console.log(`Interest: "${interest}"`);
  console.log(`Output:   ${result}`);
  console.log(`Words:    ${wordCount} ${status}`);
  console.log('');
}
