import React, { useState } from 'react';
import { ChevronRight, LogOut, Moon, Plus, RefreshCw, Sun, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import SectorIcon from './SectorIcon';

const SECTORS_AND_ROLES = {
  SST: ['Técnico', 'Supervisor'],
  'Clínica': ['Enfermagem', 'Médico', 'Recepcionista'],
  Treinamento: ['Administrativo'],
  Administrativo: ['Financeiro', 'RH', 'Gerente'],
  Diretoria: ['Admin'],
  IPA: ['Analista']
};

const statusLabels = {
  approved: 'Aprovado',
  pending: 'Pendente',
  rejected: 'Rejeitado'
};

const ProfileSetup = () => {
  const { session, userProfile, userLinks, refreshProfile, setActiveLink, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showNewLinkModal, setShowNewLinkModal] = useState(false);
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

  const handleCreateLink = async (event) => {
    event.preventDefault();
    if (!sector || !role) {
      setModalError('Por favor, preencha todos os campos.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      if (name && name !== userProfile?.name) {
        await supabase.from('profiles').update({ name }).eq('id', session.user.id);
      }

      const existingLink = userLinks.find(link => link.sector === sector && link.role === role);
      if (existingLink) {
        throw new Error(`Você já possui um vínculo de ${role} em ${sector} com status: ${existingLink.status}.`);
      }

      const { error: insertError } = await supabase.from('user_links').insert({
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
    } catch (error) {
      setModalError(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  const linkForm = (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="link-name">Seu nome</label>
        <input id="link-name" className="form-input" type="text" value={name} onChange={event => setName(event.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="link-sector">Setor</label>
        <select id="link-sector" className="form-input" value={sector} onChange={event => { setSector(event.target.value); setRole(''); }} required>
          <option value="">Selecione um setor...</option>
          {Object.keys(SECTORS_AND_ROLES).map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      {sector && (
        <div className="form-group">
          <label className="form-label" htmlFor="link-role">Função / cargo</label>
          <select id="link-role" className="form-input" value={role} onChange={event => setRole(event.target.value)} required>
            <option value="">Selecione uma função...</option>
            {SECTORS_AND_ROLES[sector].map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      )}
      {modalError && <div className="alert alert--danger">{modalError}</div>}
    </>
  );

  return (
    <div className="profile-setup">
      <header className="profile-topbar">
        <img className="profile-topbar__logo" src="/logo-totalsafety.png" alt="TotalSafety" />
        <div className="profile-topbar__actions">
          <button className="icon-button" onClick={toggleTheme} title={isDark ? 'Usar tema claro' : 'Usar tema escuro'}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="profile-user">
            <span className="profile-user__avatar">{fullName.charAt(0).toUpperCase()}</span>
            <span className="profile-user__name">{fullName}</span>
          </div>
          <button className="profile-signout" onClick={signOut}><LogOut size={17} /><span>Sair</span></button>
        </div>
      </header>

      <main className="profile-content">
        <div className="profile-breadcrumb"><span>Início</span><ChevronRight size={14} /><strong>Escolher vínculo</strong></div>

        <section className="profile-hero">
          <div>
            <span className="eyebrow">Acesso ao sistema</span>
            <h1>Olá, {fullName}!</h1>
            <p>Selecione o vínculo que deseja usar nesta sessão.</p>
          </div>
          <div className="profile-hero__actions">
            <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> Atualizar vínculos
            </button>
            <button className="btn btn-primary" onClick={() => setShowNewLinkModal(true)}>
              <Plus size={17} /> Novo vínculo
            </button>
          </div>
        </section>

        <section className="profile-links card">
          <div className="profile-links__header">
            <div>
              <h2>Meus vínculos</h2>
              <p>Acesse um ambiente aprovado ou acompanhe suas solicitações.</p>
            </div>
            <span className="count-badge">{userLinks?.length || 0}</span>
          </div>

          {!userLinks || userLinks.length === 0 ? (
            <div className="empty-state profile-empty">
              <span className="empty-state__icon"><UserRound size={24} /></span>
              <h3>Nenhum vínculo encontrado</h3>
              <p>Solicite seu primeiro acesso para começar.</p>
              <form className="profile-inline-form" onSubmit={handleCreateLink}>
                {linkForm}
                <button type="submit" className="btn btn-primary" disabled={modalLoading || !sector || !role}>
                  {modalLoading ? 'Enviando...' : 'Pedir acesso'}
                </button>
              </form>
            </div>
          ) : (
            <div className="profile-links__grid">
              {userLinks.map(link => (
                <article className={`link-card link-card--${link.status}`} key={link.id}>
                  <div className="link-card__head">
                    <SectorIcon sector={link.sector} size={21} />
                    <div>
                      <h3>{link.sector}</h3>
                      <p>{link.role}</p>
                    </div>
                    <span className={`status-badge status-badge--${link.status}`}>{statusLabels[link.status] || link.status}</span>
                  </div>
                  <div className="link-card__body">
                    <span>Área de trabalho</span>
                    <strong>{link.sector}</strong>
                  </div>
                  <div className="link-card__footer">
                    {link.status === 'approved' ? (
                      <button onClick={() => setActiveLink(link)}>Acessar ambiente <ChevronRight size={16} /></button>
                    ) : (
                      <span>{link.status === 'pending' ? 'Aguardando aprovação' : 'Solicitação não aprovada'}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {showNewLinkModal && (
        <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setShowNewLinkModal(false); }}>
          <div className="modal-content profile-modal" role="dialog" aria-modal="true" aria-labelledby="new-link-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow">Solicitação de acesso</span>
                <h2 id="new-link-title">Novo vínculo</h2>
              </div>
              <button className="icon-button" onClick={() => setShowNewLinkModal(false)} aria-label="Fechar"><X size={19} /></button>
            </div>
            <form onSubmit={handleCreateLink}>
              <div className="modal-body">{linkForm}</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewLinkModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading || !sector || !role}>
                  {modalLoading ? 'Salvando...' : 'Solicitar vínculo'}
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
