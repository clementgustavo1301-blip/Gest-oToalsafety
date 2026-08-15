import React, { useState, useEffect } from 'react';
import { X, Calendar, Edit2 } from 'lucide-react';
import { getCompanies, updateTraining, getProfiles } from '../services/storageService';

const EditTrainingModal = ({ training, onClose, onSave }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState(training.companyId || '');
  const [companies, setCompanies] = useState([]);
  
  const [title, setTitle] = useState(training.title || '');
  const [date, setDate] = useState(training.date || '');
  const [time, setTime] = useState(training.time || '');
  const [instructor, setInstructor] = useState(training.instructor || '');
  const [description, setDescription] = useState((training.description || '').replace('[NO_TRAVEL]', '').replace('[SHARED_TRIP]', '').trim());
  const [hasTravel, setHasTravel] = useState(!(training.description || '').includes('[NO_TRAVEL]'));
  const [responsibleId, setResponsibleId] = useState(training.responsibleId || '');

  const [profiles, setProfiles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const [comps, profs] = await Promise.all([
        getCompanies(),
        getProfiles()
      ]);
      setCompanies(comps);
      setProfiles(profs);
      setLoadingData(false);
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !selectedCompanyId || !title.trim()) return;
    
    setSaving(true);
    
    let finalDescription = description.trim();
    if (!hasTravel) {
      finalDescription += '\n[NO_TRAVEL]';
    } else if (training.description && training.description.includes('[SHARED_TRIP]')) {
      finalDescription += '\n[SHARED_TRIP]';
    }

    const updatedData = {
      title: title.trim(),
      date,
      time,
      instructor: instructor.trim(),
      description: finalDescription.trim(),
      companyId: selectedCompanyId,
      responsibleId: responsibleId || null
    };

    await updateTraining(training.id, updatedData);
    if (onSave) onSave();
    setSaving(false);
    onClose();
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
              <Edit2 size={18} color="white" />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Editar Agendamento</h2>
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

              {/* Company Selection */}
              <div>
                <label className="modal-label" htmlFor="edit-company">Empresa</label>
                <select
                  id="edit-company"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="modal-input"
                  required
                  disabled={saving || training.deliverableId}
                  title={training.deliverableId ? "Não é possível alterar a empresa de um treinamento vinculado a uma pendência" : ""}
                >
                  <option value="" disabled>Selecione a empresa...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Title */}
              <div>
                <label className="modal-label" htmlFor="edit-title">Nome do Treinamento</label>
                <input
                  id="edit-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="modal-input"
                  placeholder="Ex: NR-35 Trabalho em Altura"
                  required
                  disabled={saving || training.deliverableId} // Disallow changing title if linked to a deliverable
                  title={training.deliverableId ? "Não é possível alterar o nome de um treinamento vinculado a uma pendência" : ""}
                />
              </div>

              {/* Date and Time */}
              <div className="grid-responsive-2">
                <div>
                  <label className="modal-label" htmlFor="edit-date">Data</label>
                  <input
                    id="edit-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="modal-input"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="modal-label" htmlFor="edit-time">Horário</label>
                  <input
                    id="edit-time"
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="08:00 - 12:00"
                    className="modal-input"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Responsible */}
              <div>
                <label className="modal-label" htmlFor="edit-responsible">Responsável (Técnico)</label>
                <select
                  id="edit-responsible"
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                  className="modal-input"
                  disabled={saving}
                >
                  <option value="">Nenhum</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              {/* Travel options */}
              <div>
                <label className="modal-label">Haverá deslocamento até a empresa?</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="radio" checked={hasTravel} onChange={() => setHasTravel(true)} disabled={saving} />
                    Sim, contabilizar percurso
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="radio" checked={!hasTravel} onChange={() => setHasTravel(false)} disabled={saving} />
                    Não (Ex: Online, interno)
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="modal-label" htmlFor="edit-description">Descrição / Observações</label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes adicionais sobre o treinamento..."
                  className="modal-input"
                  rows={3}
                  disabled={saving}
                  style={{ resize: 'vertical' }}
                />
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={saving || !date || !selectedCompanyId || !title.trim()}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditTrainingModal;
