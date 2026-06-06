'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Key, CheckCircle, XCircle, Globe, BarChart2, Layers, MapPin, TrendingUp } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { EmptyState } from '@/components/dashboard/EmptyState';

interface Client {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  ga4PropertyId: string | null;
  googleAdsCustomerId: string | null;
  gbpLocationId: string | null;
  fbPageId: string | null;
  fbAdAccountId: string | null;
  igAccountId: string | null;
  fbAccessToken: string | null;
  fbTokenExpiresAt: string | null;
  _count?: { keywords: number; budgets: number };
}

interface ClientAccess {
  id: string;
  userId: string;
  user: { email: string; name: string | null };
  grantedAt: string;
}

const IntegrationBadge = ({ connected, label }: { connected: boolean; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 600 }}>
    {connected
      ? <CheckCircle size={11} style={{ color: '#22C55E' }} />
      : <XCircle size={11} style={{ color: '#555' }} />}
    <span style={{ color: connected ? '#22C55E' : '#555' }}>{label}</span>
  </div>
);

const inputStyle: React.CSSProperties = {
  background: '#1A1A1A', border: '1px solid #444', borderRadius: 8,
  padding: '8px 12px', color: '#F5F5F5', fontSize: '0.875rem', width: '100%', outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 4,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
};

export default function ClientsPage() {
  const { data: session } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [accessClient, setAccessClient] = useState<Client | null>(null);
  const [accessList, setAccessList] = useState<ClientAccess[]>([]);
  const [newAccessEmail, setNewAccessEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', industry: '', website: '',
    ga4PropertyId: '', googleAdsCustomerId: '',
    gbpLocationId: '', fbPageId: '', fbAdAccountId: '', igAccountId: '',
  });

  useEffect(() => { fetchClients(); }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      if (res.ok) setClients(await res.json());
    } finally { setLoading(false); }
  }

  const openAdd = () => {
    setForm({ name: '', industry: '', website: '', ga4PropertyId: '', googleAdsCustomerId: '', gbpLocationId: '', fbPageId: '', fbAdAccountId: '', igAccountId: '' });
    setEditingClient(null);
    setShowAddForm(true);
  };

  const openEdit = (client: Client) => {
    setForm({
      name: client.name,
      industry: client.industry || '',
      website: client.website || '',
      ga4PropertyId: client.ga4PropertyId || '',
      googleAdsCustomerId: client.googleAdsCustomerId || '',
      gbpLocationId: client.gbpLocationId || '',
      fbPageId: client.fbPageId || '',
      fbAdAccountId: client.fbAdAccountId || '',
      igAccountId: client.igAccountId || '',
    });
    setEditingClient(client);
    setShowAddForm(true);
  };

  const openAccess = async (client: Client) => {
    setAccessClient(client);
    const res = await fetch(`/api/clients/${client.id}/access`);
    if (res.ok) setAccessList(await res.json());
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingClient) {
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        if (res.ok) { setShowAddForm(false); setEditingClient(null); fetchClients(); }
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        if (res.ok) { setShowAddForm(false); fetchClients(); }
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"? This will remove all associated data.`)) return;
    setDeletingId(id);
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      fetchClients();
    } finally { setDeletingId(null); }
  };

  const handleGrantAccess = async () => {
    if (!accessClient || !newAccessEmail.trim()) return;
    const res = await fetch(`/api/clients/${accessClient.id}/access`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newAccessEmail.trim() }),
    });
    if (res.ok) {
      setNewAccessEmail('');
      const updated = await fetch(`/api/clients/${accessClient.id}/access`);
      if (updated.ok) setAccessList(await updated.json());
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    if (!accessClient) return;
    await fetch(`/api/clients/${accessClient.id}/access`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessId }),
    });
    const updated = await fetch(`/api/clients/${accessClient.id}/access`);
    if (updated.ok) setAccessList(await updated.json());
  };

  const isOwner = session?.user?.role === 'OWNER';

  if (!isOwner) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Users size={40} style={{ color: '#9CA3AF', marginBottom: 12 }} />
        <h2 style={{ color: '#F5F5F5', marginBottom: 8 }}>Access Restricted</h2>
        <p style={{ color: '#9CA3AF' }}>Only agency owners can manage clients.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: '#F5F5F5', fontWeight: 700 }}>Clients</h2>
        <button
          onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FF4500', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <Plus size={15} /> Add Client
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 16, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 24px', color: '#F5F5F5', fontWeight: 700 }}>
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Client Name *</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div>
                <label style={labelStyle}>Industry</label>
                <input style={inputStyle} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Healthcare" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Website</label>
                <input style={inputStyle} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #333', paddingTop: 20, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 16px', color: '#9CA3AF', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Integrations</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>GA4 Property ID</label>
                  <input style={inputStyle} value={form.ga4PropertyId} onChange={e => setForm(f => ({ ...f, ga4PropertyId: e.target.value }))} placeholder="properties/123456789" />
                </div>
                <div>
                  <label style={labelStyle}>Google Ads Customer ID</label>
                  <input style={inputStyle} value={form.googleAdsCustomerId} onChange={e => setForm(f => ({ ...f, googleAdsCustomerId: e.target.value }))} placeholder="123-456-7890" />
                </div>
                <div>
                  <label style={labelStyle}>GBP Location ID</label>
                  <input style={inputStyle} value={form.gbpLocationId} onChange={e => setForm(f => ({ ...f, gbpLocationId: e.target.value }))} placeholder="locations/1234567890" />
                </div>
                <div>
                  <label style={labelStyle}>FB Page ID</label>
                  <input style={inputStyle} value={form.fbPageId} onChange={e => setForm(f => ({ ...f, fbPageId: e.target.value }))} placeholder="123456789" />
                </div>
                <div>
                  <label style={labelStyle}>FB Ad Account ID</label>
                  <input style={inputStyle} value={form.fbAdAccountId} onChange={e => setForm(f => ({ ...f, fbAdAccountId: e.target.value }))} placeholder="act_123456789" />
                </div>
                <div>
                  <label style={labelStyle}>IG Account ID</label>
                  <input style={inputStyle} value={form.igAccountId} onChange={e => setForm(f => ({ ...f, igAccountId: e.target.value }))} placeholder="123456789" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                style={{ background: '#FF4500', border: 'none', borderRadius: 8, padding: '10px 24px', color: 'white', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}
              >
                {saving ? 'Saving...' : editingClient ? 'Save Changes' : 'Create Client'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setEditingClient(null); }}
                style={{ background: 'transparent', border: '1px solid #333', borderRadius: 8, padding: '10px 24px', color: '#9CA3AF', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Management Modal */}
      {accessClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 8px', color: '#F5F5F5', fontWeight: 700 }}>Access — {accessClient.name}</h3>
            <p style={{ margin: '0 0 20px', color: '#9CA3AF', fontSize: '0.875rem' }}>Grant client users access to this profile.</p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={newAccessEmail}
                onChange={e => setNewAccessEmail(e.target.value)}
                placeholder="client@example.com"
                onKeyDown={e => e.key === 'Enter' && handleGrantAccess()}
              />
              <button
                onClick={handleGrantAccess}
                disabled={!newAccessEmail.trim()}
                style={{ background: '#FF4500', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !newAccessEmail.trim() ? 0.5 : 1 }}
              >
                Grant Access
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {accessList.length === 0 && (
                <p style={{ color: '#9CA3AF', fontSize: '0.875rem', textAlign: 'center', padding: '20px 0' }}>No users have access yet.</p>
              )}
              {accessList.map(access => (
                <div key={access.id} style={{ background: '#1A1A1A', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#F5F5F5', fontWeight: 600 }}>{access.user.name || access.user.email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{access.user.email}</div>
                  </div>
                  <button
                    onClick={() => handleRevokeAccess(access.id)}
                    style={{ background: 'transparent', border: '1px solid #444', borderRadius: 6, padding: '4px 10px', color: '#EF4444', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setAccessClient(null)}
              style={{ background: 'transparent', border: '1px solid #333', borderRadius: 8, padding: '8px 20px', color: '#9CA3AF', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Clients Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 24, height: 100 }} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Clients Yet"
          description="Add your first client to start managing their marketing data."
          action={<button onClick={openAdd} style={{ background: 'linear-gradient(135deg, #FF4500, #FF8C00)', border: 'none', borderRadius: 8, padding: '10px 20px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Add First Client</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clients.map(client => (
            <div key={client.id} style={{ background: '#242424', border: '1px solid #333', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #FF4500, #FF8C00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F5F5F5' }}>{client.name}</div>
                      {(client.industry || client.website) && (
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', gap: 10 }}>
                          {client.industry && <span>{client.industry}</span>}
                          {client.website && <a href={client.website} target="_blank" rel="noopener noreferrer" style={{ color: '#8B9DC3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}><Globe size={10} />{client.website.replace(/^https?:\/\//, '')}</a>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <IntegrationBadge connected={!!client.ga4PropertyId} label="GA4" />
                    <IntegrationBadge connected={!!client.googleAdsCustomerId} label="Google Ads" />
                    <IntegrationBadge connected={!!client.gbpLocationId} label="GBP" />
                    <IntegrationBadge connected={!!client.fbPageId} label="FB Page" />
                    <IntegrationBadge connected={!!client.fbAdAccountId} label="FB Ads" />
                    <IntegrationBadge connected={!!client.igAccountId} label="Instagram" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => openAccess(client)}
                    title="Manage Access"
                    style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, padding: '8px 10px', color: '#8B9DC3', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <Key size={14} /> Access
                  </button>
                  <button
                    onClick={() => openEdit(client)}
                    title="Edit Client"
                    style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, padding: '8px 10px', color: '#9CA3AF', cursor: 'pointer' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    disabled={deletingId === client.id}
                    title="Delete Client"
                    style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 8, padding: '8px 10px', color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
