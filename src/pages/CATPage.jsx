import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  AlertTriangle, FileText, Search, Filter, 
  CheckCircle, Clock, X, Eye, Copy, Download, RefreshCw, Send, CheckCircle2, Printer 
} from 'lucide-react';

const CATPage = () => {
  const { userProfile } = useAuth();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadCats = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('cat_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar CATs ou tabela inexistente:', error.message);
        setErrorMsg('Erro de conexão ou tabela não encontrada. Verifique se o SQL foi executado.');
        setCats([]);
      } else {
        setCats(data || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro inesperado: ' + err.message);
      setCats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCats();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    setIsUpdatingStatus(true);
    try {
      if (id.startsWith('mock')) {
        setCats(cats.map(c => c.id === id ? { ...c, status: newStatus } : c));
        setIsUpdatingStatus(false);
        return;
      }
      
      const { error } = await supabase
        .from('cat_records')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setCats(cats.map(c => c.id === id ? { ...c, status: newStatus } : c));
      if (selectedCat && selectedCat.id === id) {
        setSelectedCat({ ...selectedCat, status: newStatus });
      }
    } catch (err) {
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/cat-form`;
    navigator.clipboard.writeText(url);
    alert('Link do formulário público copiado! Envie para o cliente.');
  };

  const copyCatDataForEsocial = (cat) => {
    let t = `--- DADOS S-2210 PARA ESOCIAL ---\n`;
    t += `Empresa: ${cat.company_name} (CNPJ: ${cat.company_cnpj})\n`;
    t += `Trabalhador: ${cat.employee_name} (CPF: ${cat.employee_cpf})\n\n`;
    
    t += `[1] Ocorrência:\n`;
    t += `Tipo CAT: ${cat.tp_cat} | Tipo Acid: ${cat.tp_acid}\n`;
    t += `Data: ${cat.a_data} | Hora: ${cat.a_hora} | Trab antes: ${cat.a_hrstrab || 'Não inf.'}\n`;
    t += `Afastamento: ${cat.afast} (${cat.a_diasafast || 0} dias) | Óbito: ${cat.obito}\n`;
    t += `Situação: ${cat.a_descricao}\n\n`;

    t += `[2] Local:\n`;
    t += `Tipo: ${cat.l_tipo}\n`;
    t += `Endereço: ${cat.l_rua}, ${cat.l_num} - ${cat.l_bairro}, ${cat.l_cidade}/${cat.l_uf}\n`;
    t += `Especificação: ${cat.l_especifico}\n\n`;

    t += `[3] Lesão:\n`;
    t += `Parte: ${cat.p_parte} (${cat.p_lateral})\n`;
    if(cat.a_natureza) t += `Natureza: ${cat.a_natureza}\n\n`;

    t += `[4] Atendimento:\n`;
    t += `Data: ${cat.m_data} | Hora: ${cat.m_hora}\n`;
    t += `Unidade: ${cat.m_unidade}\n`;
    t += `CID: ${cat.m_cid} | Diagnóstico: ${cat.m_diag || 'Não inf.'}\n`;
    t += `Médico: ${cat.m_medico} (CRM: ${cat.m_crm}/${cat.m_crmuf})\n`;

    navigator.clipboard.writeText(t);
    alert('Dados formatados copiados para a área de transferência!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente': return { bg: '#FFF3E0', text: '#E65100', icon: <Clock size={14} /> };
      case 'Em Análise': return { bg: '#E3F2FD', text: '#1565C0', icon: <Search size={14} /> };
      case 'Enviado ao eSocial (S-2210)': return { bg: '#E8F5E9', text: '#2E7D32', icon: <Send size={14} /> };
      case 'Concluído': return { bg: '#F5F5F5', text: '#616161', icon: <CheckCircle2 size={14} /> };
      default: return { bg: '#FFF3E0', text: '#E65100', icon: <Clock size={14} /> };
    }
  };

  const filteredCats = cats.filter(c => 
    c.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={28} color="var(--primary)" />
            Gestão de CATs (S-2210)
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Acompanhe e gerencie as Comunicações de Acidente de Trabalho enviadas pelos clientes.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={loadCats} disabled={loading} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Atualizar
          </button>
          <button className="btn btn-primary" onClick={copyPublicLink} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Copy size={16} />
            Copiar Link Público
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Buscar por trabalhador, empresa ou protocolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>
          <button className="btn btn-secondary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={16} /> Filtros
          </button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 1rem' }} />
            <p>Carregando registros de CAT...</p>
          </div>
        ) : errorMsg ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--error)' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: '600' }}>{errorMsg}</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>O banco de dados retornou um erro ao buscar as CATs.</p>
          </div>
        ) : filteredCats.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CheckCircle size={48} color="var(--border)" style={{ margin: '0 auto 1rem' }} />
            <p>Nenhum registro de CAT encontrado.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Data de Envio</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Trabalhador</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Empresa</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCats.map((cat) => {
                  const statusColors = getStatusColor(cat.status);
                  return (
                    <tr key={cat.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {new Date(cat.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(cat.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{cat.employee_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CPF: {cat.employee_cpf}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{cat.company_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CNPJ: {cat.company_cnpj}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                          backgroundColor: statusColors.bg, color: statusColors.text,
                          padding: '0.25rem 0.625rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600'
                        }}>
                          {statusColors.icon}
                          {cat.status || 'Pendente'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => setSelectedCat(cat)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}
                          title="Ver Detalhes"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETALHES DA CAT MODAL */}
      {selectedCat && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
          <div className="card" style={{ 
            width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'var(--card)', zIndex: 10 }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Detalhes da Ocorrência
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Enviada em {new Date(selectedCat.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={() => setSelectedCat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                <X size={24} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Controles de Status e Ações */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status da Ocorrência:</label>
                  <select 
                    className="modal-input" 
                    style={{ width: 'auto', padding: '0.375rem 0.75rem' }}
                    value={selectedCat.status || 'Pendente'}
                    onChange={(e) => handleStatusChange(selectedCat.id, e.target.value)}
                    disabled={isUpdatingStatus}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Enviado ao eSocial (S-2210)">Enviado ao eSocial (S-2210)</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => copyCatDataForEsocial(selectedCat)} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', display: 'flex', gap: '0.375rem' }}>
                    <Copy size={14} /> Copiar P/ eSocial
                  </button>
                  <button className="btn btn-primary" onClick={() => window.print()} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', display: 'flex', gap: '0.375rem' }}>
                    <Printer size={14} /> Imprimir Tela
                  </button>
                </div>
              </div>

              {/* Informações Resumidas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: '700', marginBottom: '1rem' }}>00. Empresa e Trabalhador</h3>
                  <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    <p><strong>Empresa:</strong> {selectedCat.company_name}</p>
                    <p><strong>CNPJ:</strong> {selectedCat.company_cnpj}</p>
                    <p><strong>Trabalhador:</strong> {selectedCat.employee_name}</p>
                    <p><strong>CPF:</strong> {selectedCat.employee_cpf}</p>
                  </div>
                </div>
                
                <div>
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: '700', marginBottom: '1rem' }}>01. Dados do Acidente</h3>
                  <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    <p><strong>Tipo CAT:</strong> {selectedCat.tp_cat} | <strong>Tipo Acid:</strong> {selectedCat.tp_acid}</p>
                    <p><strong>Data/Hora:</strong> {selectedCat.a_data} às {selectedCat.a_hora}</p>
                    <p><strong>Afastamento:</strong> {selectedCat.afast} ({selectedCat.a_diasafast} dias)</p>
                    <p><strong>Óbito:</strong> {selectedCat.obito} {selectedCat.a_dtobito && `em ${selectedCat.a_dtobito}`}</p>
                    <p><strong>Natureza/Agente:</strong> {selectedCat.a_natureza} / {selectedCat.a_agente}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p><strong>Descrição da Situação:</strong></p>
                <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '4px', fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  {selectedCat.a_descricao}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: '700', marginBottom: '1rem' }}>02. Local e 03. Lesão</h3>
                  <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    <p><strong>Tipo Local:</strong> {selectedCat.l_tipo}</p>
                    <p><strong>Endereço:</strong> {selectedCat.l_rua}, {selectedCat.l_num} - {selectedCat.l_bairro}</p>
                    <p><strong>Cidade/UF:</strong> {selectedCat.l_cidade}/{selectedCat.l_uf}</p>
                    <p><strong>Específico:</strong> {selectedCat.l_especifico}</p>
                    <br/>
                    <p><strong>Parte Atingida:</strong> {selectedCat.p_parte} ({selectedCat.p_lateral})</p>
                    <p><strong>Outras Partes:</strong> {selectedCat.p_outras || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: '700', marginBottom: '1rem' }}>04. Atendimento Médico</h3>
                  <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    <p><strong>Data/Hora:</strong> {selectedCat.m_data} às {selectedCat.m_hora}</p>
                    <p><strong>Unidade:</strong> {selectedCat.m_unidade}</p>
                    <p><strong>Internação:</strong> {selectedCat.intern} | <strong>CNES:</strong> {selectedCat.m_cnes}</p>
                    <p><strong>CID-10:</strong> {selectedCat.m_cid} | <strong>Diag:</strong> {selectedCat.m_diag}</p>
                    <p><strong>Tratamento:</strong> {selectedCat.m_durtrat} dias</p>
                    <p><strong>Médico:</strong> {selectedCat.m_medico} (CRM: {selectedCat.m_crm}/{selectedCat.m_crmuf})</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CATPage;
