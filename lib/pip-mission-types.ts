// =============================================================================
// Pip Guide — shared TypeScript interfaces
//
// Pure type definitions only — no runtime data.
// Used by:
//   - app/api/mission/route.ts  (API route that reads from DB)
//   - app/pip-guide/page.tsx    (standalone page)
//   - components/PipGuidePanel.tsx (sidebar panel)
// =============================================================================

export interface PipPlanet {
  icon: string;
  name: string; // = plant label
  hint: string; // short one-line description
}

export interface WorldBriefItem {
  title: string;
  body:  string; // may contain HTML (<strong>, <em>)
}

export interface PipMission {
  order:             number;
  question:          string;           // the Big Question
  worldBrief:        string;           // question_description — plain text, used as fallback
  worldBriefSummary: string;           // one-liner shown in the collapsed card header
  worldBriefItems:   WorldBriefItem[]; // colored stripe cards in the expanded brief
  projectTitle:      string;
  projectObjective:  string;           // first paragraph of project_description (truncated)
  openingMessage:    string;           // first Pip message
  openingMessage2:   string;           // second Pip message (before World Brief CTA)
  missionBrief:      string;           // short label for the header brief bar
  chapter:           string;           // e.g. "Medieval History · Ch.1"
  planets:           PipPlanet[];
  qaAnswers:         string[];         // canned Pip answers during era Q&A phase
  missionQaAnswers:  string[];         // canned Pip answers about the mission/project
}
