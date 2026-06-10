// src/astroli-web/components/teacher/students/StudentGrid.tsx
'use client';
import { useState, useMemo } from 'react';
import StudentCard from './StudentCard';
import type { StudentSummary } from '@/app/api/teacher/students/route';

interface Journey { id: string; title: string; }

interface StudentGridProps {
  students: StudentSummary[];
  journeys: Journey[];
  onStudentClick: (studentId: string) => void;
}

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="5" /><line x1="10.5" y1="10.5" x2="14" y2="14" strokeLinecap="round" />
  </svg>
);

const FilterIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
  </svg>
);

export default function StudentGrid({ students, journeys, onStudentClick }: StudentGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | 'all'>('all');

  const filtered = useMemo(() => {
    let result = students;
    if (selectedJourneyId !== 'all') {
      result = result.filter((s) => s.journeyEnrollments.some((je) => je.journeyId === selectedJourneyId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    return result;
  }, [students, selectedJourneyId, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e8eaed', padding: '16px 24px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>All Students</h1>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>{students.length} students</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex' }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              aria-label="Search students"
              placeholder="Search student…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 12px 7px 32px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, color: '#374151', background: '#f9fafb', outline: 'none' }}
            />
          </div>
          {/* Journey filter */}
          <div style={{ position: 'relative' }}>
            <select
              aria-label="Filter by journey"
              value={selectedJourneyId}
              onChange={(e) => setSelectedJourneyId(e.target.value)}
              style={{ appearance: 'none', padding: '7px 32px 7px 12px', border: '1px solid #e5e7eb', borderRadius: 7, background: '#ffffff', fontSize: 13, color: '#374151', cursor: 'pointer', outline: 'none' }}
            >
              <option value="all">All Journeys</option>
              {journeys.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }}>
              <FilterIcon />
            </span>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 24px 0', scrollbarWidth: 'none' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>
              {students.length === 0 ? 'No students enrolled yet.' : 'No students match your search.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingBottom: 24 }}>
            {filtered.map((student) => (
              <StudentCard key={student.studentId} student={student} onClick={onStudentClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
