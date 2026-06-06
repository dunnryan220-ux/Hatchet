interface ConnectIntegrationBannerProps {
  integration: string;
  description?: string;
  connectButton?: React.ReactNode;
}

export function ConnectIntegrationBanner({ integration, description, connectButton }: ConnectIntegrationBannerProps) {
  return (
    <div style={{ background: 'rgba(255,69,0,0.08)', border: '1px solid rgba(255,69,0,0.3)', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontWeight: 600, color: '#FF8C00', fontSize: '0.875rem', marginBottom: 2 }}>{integration} not connected</div>
        <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{description || `Connect your ${integration} account to start seeing data.`}</div>
      </div>
      {connectButton && <div>{connectButton}</div>}
    </div>
  );
}
