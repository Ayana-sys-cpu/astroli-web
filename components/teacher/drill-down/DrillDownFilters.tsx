// src/astroli-web/components/teacher/drill-down/DrillDownFilters.tsx
'use client';
import FilterChip from './FilterChip';
import type { DrillDownFilters } from '@/lib/drill-down-types';

interface Journey {
  id: string;
  title: string;
}

interface Props {
  filters: DrillDownFilters;
  journeys: Journey[];
  onChange: (filters: DrillDownFilters) => void;
  onSearch: () => void;
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const PERFORMANCE_OPTIONS = [
  { value: 'explaining', label: 'Explaining' },
  { value: 'mustering_evidence', label: 'Mustering Evidence' },
  { value: 'finding_examples', label: 'Finding Examples' },
  { value: 'generalizing', label: 'Generalizing' },
  { value: 'applying_concepts', label: 'Applying Concepts' },
  { value: 'analogizing', label: 'Analogizing' },
  {
    value: 'representing_in_new_ways',
    label: 'Representing in New Ways',
  },
  { value: 'considering_alternatives', label: 'Considering Alternatives' },
  { value: 'actionable_extrapolation', label: 'Actionable Extrapolation' },
  { value: 'grace_completion', label: 'Grace Completion' },
  { value: 'not_assessed', label: 'Not assessed' },
];

const TIMEFRAME_OPTIONS = [
  { value: '7d', label: 'Last week' },
  { value: '30d', label: 'Last month' },
  { value: '90d', label: 'Last 3 months' },
  { value: 'all', label: 'All time' },
];

export default function DrillDownFilters({
  filters,
  journeys,
  onChange,
  onSearch,
}: Props) {
  const journeyOptions = journeys.map((j) => ({
    value: j.id,
    label: j.title,
  }));

  return (
    <div
      style={{
        padding: '12px 20px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Search bar */}
      <input
        type="text"
        placeholder="Search subject..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch();
        }}
        style={{
          width: '100%',
          padding: '8px 14px',
          background: '#0E0E18',
          border: '1px solid rgba(232,232,240,0.12)',
          borderRadius: 8,
          color: 'rgba(232,232,240,0.9)',
          fontSize: 13,
          outline: 'none',
          colorScheme: 'dark',
          boxSizing: 'border-box',
        }}
      />

      {/* Filter chip row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'nowrap',
          overflowX: 'auto',
        }}
      >
        <FilterChip
          label="Journey"
          mode="checkbox"
          options={journeyOptions}
          selectedValues={filters.journeyIds}
          onChangeCheckbox={(v) =>
            onChange({ ...filters, journeyIds: v })
          }
        />
        <FilterChip
          label="Status"
          mode="checkbox"
          options={STATUS_OPTIONS}
          selectedValues={filters.statuses}
          onChangeCheckbox={(v) =>
            onChange({
              ...filters,
              statuses: v as DrillDownFilters['statuses'],
            })
          }
        />
        <FilterChip
          label="Performance"
          mode="checkbox"
          options={PERFORMANCE_OPTIONS}
          selectedValues={filters.performances}
          onChangeCheckbox={(v) =>
            onChange({ ...filters, performances: v })
          }
        />
        <FilterChip
          label="Timeframe"
          mode="radio"
          options={TIMEFRAME_OPTIONS}
          selectedValue={filters.timeframe}
          defaultValue="all"
          onChangeRadio={(v) =>
            onChange({
              ...filters,
              timeframe: v as DrillDownFilters['timeframe'],
            })
          }
        />
        <button
          onClick={onSearch}
          style={{
            padding: '5px 14px',
            background: '#7c3aed',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Search
        </button>
      </div>
    </div>
  );
}
