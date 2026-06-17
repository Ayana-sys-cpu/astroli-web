export interface OrinPlanet {
  icon: string;
  name: string;
  hint: string;
}

export interface WorldBriefItem {
  title: string;
  body:  string;
}

export interface OrinMission {
  order:             number;
  question:          string;
  worldBrief:        string;
  worldBriefSummary: string;
  worldBriefItems:   WorldBriefItem[];
  projectTitle:      string;
  projectObjective:  string;
  openingMessage:    string;
  openingMessage2:   string;
  missionBrief:      string;
  chapter:           string;
  planets:           OrinPlanet[];
  qaAnswers:         string[];
  missionQaAnswers:  string[];
}
