export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type VoteSubmitFailure = 'session_closed' | 'retryable';

// POST /api/votes returns 404 when the session is missing or no longer open,
// and 409 on a state conflict — both mean "this vote just concluded", so the
// page should re-fetch journey state instead of letting the student retry.
export function classifyVoteSubmitFailure(status: number): VoteSubmitFailure {
  return status === 404 || status === 409 ? 'session_closed' : 'retryable';
}

export function formatCountdown(endIso: string): string {
  const diff = Math.max(0, new Date(endIso).getTime() - Date.now());
  const s = Math.floor(diff / 1000) % 60;
  const m = Math.floor(diff / 60_000) % 60;
  const h = Math.floor(diff / 3_600_000) % 24;
  const d = Math.floor(diff / 86_400_000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
