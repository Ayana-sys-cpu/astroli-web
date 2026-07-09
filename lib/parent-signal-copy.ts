// Parent-facing wording for teacher signals — same signal types as lib/signals.ts,
// reworded warmly with a conversation starter instead of teacher actions.

import type { SignalType } from './signals';

type SignalCopy = {
  headline: (name: string, missionTopic?: string | null) => string;
  conversationStarter: (name: string, missionTopic?: string | null) => string;
};

const COPY: Record<SignalType, SignalCopy> = {
  breakthrough: {
    headline: name => `${name} had a breakthrough this week`,
    conversationStarter: (name, topic) =>
      topic
        ? `Ask ${name} what they discovered about ${topic}.`
        : `Ask ${name} what clicked this week — they're probably excited to talk about it.`,
  },
  grace_completion: {
    headline: name => `${name} pushed through and completed a tough mission`,
    conversationStarter: name => `Let ${name} know you noticed they stuck with something hard this week.`,
  },
  stuck: {
    headline: name => `${name} seems stuck — a little encouragement could help`,
    conversationStarter: (name, topic) =>
      topic
        ? `Ask ${name} what feels tricky about ${topic} — talking it through often helps.`
        : `Ask ${name} what part of the mission feels tricky right now.`,
  },
  non_engagement: {
    headline: name => `${name} hasn't visited Astroli this week`,
    conversationStarter: name => `Ask ${name} if they'd like to pick their mission back up together.`,
  },
};

export function getSignalCopy(signalType: SignalType): SignalCopy {
  return COPY[signalType];
}
