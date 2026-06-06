'use client';

import { useState, useEffect } from 'react';
import { User, Users, Plug, FileText, Save, Eye, EyeOff, Mail, Calendar, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';

type Tab = 'profile' | 'team' | 'integrations' | 'reports';

const inputStyle: React.CSSProperties = {
  background: '#1A1A1A', border: '1px solid #444', borderRadius: 8,
  padding: '9px 12px', color: '#F5F5F5', fontSize: '0.875rem', width: '100%',
  outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 5,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
};

const sectionStyle: React.CSSProperties = {
  background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 20,
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile
  const [profileForm, setProfileForm] = useState({ name: '', email: '', agencyName: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Reports
  const [reportForm, setReportForm] = useState({ frequency: 'monthly', emails: '', includeGA4: true, includeGoogleAds: true, includeGBP: true, includeFBAds: true, includeFBOrganic: true });

  useEffect(() => {
    if (session?.user) {
      setProfileForm(f => ({
        ...f,
        name: session.user.name || '',
        email: session.user.email || '',
      }));
    }
  }, [session]);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      showSaved();
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      if (res.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showSaved();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to update password');
      }
    } finally { setSaving(false); }
  };

  const handleSaveReports = async () => {
    setSaving(true);
    try {
      await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });
      showSaved();
    } finally { setSaving(false); }
  };

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const tabStyle = (id: Tab): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
    background: activeTab === id ? 'rgba(255,69,0,0.12)' : 'transparent',
    border: 'none', borderRadius: 8,
    borderLeft: activeTab === id ? '3px solid #FF4500' : '3px solid transparent',
    color: activeTab === id ? '#FF4500' : '#9CA3AF',
    fontWeight: activeTab === id ? 600 : 400, fontSize: '0.875rem', cursor: 'pointer',
    width: '100%', textAlign: 'left',
  });

  const PasswordInput = ({ label, value, onChange, show, onToggle }: any) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          style={{ ...inputStyle, paddingRight: 40 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
        />
        <button onClick={onToggle} type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  const SaveButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={saving}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: saved ? '#22C55E' : '#FF4500', border: 'none', borderRadius: 8, padding: '10px 20px', color: 'white', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', transition: 'background 0.3s' }}
    >
      <Save size={15} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
    </button>
  );

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', color: '#F5F5F5', fontWeight: 700 }}>Settings</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Tab Sidebar */}
        <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tabs.map(tab => (
            <button key={tab.id} style={tabStyle(tab.id)} onClick={() => setActiveTab(tab.id)}>
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'profile' && (
            <>
              <div style={sectionStyle}>
                <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Personal Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input style={inputStyle} value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={{ ...inputStyle, opacity: 0.6 }} value={profileForm.email} readOnly />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Agency Name</label>
                    <input style={inputStyle} value={profileForm.agencyName} onChange={e => setProfileForm(f => ({ ...f, agencyName: e.target.value }))} placeholder="Your agency name" />
                  </div>
                </div>
                <SaveButton onClick={handleSaveProfile} />
              </div>

              <div style={sectionStyle}>
                <h3 style={{ margin: '0 0 20px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Change Password</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, marginBottom: 20 }}>
                  <PasswordInput label="Current Password" value={passwordForm.currentPassword} onChange={(v: string) => setPasswordForm(f => ({ ...f, currentPassword: v }))} show={showCurrentPw} onToggle={() => setShowCurrentPw(v => !v)} />
                  <PasswordInput label="New Password" value={passwordForm.newPassword} onChange={(v: string) => setPasswordForm(f => ({ ...f, newPassword: v }))} show={showNewPw} onToggle={() => setShowNewPw(v => !v)} />
                  <div>
                    <label style={labelStyle}>Confirm New Password</label>
                    <input type={showNewPw ? 'text' : 'password'} style={inputStyle} value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="••••••••" />
                    {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#EF4444' }}>Passwords do not match</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                  style={{ background: '#333', border: 'none', borderRadius: 8, padding: '10px 20px', color: '#F5F5F5', fontWeight: 600, cursor: 'pointer', opacity: !passwordForm.currentPassword || !passwordForm.newPassword ? 0.5 : 1 }}
                >
                  Update Password
                </button>
              </div>
            </>
          )}

          {activeTab === 'team' && (
            <div style={sectionStyle}>
              <h3 style={{ margin: '0 0 8px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Team Management</h3>
              <p style={{ margin: '0 0 20px', color: '#9CA3AF', fontSize: '0.875rem' }}>Manage client access from the Clients page — select a client and click "Access" to grant or revoke user access.</p>
              <div style={{ background: '#1A1A1A', borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #FF4500, #FF8C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
                  {(session?.user?.name || session?.user?.email || 'O').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F5F5F5' }}>{session?.user?.name || session?.user?.email}</div>
                  <div style={{ fontSize: '0.75rem', color: '#FF4500', fontWeight: 600 }}>OWNER</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div style={sectionStyle}>
              <h3 style={{ margin: '0 0 8px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Integration Settings</h3>
              <p style={{ margin: '0 0 20px', color: '#9CA3AF', fontSize: '0.875rem' }}>
                Connect integrations per-client from the Clients page. Enter the integration IDs (GA4 Property ID, Google Ads Customer ID, etc.) when creating or editing a client. OAuth connections (GBP, Facebook) are initiated from each analytics page.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { name: 'Google Analytics 4', desc: 'Set GA4 Property ID on each client profile', icon: '📊' },
                  { name: 'Google Ads', desc: 'Set Customer ID on each client profile', icon: '🎯' },
                  { name: 'Google Business Profile', desc: 'Connect via OAuth from the GBP analytics page', icon: '📍' },
                  { name: 'Facebook / Instagram', desc: 'Connect via OAuth from the Social Organic page', icon: '📱' },
                  { name: 'SEMrush', desc: 'Set SEMRUSH_API_KEY in your environment variables', icon: '🔍' },
                ].map(integration => (
                  <div key={integration.name} style={{ background: '#1A1A1A', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: '1.5rem' }}>{integration.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F5F5F5' }}>{integration.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{integration.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div style={sectionStyle}>
              <h3 style={{ margin: '0 0 8px', color: '#F5F5F5', fontSize: '1rem', fontWeight: 600 }}>Automated Reports</h3>
              <p style={{ margin: '0 0 20px', color: '#9CA3AF', fontSize: '0.875rem' }}>Schedule automated PDF report delivery to client emails.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Delivery Frequency</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={reportForm.frequency}
                    onChange={e => setReportForm(f => ({ ...f, frequency: e.target.value }))}
                  >
                    <option value="weekly">Weekly (every Monday)</option>
                    <option value="monthly">Monthly (1st of month)</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Recipient Emails (comma-separated)</label>
                  <input
                    style={inputStyle}
                    value={reportForm.emails}
                    onChange={e => setReportForm(f => ({ ...f, emails: e.target.value }))}
                    placeholder="client@example.com, manager@example.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Include Modules</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                    {[
                      { key: 'includeGA4', label: 'GA4 Analytics' },
                      { key: 'includeGoogleAds', label: 'Google Ads' },
                      { key: 'includeGBP', label: 'Google Business' },
                      { key: 'includeFBAds', label: 'Facebook Ads' },
                      { key: 'includeFBOrganic', label: 'Social Organic' },
                    ].map(({ key, label }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 12px', background: '#1A1A1A', borderRadius: 6, border: `1px solid ${(reportForm as any)[key] ? '#FF4500' : '#333'}` }}>
                        <input
                          type="checkbox"
                          checked={(reportForm as any)[key]}
                          onChange={e => setReportForm(f => ({ ...f, [key]: e.target.checked }))}
                          style={{ accentColor: '#FF4500' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#F5F5F5' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <SaveButton onClick={handleSaveReports} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
