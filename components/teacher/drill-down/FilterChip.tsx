// src/astroli-web/components/teacher/drill-down/FilterChip.tsx
'use client';
import { useEffect, useRef, useState } from 'react';

interface CheckboxOption {
  value: string;
  label: string;
}

interface RadioOption {
  value: string;
  label: string;
}

type ChipMode = 'checkbox' | 'radio';

interface Props {
  label: string;
  mode: ChipMode;
  options: CheckboxOption[] | RadioOption[];
  selectedValues?: string[];
  onChangeCheckbox?: (values: string[]) => void;
  selectedValue?: string;
  onChangeRadio?: (value: string) => void;
  defaultValue?: string;
}

export default function FilterChip({
  label,
  mode,
  options,
  selectedValues = [],
  onChangeCheckbox,
  selectedValue = '',
  onChangeRadio,
  defaultValue = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  let chipText: string;
  if (mode === 'checkbox') {
    if (selectedValues.length === 0) {
      chipText = label;
    } else if (selectedValues.length === 1) {
      const selectedLabel = (options as CheckboxOption[]).find(
        (o) => o.value === selectedValues[0]
      )?.label ?? selectedValues[0];
      chipText = `${label}: ${selectedLabel}`;
    } else {
      chipText = `${label}: ${selectedValues.length} selected`;
    }
  } else {
    chipText =
      selectedValue === defaultValue || !selectedValue
        ? label
        : `${label}: ${(options as RadioOption[]).find((o) => o.value === selectedValue)?.label ?? selectedValue}`;
  }

  const isActive =
    mode === 'checkbox'
      ? selectedValues.length > 0
      : selectedValue !== defaultValue && !!selectedValue;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          borderRadius: 6,
          border: `1px solid ${isActive ? 'rgba(139,0,255,0.4)' : 'rgba(255,255,255,0.75)'}`,
          background: isActive ? 'rgba(139,0,255,0.08)' : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
          color: isActive ? '#8B00FF' : 'rgba(26,26,46,0.55)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {chipText}
        <span style={{ fontSize: 9, opacity: 0.6 }}>
          {open ? '▲' : '▾'}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: 8,
            padding: '8px 0',
            minWidth: 180,
            boxShadow: '0 8px 24px rgba(139,0,255,0.12)',
          }}
        >
          {options.map((opt) => {
            if (mode === 'checkbox') {
              const checked = selectedValues.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 14px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'rgba(26,26,46,0.75)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? selectedValues.filter((v) => v !== opt.value)
                        : [...selectedValues, opt.value];
                      onChangeCheckbox?.(next);
                    }}
                    style={{ accentColor: '#8B00FF' }}
                  />
                  {opt.label}
                </label>
              );
            } else {
              const checked = selectedValue === opt.value;
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 14px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'rgba(26,26,46,0.75)',
                  }}
                >
                  <input
                    type="radio"
                    checked={checked}
                    onChange={() => {
                      onChangeRadio?.(opt.value);
                      setOpen(false);
                    }}
                    style={{ accentColor: '#8B00FF' }}
                  />
                  {opt.label}
                </label>
              );
            }
          })}

          {mode === 'checkbox' && selectedValues.length > 0 && (
            <div
              style={{
                borderTop: '1px solid rgba(26,26,46,0.08)',
                marginTop: 4,
                paddingTop: 4,
              }}
            >
              <button
                onClick={() => onChangeCheckbox?.([])}
                style={{
                  width: '100%',
                  padding: '6px 14px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(26,26,46,0.35)',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
