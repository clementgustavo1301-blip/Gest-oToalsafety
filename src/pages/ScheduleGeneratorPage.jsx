import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGroups, addCompany, addDeliverable, addGroup } from '../services/storageService';
import { X, Building2, Plus } from 'lucide-react';

const ScheduleGeneratorPage = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [payload, setPayload] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGroups().then(data => {
      setGroups(data);
      if (data.length > 0) setSelectedGroupId(data[0].id);
    });
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'CREATE_COMPANY_FROM_SCHEDULE') {
        setPayload(event.data.payload);
        setShowModal(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isCreatingGroup && !selectedGroupId) return;
    if (isCreatingGroup && !newGroupName.trim()) return;
    if (!payload) return;
    setSaving(true);
    try {
      let finalGroupId = selectedGroupId;
      if (isCreatingGroup) {
        const newGroup = await addGroup({ name: newGroupName.trim() });
        finalGroupId = newGroup.id;
      }

      const dummyCnpj = `00.000.000/${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 90 + 10)}`;
      const company = await addCompany({
        name: payload.clientName || 'Empresa Importada do Cronograma',
        cnpj: dummyCnpj,
        contact: '',
        phone: '',
        groupId: finalGroupId
      });

      if (company && company.id) {
        for (const item of payload.deliverables) {
          let mappedType = 'documento';
          if (item.area) {
            const lowerArea = item.area.toLowerCase();
            if (lowerArea.includes('laudo')) mappedType = 'laudo';
            else if (lowerArea.includes('programa') || lowerArea.includes('treinamento')) mappedType = 'programa';
          }

          await addDeliverable({
            companyId: company.id,
            title: item.title,
            type: mappedType,
            status: 'pendente',
            dueDate: item.deadline || new Date().toISOString().split('T')[0],
            description: item.description || ''
          });
        }
      }

      setShowModal(false);
      navigate('/deliverables');
    } catch (error) {
      console.error('Error saving from schedule:', error);
      alert('Erro ao salvar no banco de dados. Verifique a conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 className="page-title">Gerador de Cronograma</h1>
        <p className="page-subtitle">Análise de contratos e geração de cronogramas com Inteligência Artificial.</p>
      </div>
      
      <div style={{ 
        flex: 1, 
        backgroundColor: 'var(--surface)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '600px'
      }}>
        <iframe 
          src={`/gerador-cronograma/index.html?apiKey=${import.meta.env.VITE_GEMINI_API_KEY || ''}`}
          title="Gerador de Cronograma"
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
        />
      </div>
      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Gerador de Cronograma integrado localmente (sem necessidade de servidor externo).
      </div>

      {showModal && payload && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Building2 size={18} color="white" />
                </div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Salvar Empresa e Entregáveis</h2>
              </div>
              <button onClick={() => !saving && setShowModal(false)} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                  <p><strong>Empresa:</strong> {payload.clientName || 'Não informado'}</p>
                  <p><strong>Duração:</strong> {payload.durationMonths || 12} meses (Início: {payload.startDate})</p>
                  <p><strong>Total de Entregáveis:</strong> {payload.deliverables?.length || 0}</p>
                </div>
                <div>
                  <label className="modal-label" htmlFor="group-select">Vincular a qual Grupo Econômico?</label>
                  {isCreatingGroup ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Nome do Novo Grupo"
                        className="modal-input"
                        autoFocus
                        disabled={saving}
                        required
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setIsCreatingGroup(false)}
                        disabled={saving}
                        title="Cancelar Criação"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        id="group-select"
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="modal-input"
                        disabled={saving}
                        required
                      >
                        <option value="" disabled>Selecione um grupo...</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setIsCreatingGroup(true)}
                        disabled={saving}
                        title="Criar Novo Grupo"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={(isCreatingGroup ? !newGroupName.trim() : !selectedGroupId) || saving}>
                  {saving ? 'Salvando tudo...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleGeneratorPage;
