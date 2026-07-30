import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, ChevronRight, User, Building2, Trash2, Edit2, Search, X, LogOut } from 'lucide-react';

const SECTORS_AND_ROLES = {
  'SST': ['Técnico', 'Supervisor'],
  'Clínica': ['Enfermagem', 'Médico', 'Recepcionista'],
  'Administrativo': ['Financeiro', 'RH', 'Gerente'],
  'Diretoria': ['Admin']
};

const ProfileSetup = () => {
  const { session, userProfile, userLinks, refreshProfile, setActiveLink } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [showNewLinkModal, setShowNewLinkModal] = useState(false);
  
  // Modal State
  const [name, setName] = useState(userProfile?.name || session?.user?.user_metadata?.full_name || '');
  const [sector, setSector] = useState('');
  const [role, setRole] = useState('');
  const [modalError, setModalError] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fullName = userProfile?.name || session?.user?.user_metadata?.full_name || 'Usuário';

  const handleRefresh = async () => {
    setLoading(true);
    await refreshProfile();
    setLoading(false);
  };

  const handleAccess = (link) => {
    if (link.status === 'approved') {
      setActiveLink(link); // This will unblock AppLayout with the specific sector/role
    }
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();
    if (!sector || !role) {
      setModalError('Por favor, preencha todos os campos.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      // First, ensure profile name is updated if it changed
      if (name && name !== userProfile?.name) {
        await supabase
          .from('profiles')
          .update({ name })
          .eq('id', session.user.id);
      }

      // Check if user already has this exact link pending or approved
      const existingLink = userLinks.find(l => l.sector === sector && l.role === role);
      if (existingLink) {
        throw new Error(`Você já possui um vínculo de ${role} em ${sector} com status: ${existingLink.status}.`);
      }

      // Insert new link request
      const { error: insertError } = await supabase
        .from('user_links')
        .insert({
          user_id: session.user.id,
          sector,
          role,
          status: 'pending'
        });

      if (insertError) throw insertError;

      await refreshProfile();
      setShowNewLinkModal(false);
      setSector('');
      setRole('');
      
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header style={{ 
        backgroundColor: 'var(--surface)', 
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo-totalsafety.png" alt="TotalSafety" style={{ height: '40px', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold'
            }}>
              {fullName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>{fullName}</span>
          </div>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>
          <button 
            onClick={() => useAuth().signOut()}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500'
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '2rem' }}>
        
        {/* Breadcrumb */}
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Início</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-primary)' }}>Escolher Vínculo</span>
        </div>

        {/* Welcome Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Olá, {fullName}!
          </h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Selecione o vínculo para acesso
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleRefresh}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--primary)', 
                  backgroundColor: 'transparent', color: 'var(--primary)', fontWeight: '500',
                  cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s'
                }}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} />
                Atualizar vínculos
              </button>
              <button 
                onClick={() => setShowNewLinkModal(true)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', 
                  backgroundColor: 'var(--primary)', color: 'white', fontWeight: '500',
                  cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s'
                }}
              >
                <Plus size={18} />
                Novo vínculo
              </button>
            </div>
          </div>
        </div>

        {/* Links Card */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ 
            padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary)' }}>Meus vínculos</h3>
            <button style={{ 
              display: 'flex', alignItems: 'center', gap: '0.25rem', border: 'none', background: 'transparent',
              color: 'var(--primary)', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer'
            }}>
              Filtros
              <ChevronRight size={16} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {!userLinks || userLinks.length === 0 ? (
              <div style={{ 
                backgroundColor: 'var(--surface)', padding: '2rem', 
                borderRadius: '8px', border: '1px solid var(--border)',
                maxWidth: '500px', margin: '0 auto', textAlign: 'center'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Bem-vindo!
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                    Você ainda não possui vínculos. Preencha o formulário abaixo para pedir um acesso.
                  </p>
                </div>
                
                <form onSubmit={handleCreateLink} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
                  <div>
                    <label className="modal-label">Seu Nome</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="modal-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="modal-label">Setor</label>
                    <select
                      value={sector}
                      onChange={(e) => { setSector(e.target.value); setRole(''); }}
                      className="modal-input"
                      required
                    >
                      <option value="">Selecione um setor...</option>
                      {Object.keys(SECTORS_AND_ROLES).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {sector && (
                    <div>
                      <label className="modal-label">Função / Cargo</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="modal-input"
                        required
                      >
                        <option value="">Selecione uma função...</option>
                        {SECTORS_AND_ROLES[sector].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {modalError && (
                    <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '0.875rem' }}>
                      {modalError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={modalLoading || !sector || !role}>
                    {modalLoading ? 'Enviando...' : 'Pedir Acesso'}
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                
                {/* Loop over userLinks */}
                {userLinks.map((link) => (
                  <div key={link.id} style={{ 
                    border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden',
                    backgroundColor: 'var(--surface)', display: 'flex', flexDirection: 'column'
                  }}>
                    {/* Card Header */}
                    <div style={{ 
                      backgroundColor: link.status === 'approved' ? '#0f766e' : link.status === 'rejected' ? 'var(--danger)' : '#64748b', 
                      color: 'white', padding: '0.75rem 1rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.9375rem' }}>
                        <User size={16} />
                        {link.sector}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {/* Apenas admin pode gerenciar os vínculos */}
                      </div>
                    </div>
                    
                    {/* Card Body */}
                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <Building2 size={16} color={link.status === 'approved' ? "#0f766e" : "#64748b"} />
                        {link.sector}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <User size={16} color={link.status === 'approved' ? "#0f766e" : "#64748b"} />
                        {link.role}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                      {link.status === 'pending' ? (
                        <span style={{ color: '#d97706', fontSize: '0.875rem', fontWeight: '500' }}>
                          Pendente
                        </span>
                      ) : link.status === 'rejected' ? (
                        <span style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: '500' }}>
                          Rejeitado
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleAccess(link)}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f766e', 
                            background: 'transparent', border: 'none', fontWeight: '500', fontSize: '0.875rem', cursor: 'pointer' 
                          }}
                        >
                          Acessar <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Vínculo */}
      {showNewLinkModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--surface)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)' }}>Novo Vínculo</h3>
              <button onClick={() => setShowNewLinkModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateLink} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="modal-label">Seu Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>

              <div>
                <label className="modal-label">Setor</label>
                <select
                  value={sector}
                  onChange={(e) => { setSector(e.target.value); setRole(''); }}
                  className="modal-input"
                  required
                >
                  <option value="">Selecione um setor...</option>
                  {Object.keys(SECTORS_AND_ROLES).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {sector && (
                <div>
                  <label className="modal-label">Função / Cargo</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="modal-input"
                    required
                  >
                    <option value="">Selecione uma função...</option>
                    {SECTORS_AND_ROLES[sector].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {modalError && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '0.875rem' }}>
                  {modalError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowNewLinkModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading || !sector || !role}>
                  {modalLoading ? 'Salvando...' : 'Solicitar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSetup;
