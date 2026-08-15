import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { getDeliverablesByCompany, getCompanies, getProfiles, getGroups } from '../services/storageService';
import { supabase } from '../lib/supabase';

const AddTrainingModal = ({ defaultDate, companyId, onClose, onSave }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
  const [companies, setCompanies] = useState([]);
  
  const [selectedDeliverableId, setSelectedDeliverableId] = useState('');
  const [date, setDate] = useState(defaultDate || '');
  const [time, setTime] = useState('08:00 - 12:00');
  const [instructor, setInstructor] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState('');

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [recurrence, setRecurrence] = useState('none');
  const [customDays, setCustomDays] = useState(7);
  const [repeatCount, setRepeatCount] = useState(4);

  const [customTitle, setCustomTitle] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasTravel, setHasTravel] = useState(null);

  const [pendingTrainings, setPendingTrainings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // Controle de colisão (mesma empresa no mesmo dia)
  const [checkingCollision, setCheckingCollision] = useState(false);
  const [collisionDetected, setCollisionDetected] = useState(false);
  const [collisionChoice, setCollisionChoice] = useState('cancel'); // 'cancel', 'shared', 'separate'

  useEffect(() => {
    async function load() {
      setLoadingData(true);
      const [comps, profs, grps] = await Promise.all([
        !companyId ? getCompanies() : Promise.resolve([]),
        getProfiles(),
        !companyId ? getGroups() : Promise.resolve([])
      ]);
      if (!companyId) {
        setCompanies(comps);
        setGroups(grps);
      }
      setProfiles(profs);
      
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
    if (hasTravel === null) return;

    if (!collisionDetected) {
      setCheckingCollision(true);
      const { data: existing } = await supabase
        .from('trainings')
        .select('id, title')
        .eq('company_id', selectedCompanyId)
        .eq('date', date);
      setCheckingCollision(false);

      if (existing && existing.length > 0) {
        setCollisionDetected(true);
        return; // wait for user feedback
      }
    }

    if (collisionDetected && collisionChoice === 'cancel') {
      onClose();
      return;
    }
    
    setSaving(true);
    let title = customTitle.trim();
    let deliverableId = null;

    if (!isStandalone) {
      const selectedDeliv = pendingTrainings.find(d => d.id === selectedDeliverableId);
      title = selectedDeliv.title;
      deliverableId = selectedDeliverableId;
    }
    
    let finalDescription = description.trim();
    if (!hasTravel) {
      finalDescription += '\n[NO_TRAVEL]';
    } else if (collisionDetected && collisionChoice === 'shared') {
      finalDescription += '\n[SHARED_TRIP]';
    }

    const baseItem = {
      title,
      time,
      instructor: instructor.trim(),
      description: finalDescription,
      status: 'agendado',
      deliverableId,
      companyId: selectedCompanyId,
      responsibleId: responsibleId || null
    };

    const itemsToSave = [];
    
    if (recurrence !== 'none') {
       let currentDate = new Date(date);
       for (let i = 0; i <= repeatCount; i++) {
           let dateStr = currentDate.toISOString().split('T')[0];
           
           itemsToSave.push({
               ...baseItem,
               date: dateStr,
           });

           if (recurrence === 'weekly' || recurrence === 'weekly_same_day') {
               currentDate.setDate(currentDate.getDate() + 7);
           } else if (recurrence === 'monthly') {
               const originalDate = new Date(dateStr);
               const weekday = originalDate.getDay();
               const nth = Math.ceil(originalDate.getDate() / 7);
               
               currentDate.setMonth(currentDate.getMonth() + 1);
               currentDate.setDate(1);
               while (currentDate.getDay() !== weekday) {
                   currentDate.setDate(currentDate.getDate() + 1);
               }
               currentDate.setDate(currentDate.getDate() + (nth - 1) * 7);
               
               // If it spilled over to the next month, pull back by 1 week
               if (currentDate.getMonth() !== (originalDate.getMonth() + 1) % 12) {
                   currentDate.setDate(currentDate.getDate() - 7);
               }
           } else if (recurrence === 'custom_same_day') {
               const weeksToAdd = Math.round(customDays / 7) || 1;
               currentDate.setDate(currentDate.getDate() + (weeksToAdd * 7));
           } else if (recurrence === 'custom') {
               currentDate.setDate(currentDate.getDate() + customDays);
           }
       }
    } else {
       itemsToSave.push({ ...baseItem, date });
    }

    await onSave(itemsToSave);
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

              {/* Group Selection if global */}
              {!companyId && (
                <div>
                  <label className="modal-label" htmlFor="training-group">Grupo Econômico</label>
                  <select
                    id="training-group"
                    value={selectedGroupId}
                    onChange={(e) => {
                      setSelectedGroupId(e.target.value);
                      setSelectedCompanyId(''); // reset company when group changes
                    }}
                    className="modal-input"
                    disabled={saving}
                  >
                    <option value="">Todos os Grupos</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
                    {companies
                      .filter(c => !selectedGroupId || c.groupId === selectedGroupId)
                      .map(c => (
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

              {/* Repetição */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--surface-light)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <label className="modal-label">Repetição (Opcional)</label>
                <select
                  className="modal-input"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  disabled={saving}
                >
                  <option value="none">Não repetir (padrão)</option>
                  <option value="weekly">Semanalmente (a cada 7 dias)</option>
                  <option value="weekly_same_day">Semanalmente (no mesmo dia da semana)</option>
                  <option value="monthly">Mensalmente (no mesmo dia da semana)</option>
                  <option value="custom">Personalizado (a cada X dias)</option>
                  <option value="custom_same_day">Personalizado (a cada X dias no mesmo dia da semana)</option>
                </select>

                {recurrence !== 'none' && (
                  <div className={recurrence === 'custom' || recurrence === 'custom_same_day' ? 'grid-responsive-2' : ''} style={{ display: 'grid', gridTemplateColumns: (recurrence === 'custom' || recurrence === 'custom_same_day') ? undefined : '1fr', gap: '1rem', marginTop: '1rem' }}>
                    {(recurrence === 'custom' || recurrence === 'custom_same_day') && (
                      <div>
                        <label className="modal-label">A cada quantos dias?</label>
                        <input
                          type="number"
                          min="1"
                          className="modal-input"
                          value={customDays}
                          onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                          disabled={saving}
                        />
                      </div>
                    )}
                    <div>
                      <label className="modal-label">Nº de ocorrências futuras (além da 1ª)</label>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        className="modal-input"
                        value={repeatCount}
                        onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid-responsive-2">
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

              {/* Responsible */}
              <div>
                <label className="modal-label" htmlFor="training-responsible">Responsável (Técnico)</label>
                <select
                  id="training-responsible"
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
                <label className="modal-label">Haverá deslocamento até a empresa? <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="radio" checked={hasTravel === true} onChange={() => setHasTravel(true)} disabled={saving} />
                    Sim, contabilizar percurso
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="radio" checked={hasTravel === false} onChange={() => setHasTravel(false)} disabled={saving} />
                    Não (Ex: Online, interno)
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="modal-label" htmlFor="training-description">Descrição / Observações</label>
                <textarea
                  id="training-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes adicionais sobre o treinamento..."
                  className="modal-input"
                  rows={3}
                  disabled={saving}
                  style={{ resize: 'vertical' }}
                />
                {collisionDetected && (
                <div style={{ backgroundColor: 'var(--warning-light)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
                    <AlertCircle size={20} />
                    <strong style={{ fontSize: '0.95rem' }}>Atenção: Agendamento Duplo</strong>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Já existe um agendamento para esta empresa na mesma data. Deseja agendar mesmo assim?
                  </p>
                  
                  {hasTravel && (
                    <>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, fontWeight: '600' }}>
                        Como será feito o deslocamento logístico?
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input type="radio" name="collisionChoice" value="cancel" checked={collisionChoice === 'cancel'} onChange={(e) => setCollisionChoice(e.target.value)} />
                          Cancelar e não agendar
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input type="radio" name="collisionChoice" value="shared" checked={collisionChoice === 'shared'} onChange={(e) => setCollisionChoice(e.target.value)} />
                          Aproveitar a mesma viagem (Compartilhar deslocamento)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input type="radio" name="collisionChoice" value="separate" checked={collisionChoice === 'separate'} onChange={(e) => setCollisionChoice(e.target.value)} />
                          Fazer uma nova viagem (Ida e volta novamente)
                        </label>
                      </div>
                    </>
                  )}
                  {!hasTravel && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input type="radio" name="collisionChoiceNoTravel" value="cancel" checked={collisionChoice === 'cancel'} onChange={() => setCollisionChoice('cancel')} />
                        Cancelar e não agendar
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input type="radio" name="collisionChoiceNoTravel" value="separate" checked={collisionChoice === 'separate'} onChange={() => setCollisionChoice('separate')} />
                        Sim, agendar
                      </label>
                    </div>
                  )}
                </div>
              )}
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving || checkingCollision}>Cancelar</button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={saving || checkingCollision || (collisionDetected && collisionChoice === 'cancel') || (!isStandalone && !selectedDeliverableId) || (isStandalone && !customTitle.trim()) || !date || !selectedCompanyId || hasTravel === null}
              >
                {checkingCollision ? 'Verificando...' : (saving ? 'Agendando...' : 'Agendar')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddTrainingModal;
