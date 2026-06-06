export function LoadingSkeleton({ rows = 3, height = 200 }: { rows?: number; height?: number }) {
  return (
    <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: i === 0 ? 20 : height / rows, background: '#333', borderRadius: 4, marginBottom: 12, width: i === 0 ? '40%' : '100%', opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}

export function GridSkeleton({ cols = 4, rows = 1 }: { cols?: number; rows?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24, height: 100 }}>
          <div style={{ height: 12, width: '60%', background: '#333', borderRadius: 4, marginBottom: 12 }} />
          <div style={{ height: 24, width: '40%', background: '#333', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}
