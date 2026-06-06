import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 64, background: '#242424', border: '1px dashed #333', borderRadius: 12, textAlign: 'center', gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,69,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={28} color="#FF4500" />
      </div>
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F5F5F5', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: '0.875rem', color: '#9CA3AF', maxWidth: 360 }}>{description}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
