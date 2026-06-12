// src/astroli-web/app/teacher/student/[studentId]/page.tsx
'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import DrillDownHeader from '@/components/teacher/drill-down/DrillDownHeader';
import DrillDownFilters from '@/components/teacher/drill-down/DrillDownFilters';
import SubjectRow from '@/components/teacher/drill-down/SubjectRow';
import ProofPanel from '@/components/teacher/drill-down/ProofPanel';
import type { DrillDownResponse, SubjectSummary, DrillDownFilters as Filters } from '@/lib/drill-down-types';
import { DEFAULT_FILTERS } from '@/lib/drill-down-types';

function timeframeCutoff(timeframe: Filters['timeframe']): Date | null {
  if (timeframe === 'all') return null;
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function applyFilters(subjects: SubjectSummary[], filters: Filters): SubjectSummary[] {
  const cutoff = timeframeCutoff(filters.timeframe);
  const searchLower = filters.search.toLowerCase();

  return subjects.filter((s) => {
    if (searchLower && !s.planetTitle.toLowerCase().includes(searchLower) && !s.journeyTitle.toLowerCase().includes(searchLower)) return false;
    if (filters.journeyIds.length > 0 && !filters.journeyIds.includes(s.journeyId)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(s.status)) return false;
    if (filters.performances.length > 0) {
      const perfMatch = filters.performances.some((p) =>
        p === 'not_assessed' ? s.performanceType === null : s.performanceType === p,
      );
      if (!perfMatch) return false;
    }
    if (cutoff && s.assessedAt) {
      if (new Date(s.assessedAt) < cutoff) return false;
    }
    return true;
  });
}

export default function StudentDrillDownPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [data, setData] = useState<DrillDownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teacher/students/${studentId}/drill-down`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: DrillDownResponse) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [studentId]);

  const filteredSubjects = useMemo(
    () => applyFilters(data?.subjects ?? [], filters),
    [data, filters],
  );

  const selectedSubject = useMemo(
    () => filteredSubjects.find((s) => s.planetId === selectedPlanetId) ?? null,
    [filteredSubjects, selectedPlanetId],
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span
          style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed',
            animation: 'spin 0.8s linear infinite', display: 'inline-block',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontSize: 13, color: '#ef4444' }}>
          {error ?? 'Student not found.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DrillDownHeader student={data.student} />

      <DrillDownFilters
        filters={pendingFilters}
        journeys={data.journeys}
        onChange={setPendingFilters}
        onSearch={() => { setFilters(pendingFilters); setSelectedPlanetId(null); }}
      />

      {/* Subject list + proof panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', marginTop: 12 }}>
        {/* Subject list */}
        <div
          style={{
            flex: selectedSubject ? '0 0 55%' : '1 1 100%',
            overflowY: 'auto',
            borderRight: selectedSubject ? '1px solid rgba(232,232,240,0.08)' : 'none',
            transition: 'flex-basis 0.2s ease',
          }}
        >
          {filteredSubjects.length === 0 ? (
            <p style={{ padding: '20px', fontSize: 13, color: 'rgba(232,232,240,0.35)' }}>
              No subjects match your filters.
            </p>
          ) : (
            filteredSubjects.map((subject) => (
              <SubjectRow
                key={subject.planetId}
                subject={subject}
                isSelected={subject.planetId === selectedPlanetId}
                onOpenProof={() =>
                  setSelectedPlanetId((prev) =>
                    prev === subject.planetId ? null : subject.planetId,
                  )
                }
              />
            ))
          )}
        </div>

        {/* Proof panel */}
        {selectedSubject && (
          <ProofPanel
            subject={selectedSubject}
            onClose={() => setSelectedPlanetId(null)}
          />
        )}
      </div>
    </div>
  );
}
