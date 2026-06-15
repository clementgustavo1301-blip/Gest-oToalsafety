import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { getDeliverablesByCompany, getCompanies } from '../services/storageService';

const AddTrainingModal = ({ defaultDate, companyId, onClose, onSave }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
  const [companies, setCompanies] = useState([]);
  
  const [selectedDeliverableId, setSelectedDeliverableId] = useState('');
  const [date, setDate] = useState(defaultDate || '');
  const [time, setTime] = useState('08:00 - 12:00');
  const [instructor, setInstructor] = useState('');
  const [participants, setParticipants] = useState('');

  const [customTitle, setCustomTitle] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);

  const [pendingTrainings, setPendingTrainings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      if (!companyId) {
        const comps = await getCompanies();
        setCompanies(comps);
      }
      
      if (selectedCompanyId) {
        const deliverables = await getDeliverablesByCompany(selectedCompanyId);
        const pTrainings = deliverables.filter(d => d.type === 'treinamento' && d.status === 'pendente');
        setPendingTrainings(pTrainings);
        if (pTrainings.length === 0) setIsStandalone(true);
      } else {
        setPendingTrainings([]);
        setIsStandalone(true);
      }
      setLoadingData(false);
    }
    load();
  }, [companyId, selectedCompanyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !selectedCompanyId) return;
    if (isStandalone && !customTitle.trim()) return;
    if (!isStandalone && !selectedDeliverableId) return;
    
    setSaving(true);
    let title = customTitle.trim();
    let deliverableId = null;

    if (!isStandalone) {
      const selectedDeliv = pendingTrainings.find(d => d.id === selectedDeliverableId);
      title = selectedDeliv.title;
      deliverableId = selectedDeliverableId;
    }
    
    await onSave({
      title,
      date,
      time,
      instructor: instructor.trim(),
      participants: parseInt(participants) || 0,
      status: 'agendado',
      deliverableId,
      companyId: selectedCompanyId
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--info))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Calendar size={18} color="white" />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Agendar Treinamento Pendente</h2>
          </div>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {loadingData ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando dados...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Company Selection if global */}
              {!companyId && (
                <div>
                  <label className="modal-label" htmlFor="training-company">Empresa</label>
                  <select
                    id="training-company"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="modal-input"
                    required
                    disabled={saving}
                  >
                    <option value="" disabled>Selecione a empresa...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Type Selection */}
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="radio" checked={!isStandalone} onChange={() => setIsStandalone(false)} disabled={pendingTrainings.length === 0} />
                  Vincular a Pendência
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="radio" checked={isStandalone} onChange={() => setIsStandalone(true)} />
                  Treinamento Avulso (Novo)
                </label>
              </div>

              {/* Select Pending Training or Custom Title */}
              {!isStandalone ? (
                <div>
                  <label className="modal-label" htmlFor="training-select">Treinamento Pendente</label>
                  {pendingTrainings.length === 0 ? (
                    <div style={{
                      padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)',
                      backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem', border: '1px dashed var(--border)'
                    }}>
                      ✅ Não há treinamentos pendentes. Crie um avulso acima!
                    </div>
                  ) : (
                    <select
                      id="training-select"
                      value={selectedDeliverableId}
                      onChange={(e) => setSelectedDeliverableId(e.target.value)}
                      className="modal-input"
                      required
                      disabled={saving}
                    >
                      <option value="" disabled>Selecione um treinamento...</option>
                      {pendingTrainings.map(t => (
                        <option key={t.id} value={t.id}>{t.title} (Prazo: {t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem prazo'})</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <label className="modal-label" htmlFor="training-custom">Nome do Treinamento</label>
                  <input
                    id="training-custom"
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="modal-input"
                    placeholder="Ex: NR-35 Trabalho em Altura"
                    required
                    disabled={saving}
                    autoFocus
                  />
                </div>
              )}

              {/* Date and Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="modal-label" htmlFor="training-date">Data</label>
                  <input
                    id="training-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="modal-input"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="modal-label" htmlFor="training-time">Horário</label>
                  <input
                    id="training-time"
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="08:00 - 12:00"
                    className="modal-input"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Instructor and Participants */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="modal-label" htmlFor="training-instructor">Instrutor</label>
                  <input
                    id="training-instructor"
                    type="text"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="Nome do instrutor"
                    className="modal-input"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="modal-label" htmlFor="training-participants">Nº de Participantes</label>
                  <input
                    id="training-participants"
                    type="number"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    placeholder="0"
                    className="modal-input"
                    min="0"
                    disabled={saving}
                  />
                </div>
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={saving || (!isStandalone && !selectedDeliverableId) || (isStandalone && !customTitle.trim()) || !date || !selectedCompanyId}
              >
                {saving ? 'Agendando...' : 'Agendar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddTrainingModal;
