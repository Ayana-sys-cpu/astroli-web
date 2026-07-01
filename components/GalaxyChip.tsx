export default function GalaxyChip({ term }: { term: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: 'rgba(119,85,187,0.25)',
      border: '1px solid rgba(160,144,212,0.55)',
      borderRadius: 10,
      padding: '1px 9px 2px',
      direction: 'inherit',
      verticalAlign: 'middle',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#c084fc',
        boxShadow: '0 0 5px 2px rgba(192,132,252,0.75)',
        flexShrink: 0,
        display: 'inline-block',
      }} />
      <span style={{ color: '#c9b0ff', fontWeight: 600 }}>{term}</span>
    </span>
  );
}
