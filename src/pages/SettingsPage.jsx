import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Bell, Shield, Key, Sparkles, LogOut, Save } from 'lucide-react';

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Fake state for form
  const [profileName, setProfileName] = useState('Usuário TotalSafety');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'profile', label: 'Meu Perfil', icon: <User size={18} /> },
    { id: 'preferences', label: 'Preferências', icon: <Bell size={18} /> },
    { id: 'security', label: 'Segurança', icon: <Shield size={18} /> },
    { id: 'ai', label: 'Integração IA', icon: <Sparkles size={18} /> },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Configurações</h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)' }}>Gerencie suas preferências, segurança e integrações.</p>
      </div>

      <div className="grid-responsive-sidebar">
        
        {/* Sidebar Menu Interno */}
        <div className="card flex-col-desktop" style={{ padding: '0.5rem', gap: '0.25rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? '600' : '500',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                transition: 'var(--transition)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'var(--background)'; }}
              onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.5rem 0' }} />
          <button
            onClick={signOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent', color: 'var(--danger)',
              fontWeight: '500', border: 'none', cursor: 'pointer', textAlign: 'left',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} /> Sair da Conta
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSave}>
            
            {/* TABS CONTENT */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  Detalhes do Perfil
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', fontWeight: 'bold'
                  }}>
                    {profileName.charAt(0)}
                  </div>
                  <button type="button" className="btn btn-secondary">Alterar Foto</button>
                </div>

                <div className="grid-responsive-2">
                  <div>
                    <label className="modal-label">Nome Completo</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="modal-label">E-mail</label>
                    <input 
                      type="email" 
                      className="modal-input" 
                      value={user?.email || ''} 
                      disabled 
                      style={{ backgroundColor: 'var(--background)' }} 
                    />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      O e-mail está vinculado à sua conta Supabase e não pode ser alterado aqui.
                    </small>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  Preferências do Sistema
                </h3>
                <div>
                  <label className="modal-label">Fuso Horário Padrão</label>
                  <select className="modal-input">
                    <option>Brasília (UTC-03:00)</option>
                    <option>Manaus (UTC-04:00)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="checkbox" id="notif1" defaultChecked style={{ width: '1rem', height: '1rem', cursor: 'pointer' }} />
                  <label htmlFor="notif1" style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>Receber alertas de vencimento de entregáveis</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="checkbox" id="notif2" defaultChecked style={{ width: '1rem', height: '1rem', cursor: 'pointer' }} />
                  <label htmlFor="notif2" style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>Receber relatórios semanais de segurança</label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  Segurança
                </h3>
                <div>
                  <label className="modal-label">Senha Atual</label>
                  <input type="password" className="modal-input" placeholder="••••••••" />
                </div>
                <div>
                  <label className="modal-label">Nova Senha</label>
                  <input type="password" className="modal-input" />
                </div>
                <div>
                  <label className="modal-label">Confirmar Nova Senha</label>
                  <input type="password" className="modal-input" />
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary">Atualizar Senha</button>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: 'linear-gradient(135deg, var(--primary), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Sparkles size={16} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                    Integração com Assistente IA
                  </h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Conecte sua própria chave de API para desbloquear funcionalidades avançadas de Inteligência Artificial, como análise automática de laudos e sugestões de plano de ação.
                </p>
                <div>
                  <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Key size={14} /> Chave da API (OpenAI / Gemini)
                  </label>
                  <input 
                    type="password" 
                    className="modal-input" 
                    placeholder="sk-..." 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                    Sua chave é salva localmente no seu navegador por motivos de segurança. Nós não armazenamos sua chave em nosso banco de dados.
                  </small>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
              {saved && <span style={{ color: 'var(--secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Save size={14} /> Configurações Salvas!</span>}
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={16} /> Salvar Alterações
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
