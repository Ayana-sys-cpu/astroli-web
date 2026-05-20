'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getBrowserClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// useSupabaseRealtime
//
// Subscribes to Postgres Changes on missions and votes for a given journey.
// Replaces all polling (setInterval calls) in the teacher dashboard and the
// student vote/landscape pages.
//
// HOW IT WORKS:
//   Supabase broadcasts a WebSocket event every time a row changes in Postgres.
//   The hook listens on a single channel keyed by journeyId, handling two events:
//
//   1. missions UPDATE  → fires when a teacher changes mission state
//      Teacher side:  refreshes mission cards (locked → voting → active)
//      Student side:  drives routing (voting state → show vote screen;
//                     active state → show landscape)
//
//   2. votes INSERT/UPDATE → fires when any student casts or changes a vote
//      Teacher side:  increments the live vote tally without polling
//      Student side:  updates classmate vote counts in real time
//
// USAGE (teacher dashboard):
//   useSupabaseRealtime({
//     journeyId: journey.id,
//     onMissionStateChange: (mission) => {
//       setFullMissions(prev => ({
//         ...prev,
//         [mission.journey_id]: prev[mission.journey_id]?.map(m =>
//           m.id === mission.id ? { ...m, state: mission.state } : m
//         ) ?? [],
//       }));
//     },
//     onVoteCast: (vote) => {
//       setVoteCounts(prev => ({
//         ...prev,
//         [vote.journey_id]: {
//           ...(prev[vote.journey_id] ?? {}),
//           [vote.big_idea_id]: (prev[vote.journey_id]?.[vote.big_idea_id] ?? 0) + 1,
//         },
//       }));
//     },
//   });
//
// USAGE (student vote page):
//   useSupabaseRealtime({
//     journeyId: state.voteJourneyId,
//     onMissionStateChange: (mission) => {
//       // Redirect when teacher activates a mission
//       if (mission.state === 'active') router.replace('/landscape');
//     },
//   });
// ---------------------------------------------------------------------------

export type MissionState =
  | 'locked'
  | 'voting'
  | 'pending_start'
  | 'active'
  | 'completed'
  | 'skipped';

export interface RealtimeMission {
  id:            string;
  journey_id:    string;
  question:      string;
  project_title: string;
  state:         MissionState;
  mission_order: number;
}

export interface RealtimeVote {
  id:          string;
  journey_id:  string;
  student_id:  string;
  big_idea_id: string;
}

interface UseSupabaseRealtimeOptions {
  /** The journey to watch. Pass null to skip subscription (e.g. before data loads). */
  journeyId: string | null;
  /** Called when any mission in the journey changes state. */
  onMissionStateChange?: (mission: RealtimeMission) => void;
  /** Called when any student casts or changes their vote. */
  onVoteCast?: (vote: RealtimeVote) => void;
}

export function useSupabaseRealtime({
  journeyId,
  onMissionStateChange,
  onVoteCast,
}: UseSupabaseRealtimeOptions): void {
  // Keep stable refs so the effect doesn't re-subscribe when callbacks change.
  const onMissionRef = useRef(onMissionStateChange);
  const onVoteRef    = useRef(onVoteCast);
  onMissionRef.current = onMissionStateChange;
  onVoteRef.current    = onVoteCast;

  const channelRef = useRef<RealtimeChannel | null>(null);

  const handleMissionChange = useCallback((payload: { new: unknown }) => {
    onMissionRef.current?.(payload.new as RealtimeMission);
  }, []);

  const handleVoteChange = useCallback((payload: { new: unknown }) => {
    onVoteRef.current?.(payload.new as RealtimeVote);
  }, []);

  useEffect(() => {
    if (!journeyId) return;

    const supabase = getBrowserClient();

    // One channel per journey — both missions and votes ride the same WebSocket.
    const channel = supabase
      .channel(`journey-sync:${journeyId}`)

      // ── Mission state changes ────────────────────────────────────────────
      // Fires when a teacher transitions a mission (e.g. locked→voting or
      // voting→active). Both the teacher dashboard and student clients listen
      // to this to update their UI without polling.
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'missions',
          filter: `journey_id=eq.${journeyId}`,
        },
        handleMissionChange,
      )

      // ── New vote ─────────────────────────────────────────────────────────
      // Fires when a student submits their first vote.
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'votes',
          filter: `journey_id=eq.${journeyId}`,
        },
        handleVoteChange,
      )

      // ── Vote change ───────────────────────────────────────────────────────
      // Fires when a student changes their vote (upsert on existing row).
      // The teacher dashboard needs to handle this as a count correction:
      // decrement the old big_idea_id and increment the new one.
      // The old value is available in payload.old — see extended example below.
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'votes',
          filter: `journey_id=eq.${journeyId}`,
        },
        handleVoteChange,
      )

      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [journeyId, handleMissionChange, handleVoteChange]);
}


// ---------------------------------------------------------------------------
// EXTENDED: useSupabaseVoteSync
//
// A vote-specific variant that handles the vote-change correction properly.
// When a student changes their vote, onVoteCast fires but the raw count logic
// above would double-count. This hook carries the previous big_idea_id so the
// caller can decrement the old bucket and increment the new one.
// ---------------------------------------------------------------------------

export interface VoteChangeEvent {
  journeyId:      string;
  newBigIdeaId:   string;
  prevBigIdeaId:  string | null; // null on first vote; non-null on change
}

interface UseVoteSyncOptions {
  journeyId: string | null;
  onVoteChange: (event: VoteChangeEvent) => void;
}

export function useSupabaseVoteSync({
  journeyId,
  onVoteChange,
}: UseVoteSyncOptions): void {
  const onVoteRef    = useRef(onVoteChange);
  onVoteRef.current  = onVoteChange;
  const channelRef   = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!journeyId) return;

    const supabase = getBrowserClient();

    const channel = supabase
      .channel(`vote-sync:${journeyId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'votes',
          filter: `journey_id=eq.${journeyId}`,
        },
        (payload) => {
          const row = payload.new as RealtimeVote;
          onVoteRef.current({
            journeyId:     row.journey_id,
            newBigIdeaId:  row.big_idea_id,
            prevBigIdeaId: null,
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'votes',
          filter: `journey_id=eq.${journeyId}`,
        },
        (payload) => {
          const newRow  = payload.new as RealtimeVote;
          const prevRow = payload.old as Partial<RealtimeVote>;
          onVoteRef.current({
            journeyId:     newRow.journey_id,
            newBigIdeaId:  newRow.big_idea_id,
            prevBigIdeaId: prevRow.big_idea_id ?? null,
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [journeyId]);
}
