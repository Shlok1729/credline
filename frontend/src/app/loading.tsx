export default function Loading() {
  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '3px',
        background: 'transparent',
        zIndex: 9999,
        overflow: 'hidden'
      }}>
        <div style={{
          width: '50%',
          height: '100%',
          background: 'linear-gradient(90deg, var(--accent, #FF2E93), var(--accent-orange, #FF8A00))',
          animation: 'loading-bar 1.5s infinite ease-in-out',
          boxShadow: '0 0 10px rgba(255, 46, 147, 0.5)',
          borderRadius: '4px'
        }} />
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </>
  );
}
