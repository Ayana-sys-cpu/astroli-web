/**
 * Targeted patch: sets opening_quick_replies on all existing missions and plants.
 * Uses real production UUIDs — safe to re-run at any time (idempotent UPDATE).
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Missions (matched by question text) ────────────────────────────────────────
const missionPatches: { id: string; label: string; qr: { label: string; value: string }[] }[] = [
  {
    id: '6c280c86-75e3-4e67-8c2f-27b296abe11a', // Who owns the truth — the establishment or the individual?
    label: 'Mission 1 (Truth / Pope vs Emperor)',
    qr: [
      { label: 'Yes, possible',  value: "Yes — I think they could both be completely right" },
      { label: 'No, impossible', value: "No — two total opposites can't both be right at the same time" },
    ],
  },
  {
    id: '87b3e0f1-47e0-4ac0-bb2c-34921005aa5f', // What happens when power expands beyond the reach of law? (Feudal)
    label: 'Mission 2 (Power / Feudal)',
    qr: [
      { label: "I'd make the deal", value: "I'd trade my freedom for safety — survival comes first, freedom means nothing if you're dead" },
      { label: "I'd refuse",        value: "I'd refuse — there are freedoms I'd protect even facing raiders. Some things are worth the risk" },
    ],
  },
  {
    id: '850cb683-ab78-4220-8a47-064eaa019cd0', // Who gets to define what's true — and what it costs to disagree? (Crusades/Islam)
    label: 'Mission 3 (Crusades / Cultural clash)',
    qr: [
      { label: 'Someone always loses', value: "Yes — when cultures clash at that scale, someone always ends up losing. That's just reality" },
      { label: 'Not always',           value: "No — that's the story we tell afterwards. The real outcome is almost always more complicated than a clean win or loss" },
    ],
  },
]

// ── Plants (matched by title) ───────────────────────────────────────────────────
const plantPatches: { id: string; label: string; qr: { label: string; value: string }[] }[] = [
  {
    id: '5703d3de-2c22-43c5-8976-dd923844e135', // The Central Role of the Catholic Church in Medieval Society
    label: 'Plant 1-1 (Church)',
    qr: [
      { label: 'Everything — total ruin',  value: "Everything — if the Church controlled your life from birth to burial, disagreeing would cost you absolutely everything" },
      { label: 'Depended on your status', value: "It depended on who you were — a king could push back more than a peasant could" },
    ],
  },
  {
    id: '31d2929d-69e0-4a73-9eb2-735b149440f7', // The Pope vs. The Emperor: The Investiture Controversy
    label: 'Plant 1-2 (Pope vs Emperor)',
    qr: [
      { label: 'The Pope',    value: "The Pope was really in charge — he could destroy an emperor's legitimacy with one letter" },
      { label: 'The Emperor', value: "The Emperor was in charge — he had the armies and kept his throne in the end" },
    ],
  },
  {
    id: 'd03faae9-3410-445d-af73-625dd761d577', // The Jewish Community in Ashkenaz: Rabbenu Gershom and Rashi
    label: 'Plant 1-3 (Ashkenaz)',
    qr: [
      { label: 'Shared belief makes it real',  value: "Authority is real when enough people choose to believe in it — belief is its own kind of power" },
      { label: 'Nothing else makes it stable', value: "Without force, authority is fragile — it only lasts as long as people keep agreeing to it" },
    ],
  },
  {
    id: '15d1e3b7-9376-4176-bff4-b64f9a5c5a25', // The Geonim of Babylonia: Jewish Leadership in Exile
    label: 'Plant 1-4 (Geonim)',
    qr: [
      { label: 'Reputation alone',      value: "Pure reputation — if you were known as the greatest scholar, communities trusted you without needing any force behind it" },
      { label: 'Communities needed it', value: "Shared desperation — communities needed answers they couldn't get elsewhere, and that need created its own authority" },
    ],
  },
  {
    id: 'b6332e41-c904-49b7-acd3-f71bef40f004', // The Fall of Rome and the Conditions That Created Feudalism
    label: 'Plant 2-1 (Fall of Rome)',
    qr: [
      { label: "I'd accept the deal", value: "I'd accept the deal — safety is worth almost anything when survival is uncertain and no one is coming to help" },
      { label: "I'd hold out",        value: "I'd hold out — even facing that fear, there are things I'd refuse to give up" },
    ],
  },
  {
    id: 'f6a18734-2d9e-4347-97d7-02e84479c570', // The Feudal Hierarchy: Kings, Nobles, Vassals, and Serfs
    label: 'Plant 2-2 (Feudal Hierarchy)',
    qr: [
      { label: 'Higher up, more risk', value: "I'd want to be higher up — noble or knight — even knowing it means more obligations, more enemies, more risk" },
      { label: 'Lower, but safer',     value: "I'd rather be lower in the chain — less power but also less danger of betrayal, war, and political games" },
    ],
  },
  {
    id: '0f026179-6869-43bb-8546-6f98457bf366', // The Three Orders: Those Who Pray, Those Who Fight, Those Who Work
    label: 'Plant 2-3 (Three Orders)',
    qr: [
      { label: 'Church and nobles — no coincidence', value: "The Church and nobles benefit most — and no, it's definitely not a coincidence that the story was designed by them" },
      { label: 'Everyone in different ways',         value: "Everyone benefited in different ways — even peasants got stability and meaning from knowing their role" },
    ],
  },
  {
    id: 'afd29524-2b05-453e-bda6-ab8c16404846', // Daily Life in Feudal Society
    label: 'Plant 2-4 (Daily Life)',
    qr: [
      { label: 'Not fair',           value: "Not fair — the bargain was deeply unfair to serfs. They had no real choice and gave up everything for someone else's protection" },
      { label: 'Fair given the era', value: "Fair given the era — unfair by our standards, but a rational survival decision in that world with no other options" },
    ],
  },
  {
    id: '5f44a656-9f14-426a-8f2b-fa773203500d', // The Rise of Cities and Urban Autonomy: Guilds and Universities
    label: 'Plant 2-5 (Rise of Cities)',
    qr: [
      { label: 'Better deal',          value: "City life sounds like a genuinely better deal — real freedom, mobility, the chance to build something of your own" },
      { label: 'Just different risks', value: "Sounds like different trade-offs to me — new freedoms but also new risks, new obligations, and a new kind of instability" },
    ],
  },
  {
    id: '23ba3299-4afe-4388-97c7-a83ed63476b6', // Judaism in the Christian Worldview: How the Medieval Church Saw Jews
    label: 'Plant 3-1 (Judaism in Christian Worldview)',
    qr: [
      { label: 'Power gap: top vs locals',   value: "The people in power made the rules but couldn't control what locals did — official policy and street-level reality are different things" },
      { label: 'Deliberate double standard', value: "It was deliberately two-faced — official tolerance kept commerce going while local persecution kept Jews subordinate and scapegoatable" },
    ],
  },
  {
    id: 'b4edd0f1-9e5f-495f-9b73-e02e5f1aeb9b', // The Foundations of Islam: Core Beliefs and Connections to Judaism and Christianity
    label: 'Plant 3-2 (Foundations of Islam)',
    qr: [
      { label: 'Shared roots = rival claims', value: "Sharing the same prophets created competition, not unity — each faith claimed to be the true and final version of the same story" },
      { label: 'Politics, not theology',      value: "The conflicts were political and territorial. The shared theology barely mattered when land and power were at stake" },
    ],
  },
  {
    id: '422d3e50-1471-4ab2-a88e-8cc59d226efe', // The Spread of Islam and the Concept of Jihad
    label: 'Plant 3-3 (Spread of Islam / Jihad)',
    qr: [
      { label: 'The inner-struggle meaning', value: "I was most surprised that Jihad's primary meaning in Islamic theology is the internal spiritual struggle — not warfare" },
      { label: 'The speed of spread',        value: "The speed is what hit me — Arabia to Spain in 100 years is one of the fastest expansions in all of human history" },
    ],
  },
  {
    id: 'd7bf2b46-9a7e-4fb5-aad8-f3e0570e07fb', // Jews Under Islamic Rule: The Dhimmi System and the Pact of Umar
    label: 'Plant 3-4 (Dhimmi System)',
    qr: [
      { label: 'Relatively tolerant',  value: "By the standards of the time, the Dhimmi system sounds relatively tolerant — protection and rights that most of Europe didn't offer" },
      { label: 'Still discriminatory', value: "Tolerant by comparison or not, structured inequality is still discrimination — the comparison to worse doesn't make it good" },
    ],
  },
  {
    id: '3f86a535-1083-4fcf-b110-55a8e0933f86', // The Golden Age of Muslim Culture: Science, Philosophy, and Art
    label: 'Plant 3-5 (Golden Age)',
    qr: [
      { label: 'Changes everything',      value: "If the Renaissance came through Islamic scholarship, the whole \"Western vs Islamic\" opposition falls apart — it's a false boundary" },
      { label: "Doesn't erase the label", value: "Even if the sources were shared, what Europe built with that knowledge became its own distinct thing. The label still means something" },
    ],
  },
  {
    id: 'd6b34ae9-f8a0-4acd-96f9-eafb7ba528f1', // The Crusades: Origins, Conflict, and the Jewish Experience
    label: 'Plant 3-6 (Crusades)',
    qr: [
      { label: 'Judge by real-world effects', value: "We judge by outcomes, not intentions — sincerity of belief doesn't change the harm done. Actions matter more than motives" },
      { label: 'Intent still matters',        value: "Intent matters too — people who genuinely believed they were right need to be understood, even when they were catastrophically wrong" },
    ],
  },
  {
    id: 'e2436867-3a92-4b18-9b5b-144eb522f08c', // The Crusader Kingdom of Jerusalem: Structure and Lasting Legacy
    label: 'Plant 3-7 (Crusader Kingdom)',
    qr: [
      { label: 'Coexistence is possible', value: "200 years of co-existing while in conflict shows that annihilation is a choice, not inevitable — coexistence is always possible if people decide it is" },
      { label: 'Violence cancels it out', value: "The violence was too real to call it coexistence. That framing lets the Crusaders off too easy — occupation isn't the same as living together" },
    ],
  },
]

async function main() {
  let missionCount = 0
  let plantCount   = 0

  console.log('Patching missions...')
  for (const { id, label, qr } of missionPatches) {
    const result = await prisma.mission.updateMany({ where: { id }, data: { openingQuickReplies: qr } })
    console.log(`  ${result.count === 1 ? '✓' : '✗'} ${label}`)
    missionCount += result.count
  }

  console.log('Patching plants...')
  for (const { id, label, qr } of plantPatches) {
    const result = await prisma.plant.updateMany({ where: { id }, data: { openingQuickReplies: qr } })
    console.log(`  ${result.count === 1 ? '✓' : '✗'} ${label}`)
    plantCount += result.count
  }

  console.log(`\nDone — ${missionCount}/3 missions, ${plantCount}/16 plants patched.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
