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

// Deterministic base image selection — matches the algorithm in the reveal page
function baseAvatarUrl(studentId: string): string {
  const sum = Array.from(studentId.replace(/-/g, '')).reduce((a, c) => a + c.charCodeAt(0), 0);
  const index = (sum % 10) + 1;
  return `/avatars/base/base-${String(index).padStart(2, '0')}.png`;
}

/**
 * Fetches the student's avatar from the same Supabase/Cloudinary pipeline
 * used by the mobile app. Mobile-generated avatars are immediately visible
 * on desktop because both platforms read the same `students.avatar_url` record.
 *
 * Resolution order:
 *   1. In-memory TTL cache (avoids redundant API calls within 50 min)
 *   2. GET /api/avatar/status?student_id=... → signed Cloudinary URL
 *   3. base_avatar_url from localStorage (set during onboarding reveal)
 *   4. Deterministic base image computed from student ID
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

    // 2. No student_id yet (guest / not logged in)
    if (!studentId) {
      setState({ url: null, loading: false, isPersonalized: false });
      return;
    }

    // Deterministic base image — always available for any logged-in student
    const fallback = student?.baseAvatarUrl ?? baseAvatarUrl(studentId);

    let cancelled = false;

    fetch(`/api/avatar/status?student_id=${encodeURIComponent(studentId)}`)
      .then((r) => r.json())
      .then((data: { ready: boolean; avatar_url: string | null }) => {
        if (cancelled) return;

        if (data.ready && data.avatar_url) {
          cacheAvatarUrl(data.avatar_url);
          setState({ url: data.avatar_url, loading: false, isPersonalized: true });
        } else {
          setState({ url: fallback, loading: false, isPersonalized: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ url: fallback, loading: false, isPersonalized: false });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
