export interface OrinPlanet {
  icon: string;
  name: string;
  hint: string;
}

export interface MissionTerm {
  label:      string;
  definition: string;
}

export interface OrinMission {
  id:                string;
  order:             number;
  language:          'en' | 'he';
  question:          string;
  projectTitle:      string;
  projectObjective:  string;
  openingMessage:    string;
  openingMessage2:   string;
  missionBrief:      string;
  chapter:           string;
  planets:           OrinPlanet[];
  allTerms:          MissionTerm[];
  qaAnswers:         string[];
  missionQaAnswers:  string[];
}
