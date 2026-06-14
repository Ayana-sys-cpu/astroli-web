# Shadow Session Summary — 2026-06-06
**Progress:** 6/6 personas complete

---

## 🚨 Critical: Platform Bug Found

**Planet 3 (Emperor Henry IV — Authority of the Sword) is broken.**
API returns: `{"error": "No approved character for this planet"}`
This affects ALL students. Planet 3 is completely unreachable.
**Action required before next run:** Approve the character for Planet 3 in the content admin system.

---

## 🚨 Technical Bug Found

**Em-dash characters in student messages break the bot API's JSON encoding.**
Affects Mac users who type em-dashes naturally (common for above-grade-level students like Alex).
The jq parsing fails silently — student message is lost, bot generates a generic response.

---

## What worked (appeared in 3+ personas)

- **Planet 4 (Canossa) is the strongest planet in the mission.** Sam said "wait he actually did that", Casey called it "actual anime villain arc", Riley engaged fully, Alex synthesised at Transfer level. The barefoot-in-the-snow image is the single most universally effective hook in Mission 01.
- **Short punchy responses outperformed long ones every time.** Across all 6 personas, responses that opened with a vivid image in ≤3 sentences held attention. Responses over 3 sentences triggered dropout in low-attention personas (Sam, Casey).
- **Gregory at Planet 2 handled Jordan's challenge perfectly.** "That question has teeth. Good." is the reference model for credibility-preserving figure responses.
- **Corrections that say "not quite" immediately followed by a reason worked for Morgan** — warm and specific, not punitive.
- **Orin at the hub matched Casey's energy correctly** — the only hub interaction that fully succeeded.

---

## What failed (appeared in 3+ personas)

- **"You come from another time — I can tell" opening pattern.** Appeared 10+ times across Planet 1, 2, 3, 4, 5, 6. Every persona noticed it or disengaged when it appeared after a moment of genuine connection. It feels like a reset to factory default. Sam hit it 4 times on Planet 1 alone.
- **Student interests were never used.** Gaming (Sam), Space (Alex), Anime (Casey), Basketball (Riley), Robots (Jordan), Art (Morgan) — zero direct connections across 30+ bot turns. Every persona had at least one direct thematic connection available (Sam: game theory of Canossa; Alex: orbital mechanics as medieval cosmology; Morgan: illuminated manuscripts). None were used.
- **Open-ended questions after low-effort responses accelerate dropout.** When Sam said "idk" or "boring," every figure responded with another open question. This is the opposite of what the persona needs. The correct response is a declarative statement with one embedded hook.
- **Orin failed two hubs** — Alex got "catching static" deflection, Riley got "mission data not loaded." Both avoided the actual question. The hub is the last chance to hook a student before they enter planets; Orin failures here set up planet failure.
- **No figure ever connected to a student's stated interest proactively.** Rashi offered to connect to Sam's interest then never did. This is a broken promise that damages trust.

---

## Top improvement ideas (ranked by frequency)

1. **Fix the "you come from another time" reset pattern** — appeared 10+ times. Replace with a response that continues the specific thread of the conversation. 5/6 personas affected.
2. **Connect to student interest in at least one response per planet** — the interest is known from the profile. Use it. 6/6 personas affected.
3. **Replace open questions after disengagement with declarative hooks** — "the most powerful man in Europe stood barefoot in the snow. For three days." is not a question. 4/6 personas affected.
4. **Fix Planet 3** — 6/6 personas affected (planet completely unreachable).
5. **Approve em-dash input in the bot API** — affects Mac users typing naturally. 1/6 personas directly affected but likely affects many real users.
6. **Orin hub responses must answer the student's actual question first** — even if mission state is unclear, Orin should lead with the most compelling image from the mission. 2/6 personas directly affected.
7. **"Not quite" corrections should always be followed by the right answer, not another question** — leave Morgan (and similar students) knowing where they stand before moving forward. 1/6 personas directly affected but pattern applies broadly.

