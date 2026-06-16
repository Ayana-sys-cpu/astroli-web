'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getBrowserClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// useSupabaseRealtime
//
// Subscribes to Postgres Changes on class_mission_state and votes for a given
// class. Replaces all polling (setInterval calls) in the teacher dashboard
// and the student vote/landscape pages.
//
// HOW IT WORKS:
//   Supabase broadcasts a WebSocket event every time a row changes in Postgres.
//   The hook listens on a single channel keyed by classId, handling two events:
//
//   1. class_mission_state INSERT/UPDATE → fires when a teacher changes a
//      mission's state for this class
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
//     classId: journey.id,
//     onMissionStateChange: (mission) => {
//       setFullMissions(prev => ({
//         ...prev,
//         [mission.class_id]: prev[mission.class_id]?.map(m =>
//           m.id === mission.mission_id ? { ...m, state: mission.state } : m
//         ) ?? [],
//       }));
//     },
//     onVoteCast: (vote) => {
//       setVoteCounts(prev => ({
//         ...prev,
//         [vote.class_id]: {
//           ...(prev[vote.class_id] ?? {}),
//           [vote.big_idea_id]: (prev[vote.class_id]?.[vote.big_idea_id] ?? 0) + 1,
//         },
//       }));
//     },
//   });
//
// USAGE (student vote page):
//   useSupabaseRealtime({
//     classId: state.voteJourneyId,
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
  class_id:   string;
  mission_id: string;
  state:      MissionState;
}

export interface RealtimeVote {
  id:          string;
  class_id:    string;
  student_id:  string;
  big_idea_id: string;
}

interface UseSupabaseRealtimeOptions {
  /** The class to watch. Pass null to skip subscription (e.g. before data loads). */
  classId: string | null;
  /** Called when any mission in the class changes state. */
  onMissionStateChange?: (mission: RealtimeMission) => void;
  /** Called when any student casts or changes their vote. */
  onVoteCast?: (vote: RealtimeVote) => void;
}

export function useSupabaseRealtime({
  classId,
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
    if (!classId) return;

    const supabase = getBrowserClient();

    // One channel per class — both mission-state and vote rows ride the same WebSocket.
    const channel = supabase
      .channel(`class-sync:${classId}`)

      // ── Mission state changes ────────────────────────────────────────────
      // Fires when a teacher transitions a mission for this class (e.g.
      // locked→voting or voting→active). State lives in class_mission_state,
      // not on the (shared, template-owned) missions row.
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'class_mission_state',
          filter: `class_id=eq.${classId}`,
        },
        handleMissionChange,
      )
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'class_mission_state',
          filter: `class_id=eq.${classId}`,
        },
        handleMissionChange,
      )

      // ── New vote ─────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'votes',
          filter: `class_id=eq.${classId}`,
        },
        handleVoteChange,
      )

      // ── Vote change ───────────────────────────────────────────────────────
      // Fires when a student changes their vote (upsert on existing row).
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'votes',
          filter: `class_id=eq.${classId}`,
        },
        handleVoteChange,
      )

      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [classId, handleMissionChange, handleVoteChange]);
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
  classId:        string;
  newBigIdeaId:   string;
  prevBigIdeaId:  string | null; // null on first vote; non-null on change
}

interface UseVoteSyncOptions {
  classId: string | null;
  onVoteChange: (event: VoteChangeEvent) => void;
}

export function useSupabaseVoteSync({
  classId,
  onVoteChange,
}: UseVoteSyncOptions): void {
  const onVoteRef    = useRef(onVoteChange);
  onVoteRef.current  = onVoteChange;
  const channelRef   = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!classId) return;

    const supabase = getBrowserClient();

    const channel = supabase
      .channel(`vote-sync:${classId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'votes',
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const row = payload.new as RealtimeVote;
          onVoteRef.current({
            classId:       row.class_id,
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
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const newRow  = payload.new as RealtimeVote;
          const prevRow = payload.old as Partial<RealtimeVote>;
          onVoteRef.current({
            classId:       newRow.class_id,
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
  }, [classId]);
}
