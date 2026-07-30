import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Search, ShieldCheck, Check, X, Trash2 } from 'lucide-react';

const TeamPage = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTeam = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_links')
      .select('*, profiles(name)')
      .order('status', { ascending: false });
      
    if (!error && data) {
      // Map to flat structure for easier filtering
      const mappedData = data.map(item => ({
        ...item,
        name: item.profiles?.name || 'Usuário Desconhecido'
      }));

      // Sort so 'pending' is at the top
      const sorted = [...mappedData].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return a.name.localeCompare(b.name);
      });
      setLinks(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('user_links')
        .update({ status: newStatus })
        .eq('id', id);

      if (!error) {
        setLinks(links.map(p => p.id === id ? { ...p, status: newStatus } : p));
      } else {
        alert('Erro ao atualizar status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLinks = links.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sector?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <header className="header-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={28} color="var(--primary)" />
            Equipe e Acessos
          </h1>
          <p className="text-subtitle">Gerencie as solicitações de vínculos e os usuários da plataforma.</p>
        </div>
      </header>

      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--background)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', flex: 1, minWidth: '250px' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Buscar por nome, setor ou função..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem' }}
            />
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong>{filteredLinks.length}</strong> vínculos encontrados
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Carregando equipe...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: '600' }}>Nome</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: '600' }}>Setor</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: '600' }}>Cargo (Função)</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '1rem 0.5rem', fontWeight: '600', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map(link => (
                  <tr key={link.id} style={{ 
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: link.status === 'pending' ? 'var(--warning-light)' : 'transparent'
                  }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', fontSize: '0.75rem'
                        }}>
                          {link.name.charAt(0).toUpperCase()}
                        </div>
                        {link.name}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {link.sector || '-'}
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.125rem 0.625rem', borderRadius: '1rem',
                        backgroundColor: link.role === 'Admin' ? 'var(--primary-light)' : 'var(--secondary-light)',
                        color: link.role === 'Admin' ? 'var(--primary)' : 'var(--secondary-hover)',
                        fontWeight: '600', fontSize: '0.75rem'
                      }}>
                        {link.role === 'Admin' && <ShieldCheck size={12} />}
                        {link.role || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {link.status === 'pending' ? (
                        <span style={{ color: '#d97706', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          Pendente
                        </span>
                      ) : link.status === 'rejected' ? (
                        <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Rejeitado</span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: '500' }}>Aprovado</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                      {link.status === 'pending' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleUpdateStatus(link.id, 'approved')}
                            className="btn btn-primary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Check size={14} /> Aprovar
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(link.id, 'rejected')}
                            className="btn btn-secondary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)' }}
                          >
                            <X size={14} /> Recusar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            onClick={async () => {
                              if(window.confirm('Tem certeza que deseja remover este vínculo?')) {
                                await supabase.from('user_links').delete().eq('id', link.id);
                                fetchTeam();
                              }
                            }}
                            className="btn btn-secondary" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', color: 'var(--danger)', background: 'transparent', border: 'none' }}
                            title="Excluir vínculo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLinks.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      Nenhum vínculo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
