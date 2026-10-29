import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { User, Bell, Shield, Key, Sparkles, LogOut, Save, Sun, Moon, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SettingsPage = () => {
  const { user, userProfile, refreshProfile, signOut } = useAuth();
  const { theme, isDark, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Real state for form
  const [profileName, setProfileName] = useState(userProfile?.name || '');
  const [profileRole, setProfileRole] = useState(userProfile?.role || '');
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('ecoia_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('openai_api_key') || '';
    } catch {
      return '';
    }
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name || '');
      setProfileRole(userProfile.role || '');
    }
  }, [userProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (activeTab === 'profile') {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ name: profileName, role: profileRole })
        .eq('id', user.id);
      
      if (!error) {
        await refreshProfile();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
      setSaving(false);
    } else if (activeTab === 'ai') {
      try {
        if (apiKey && apiKey.trim()) {
          localStorage.setItem('ecoia_api_key', apiKey.trim());
          if (apiKey.trim().startsWith('sk-')) {
            localStorage.setItem('openai_api_key', apiKey.trim());
          } else {
            localStorage.setItem('gemini_api_key', apiKey.trim());
          }
        } else {
          localStorage.removeItem('ecoia_api_key');
          localStorage.removeItem('gemini_api_key');
          localStorage.removeItem('openai_api_key');
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        console.error('Erro ao salvar chave da IA:', err);
      }
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Meu Perfil', icon: <User size={18} /> },
    { id: 'preferences', label: 'Preferências', icon: <Bell size={18} /> },
    { id: 'security', label: 'Segurança', icon: <Shield size={18} /> },
    { id: 'ai', label: 'Integração IA', icon: <Sparkles size={18} /> },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <div className="page-header">
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Configurações</h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)' }}>Gerencie suas preferências, segurança e integrações.</p>
      </div>

      <div className="grid-responsive-sidebar">
        
        {/* Sidebar Menu Interno */}
        <div className="card flex-col-desktop settings-tabs" style={{ padding: '0.5rem', gap: '0.25rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.5rem 0' }} />
          <button
            onClick={signOut}
            className="settings-tab settings-tab--danger"
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
                    <label className="modal-label">Cargo / Função</label>
                    <input 
                      type="text" 
                      className="modal-input" 
                      value={profileRole} 
                      onChange={(e) => setProfileRole(e.target.value)}
                      placeholder="Ex: Técnico de Segurança, Engenheiro..."
                    />
                  </div>
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
            )}

            {activeTab === 'preferences' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                  Preferências do Sistema
                </h3>

                <div>
                  <label className="modal-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Palette size={16} color="var(--primary)" /> Aparência & Tema do Sistema
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Mantenha o tema padrão claro ou alterne para o modo escuro conforme sua preferência.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      style={{
                        padding: '0.875rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: !isDark ? '2px solid var(--primary)' : '1px solid var(--border)',
                        backgroundColor: !isDark ? 'var(--primary-light)' : 'var(--surface)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: !isDark ? '700' : '500',
                        boxShadow: !isDark ? 'var(--shadow-sm)' : 'none',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        backgroundColor: '#fef3c7', color: '#d97706',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Sun size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem' }}>Modo Claro (Padrão)</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Visual padrão oficial EcoClinic
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      style={{
                        padding: '0.875rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: isDark ? '2px solid var(--primary)' : '1px solid var(--border)',
                        backgroundColor: isDark ? 'var(--primary-light)' : 'var(--surface)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: isDark ? '700' : '500',
                        boxShadow: isDark ? 'var(--shadow-sm)' : 'none',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        backgroundColor: '#1e293b', color: '#38bdf8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Moon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem' }}>Modo Escuro</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Conforto para baixa luminosidade
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

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
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={saving}>
                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
