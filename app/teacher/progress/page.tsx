// src/astroli-web/app/teacher/progress/page.tsx
// Students screen — fetches enrolled students and renders the card grid.
// Card click navigates to Student Drill-Down (route defined in the next plan).
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentGrid from '@/components/teacher/students/StudentGrid';
import type { StudentSummary } from '@/app/api/teacher/students/route';

interface Journey { id: string; title: string; }
interface StudentsPayload { students: StudentSummary[]; journeys: Journey[]; }

export default function StudentsPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/teacher/students')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: StudentsPayload) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontSize: 13, color: '#ef4444' }}>Failed to load students: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f7' }}>
      <StudentGrid
        students={data?.students ?? []}
        journeys={data?.journeys ?? []}
        onStudentClick={(id) => router.push(`/teacher/student/${id}`)}
      />
    </div>
  );
}
