interface TokenExpiryWarningProps {
  daysUntilExpiry?: number;
  onReconnect: () => void;
  platform?: string;
  message?: string;
}

export function TokenExpiryWarning({ daysUntilExpiry, onReconnect, platform = 'Facebook', message }: TokenExpiryWarningProps) {
  const expired = daysUntilExpiry === undefined || daysUntilExpiry <= 0;
  const defaultMsg = expired
    ? `Your ${platform} connection has expired. Reconnect to restore data access.`
    : `${platform} token expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Reconnect now to avoid interruption.`;
  return (
    <div style={{ background: expired ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)', border: `1px solid ${expired ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.4)'}`, borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontWeight: 600, color: expired ? '#EF4444' : '#EAB308', fontSize: '0.875rem', marginBottom: 2 }}>
          {expired ? `${platform} connection expired` : `${platform} token expiring soon`}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{message || defaultMsg}</div>
      </div>
      <button onClick={onReconnect} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 6, padding: '8px 16px', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        Reconnect
      </button>
    </div>
  );
}
