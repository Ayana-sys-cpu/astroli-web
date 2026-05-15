'use client';
import { useState, useEffect } from 'react';
import {
  getStudentId,
  loadStudent,
  getCachedAvatarUrl,
  cacheAvatarUrl,
} from '@/lib/student-store';

export interface AvatarState {
  /** Resolved image URL — signed Cloudinary, public fallback, or null */
  url: string | null;
  /** true while the /api/avatar/status call is in-flight */
  loading: boolean;
  /** true when the URL comes from the AI-generated Cloudinary asset */
  isPersonalized: boolean;
}

/**
 * Fetches the student's avatar from the same Supabase/Cloudinary pipeline
 * used by the mobile app. Mobile-generated avatars are immediately visible
 * on desktop because both platforms read the same `students.avatar_url` record.
 *
 * Resolution order:
 *   1. In-memory TTL cache (avoids redundant API calls within 50 min)
 *   2. GET /api/avatar/status?student_id=... → signed Cloudinary URL
 *   3. base_avatar_url from localStorage (deterministic base image)
 *   4. null  (show SVG fallback in AvatarHero)
 */
export function useAvatar(): AvatarState {
  const [state, setState] = useState<AvatarState>({
    url: null,
    loading: true,
    isPersonalized: false,
  });

  useEffect(() => {
    // 1. Return cached URL immediately if still within TTL
    const cached = getCachedAvatarUrl();
    if (cached) {
      setState({ url: cached, loading: false, isPersonalized: true });
      return;
    }

    const studentId = getStudentId();
    const student   = loadStudent();

    // 2. No student_id yet (guest / not logged in) — fall back to base
    if (!studentId) {
      setState({
        url: student?.baseAvatarUrl ?? null,
        loading: false,
        isPersonalized: false,
      });
      return;
    }

    let cancelled = false;

    fetch(`/api/avatar/status?student_id=${encodeURIComponent(studentId)}`)
      .then((r) => r.json())
      .then((data: { ready: boolean; avatar_url: string | null }) => {
        if (cancelled) return;

        if (data.ready && data.avatar_url) {
          // Personalized avatar confirmed — cache + show
          cacheAvatarUrl(data.avatar_url);
          setState({ url: data.avatar_url, loading: false, isPersonalized: true });
        } else {
          // Avatar not ready yet (still generating on mobile) — show base
          setState({
            url: student?.baseAvatarUrl ?? null,
            loading: false,
            isPersonalized: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            url: student?.baseAvatarUrl ?? null,
            loading: false,
            isPersonalized: false,
          });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
