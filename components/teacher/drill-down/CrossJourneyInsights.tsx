'use client';
import type { DrillDownResponse } from '@/lib/drill-down-types';
import { performanceLabel } from '@/lib/drill-down-types';

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12.002 0C5.373 0 0 5.373 0 12.002c0 2.117.554 4.1 1.524 5.823L0 24l6.335-1.508A11.952 11.952 0 0 0 12.002 24C18.63 24 24 18.628 24 12.002 24 5.373 18.63 0 12.002 0zm0 21.818a9.816 9.816 0 0 1-5.003-1.372l-.359-.213-3.757.894.952-3.653-.234-.375a9.816 9.816 0 0 1-1.508-5.097c0-5.42 4.41-9.83 9.83-9.83 5.42 0 9.83 4.41 9.83 9.83 0 5.42-4.41 9.816-9.751 9.816z"/>
  </svg>
);

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      color: 'rgba(26,26,46,0.65)',
      background: 'rgba(26,26,46,0.05)',
      border: '1px solid rgba(26,26,46,0.08)',
      borderRadius: 20,
      padding: '3px 10px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

interface Props {
  data: DrillDownResponse;
  studentFirstName: string;
}

export default function CrossJourneyInsights({ data, studentFirstName }: Props) {
  const { crossJourneyStats: stats, prewrittenMessage } = data;

  const hasAssessedGoals = stats.peakPerformanceType !== null;

  function handleWhatsApp() {
    if (!hasAssessedGoals) return;
    const encoded = encodeURIComponent(prewrittenMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }

  const peakLabel = stats.peakPerformanceType ? performanceLabel(stats.peakPerformanceType) : null;

  return (
    <div style={{
      borderTop: '1px solid rgba(26,26,46,0.08)',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,26,46,0.6)', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
          All Journeys
        </span>

        {stats.weeklyExplorationChangePercent !== null && (
          <StatChip>
            {stats.weeklyExplorationChangePercent >= 0 ? '↗' : '↘'}{' '}
            Exploring {stats.weeklyExplorationChangePercent >= 0 ? '+' : ''}{stats.weeklyExplorationChangePercent}% vs last week
          </StatChip>
        )}

        {peakLabel && stats.peakJourneyTitle && (
          <StatChip>
            Peak level: {peakLabel} ({stats.peakJourneyTitle})
          </StatChip>
        )}

        {stats.totalMissionsCount > 0 && (
          <StatChip>
            {stats.activeMissionsCount} of {stats.totalMissionsCount} missions active
          </StatChip>
        )}
      </div>

      {/* WhatsApp CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <button
          className="dd-btn"
          onClick={handleWhatsApp}
          disabled={!hasAssessedGoals}
          title={hasAssessedGoals ? undefined : `Review ${studentFirstName}'s work first — the message is ready once goals are assessed`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 16px',
            background: hasAssessedGoals ? '#25D366' : 'rgba(26,26,46,0.12)',
            border: 'none',
            borderRadius: 10,
            color: hasAssessedGoals ? '#fff' : 'rgba(26,26,46,0.35)',
            fontSize: 13,
            fontWeight: 600,
            cursor: hasAssessedGoals ? 'pointer' : 'not-allowed',
            transition: 'opacity 0.15s',
            opacity: hasAssessedGoals ? 1 : 0.6,
          }}
          onMouseEnter={(e) => { if (hasAssessedGoals) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { if (hasAssessedGoals) e.currentTarget.style.opacity = '1'; }}
        >
          <WhatsAppIcon />
          Send {studentFirstName} an encouragement ↗
        </button>
        <span style={{ fontSize: 10, color: 'rgba(26,26,46,0.35)' }}>
          {hasAssessedGoals
            ? 'Pre-drafted by Claude · you edit before sending · WhatsApp will ask you who to send it to'
            : 'Available once goals are assessed'}
        </span>
      </div>
    </div>
  );
}
