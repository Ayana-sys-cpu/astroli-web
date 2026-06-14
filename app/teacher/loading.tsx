export default function TeacherLoading() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    }}>
      <div style={{
        fontFamily: 'var(--font-space)',
        fontSize: 11,
        letterSpacing: '0.15em',
        color: 'rgba(26,26,46,0.3)',
      }}>
        LOADING…
      </div>
    </div>
  );
}
