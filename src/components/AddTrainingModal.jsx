import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
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
  const [secondaryResponsibleId, setSecondaryResponsibleId] = useState('');

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [recurrence, setRecurrence] = useState('none');
  const [customDays, setCustomDays] = useState(7);
  const [repeatCount, setRepeatCount] = useState(4);

  const [customTitle, setCustomTitle] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  // Padrão amigável: quase todo treinamento externo envolve deslocamento
  const [hasTravel, setHasTravel] = useState(true);

  // Demanda externa (fora do TotalSafety)
  const [isExternalDemand, setIsExternalDemand] = useState(false);
  const [externalCompanyName, setExternalCompanyName] = useState('');
  const [externalSuggestions, setExternalSuggestions] = useState([]);

  const [pendingTrainings, setPendingTrainings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Controle de colisão (mesma empresa no mesmo dia)
  const [checkingCollision, setCheckingCollision] = useState(false);
  const [collisionDetected, setCollisionDetected] = useState(false);
  const [collisionChoice, setCollisionChoice] = useState('shared'); // 'shared', 'separate', 'cancel'

  const modalBodyRef = useRef(null);
  const collisionRef = useRef(null);

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
      
      if (selectedCompanyId && !isExternalDemand) {
        const deliverables = await getDeliverablesByCompany(selectedCompanyId);
        const pTrainings = deliverables.filter(d => d.type === 'treinamento' && d.status === 'pendente');
        setPendingTrainings(pTrainings);
        if (pTrainings.length === 0) {
          setIsStandalone(true);
        } else {
          // Pré-seleciona automaticamente o primeiro treinamento pendente para facilitar a experiência
          setSelectedDeliverableId(prev => prev || pTrainings[0].id);
        }
      } else {
        setPendingTrainings([]);
        if (isExternalDemand) setIsStandalone(true);
      }

      // Buscar sugestões de nomes de empresas externas já utilizadas
      try {
        const { data: extRows } = await supabase.from('trainings').select('external_company_name, description');
        if (extRows) {
          const names = new Set();
          extRows.forEach(r => {
            if (r.external_company_name) names.add(r.external_company_name.trim());
            if (r.description) {
              const m = r.description.match(/\[EXTERNAL_COMPANY:([^\]]+)\]/);
              if (m) names.add(m[1].trim());
            }
          });
          setExternalSuggestions(Array.from(names).filter(Boolean));
        }
      } catch (err) {}

      setLoadingData(false);
    }
    load();
  }, [companyId, selectedCompanyId, isExternalDemand]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Validações com mensagens claras e precisas
    if (!date) {
      setValidationError('Por favor, selecione a Data do agendamento.');
      if (modalBodyRef.current) modalBodyRef.current.scrollTop = 0;
      return;
    }

    if (!isExternalDemand && !selectedCompanyId) {
      setValidationError('Por favor, selecione a Empresa TotalSafety antes de agendar.');
      if (modalBodyRef.current) modalBodyRef.current.scrollTop = 0;
      return;
    }

    if (isExternalDemand && !externalCompanyName.trim()) {
      setValidationError('Por favor, informe o Nome da Empresa (Demanda Fora do TotalSafety).');
      if (modalBodyRef.current) modalBodyRef.current.scrollTop = 0;
      return;
    }

    if ((isStandalone || isExternalDemand) && !customTitle.trim()) {
      setValidationError('Por favor, digite o Nome do Treinamento.');
      if (modalBodyRef.current) modalBodyRef.current.scrollTop = 120;
      return;
    }

    if (!isStandalone && !isExternalDemand && !selectedDeliverableId) {
      setValidationError('Por favor, selecione um Treinamento Pendente ou marque como "Treinamento Avulso".');
      if (modalBodyRef.current) modalBodyRef.current.scrollTop = 120;
      return;
    }

    if (hasTravel === null) {
      setValidationError('Por favor, indique se haverá deslocamento até a empresa.');
      return;
    }

    // Verificação de colisão de agendamento no mesmo dia para a mesma empresa
    if (!collisionDetected && !isExternalDemand && selectedCompanyId) {
      setCheckingCollision(true);
      try {
        const { data: existing } = await supabase
          .from('trainings')
          .select('id, title')
          .eq('company_id', selectedCompanyId)
          .eq('date', date);
        
        if (existing && existing.length > 0) {
          setCollisionDetected(true);
          setCollisionChoice(hasTravel ? 'shared' : 'separate');
          setCheckingCollision(false);
          setTimeout(() => {
            collisionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
          return; // Aguarda decisão do usuário no alerta de colisão
        }
      } catch (err) {
        console.error('Erro checando colisão:', err);
      } finally {
        setCheckingCollision(false);
      }
    }

    if (collisionDetected && collisionChoice === 'cancel') {
      onClose();
      return;
    }
    
    setSaving(true);
    try {
      let title = customTitle.trim();
      let deliverableId = null;

      if (!isStandalone && !isExternalDemand) {
        const selectedDeliv = pendingTrainings.find(d => d.id === selectedDeliverableId);
        if (selectedDeliv) {
          title = selectedDeliv.title;
          deliverableId = selectedDeliverableId;
        }
      }
      
      let finalDescription = description.trim();
      if (!hasTravel) {
        finalDescription += '\n[NO_TRAVEL]';
      } else if (collisionDetected && collisionChoice === 'shared') {
        finalDescription += '\n[SHARED_TRIP]';
      }
      if (secondaryResponsibleId) {
        finalDescription += `\n[RESP2_ID:${secondaryResponsibleId}]`;
      }

      const baseItem = {
        title,
        time,
        instructor: instructor.trim(),
        description: finalDescription,
        status: 'agendado',
        deliverableId: isExternalDemand ? null : deliverableId,
        companyId: isExternalDemand ? null : selectedCompanyId,
        responsibleId: responsibleId || null,
        isExternal: isExternalDemand,
        externalCompanyName: isExternalDemand ? externalCompanyName.trim() : null,
        demandType: isExternalDemand ? 'externa' : 'totalsafety',
      };

      const itemsToSave = [];
      
      if (recurrence !== 'none') {
        let currentDate = new Date(date + 'T12:00:00');
        for (let i = 0; i <= repeatCount; i++) {
          let dateStr = currentDate.toISOString().split('T')[0];
          
          itemsToSave.push({
            ...baseItem,
            date: dateStr,
          });

          if (recurrence === 'weekly' || recurrence === 'weekly_same_day') {
            currentDate.setDate(currentDate.getDate() + 7);
          } else if (recurrence === 'monthly') {
            const originalDate = new Date(dateStr + 'T12:00:00');
            const weekday = originalDate.getDay();
            const nth = Math.ceil(originalDate.getDate() / 7);
            
            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(1);
            while (currentDate.getDay() !== weekday) {
              currentDate.setDate(currentDate.getDate() + 1);
            }
            currentDate.setDate(currentDate.getDate() + (nth - 1) * 7);
            
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
      onClose();
    } catch (err) {
      console.error('Erro ao agendar:', err);
      setValidationError(err.message || 'Ocorreu um erro ao salvar o agendamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '560px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--info))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Calendar size={18} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Novo Agendamento na Agenda
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Agende treinamentos para clientes TotalSafety ou demandas externas
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {loadingData ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Carregando dados da agenda...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            
            {/* CORPO DO FORMULÁRIO COM ROLAGEM */}
            <div 
              ref={modalBodyRef} 
              className="modal-body" 
              style={{ 
                overflowY: 'auto', 
                flex: 1, 
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >

              {/* Mensagem de Erro de Validação no Topo se houver */}
              {validationError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600',
                  animation: 'fadeIn 0.2s ease-in-out'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Escolha do Tipo de Demanda */}
              {!companyId && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Tipo de Demanda:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${!isExternalDemand ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: !isExternalDemand ? 'var(--primary-light)' : 'var(--surface)',
                      cursor: 'pointer', fontWeight: !isExternalDemand ? '700' : '500', fontSize: '0.8125rem',
                      color: !isExternalDemand ? 'var(--primary)' : 'var(--text-primary)',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="demand_type_choice"
                        checked={!isExternalDemand}
                        onChange={() => {
                          setIsExternalDemand(false);
                          setValidationError('');
                        }}
                        style={{ margin: 0 }}
                      />
                      🏢 Cliente TotalSafety
                    </label>

                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${isExternalDemand ? '#8b5cf6' : 'var(--border)'}`,
                      backgroundColor: isExternalDemand ? '#f3e8ff' : 'var(--surface)',
                      cursor: 'pointer', fontWeight: isExternalDemand ? '700' : '500', fontSize: '0.8125rem',
                      color: isExternalDemand ? '#6b21a8' : 'var(--text-primary)',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="demand_type_choice"
                        checked={isExternalDemand}
                        onChange={() => {
                          setIsExternalDemand(true);
                          setIsStandalone(true);
                          setValidationError('');
                        }}
                        style={{ margin: 0 }}
                      />
                      ⚡ Demanda Fora do TotalSafety
                    </label>
                  </div>
                </div>
              )}

              {/* Se for Demanda Externa */}
              {isExternalDemand ? (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <label className="modal-label" htmlFor="external-company-name" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Nome da Empresa (Demanda Fora do TotalSafety) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="external-company-name"
                    type="text"
                    list="external-company-list"
                    value={externalCompanyName}
                    onChange={(e) => {
                      setExternalCompanyName(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="Ex: Construtora Horizonte, Mineradora ABC..."
                    className="modal-input"
                    style={{
                      border: validationError && !externalCompanyName.trim() ? '2px solid var(--danger)' : undefined
                    }}
                    disabled={saving}
                    autoFocus
                  />
                  {externalSuggestions.length > 0 && (
                    <datalist id="external-company-list">
                      {externalSuggestions.map((name, idx) => (
                        <option key={idx} value={name} />
                      ))}
                    </datalist>
                  )}
                  <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.75rem', color: '#7c3aed', fontWeight: '500' }}>
                    ⚡ Esta empresa não precisa ter contrato no TotalSafety. O treinamento aparecerá identificado com tag roxa no calendário.
                  </p>
                </div>
              ) : (
                <>
                  {/* Filtro de Grupo Econômico (se global) */}
                  {!companyId && (
                    <div>
                      <label className="modal-label" htmlFor="training-group" style={{ fontSize: '0.8125rem', fontWeight: '600' }}>
                        Filtrar por Grupo Econômico (Opcional)
                      </label>
                      <select
                        id="training-group"
                        value={selectedGroupId}
                        onChange={(e) => {
                          setSelectedGroupId(e.target.value);
                          setSelectedCompanyId('');
                        }}
                        className="modal-input"
                        disabled={saving}
                      >
                        <option value="">Todos os Grupos ({companies.length} empresas)</option>
                        {[...groups]
                          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                          .map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Seleção da Empresa TotalSafety */}
                  {!companyId && (
                    <div>
                      <label className="modal-label" htmlFor="training-company" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                        Empresa TotalSafety <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <select
                        id="training-company"
                        value={selectedCompanyId}
                        onChange={(e) => {
                          setSelectedCompanyId(e.target.value);
                          if (validationError) setValidationError('');
                        }}
                        className="modal-input"
                        style={{
                          border: validationError && !selectedCompanyId ? '2px solid var(--danger)' : undefined,
                          fontWeight: selectedCompanyId ? '600' : 'normal'
                        }}
                        disabled={saving}
                      >
                        <option value="">Selecione a empresa...</option>
                        {companies
                          .filter(c => !selectedGroupId || c.groupId === selectedGroupId)
                          .sort((a, b) => {
                            if (!selectedGroupId && groups.length > 0) {
                              const grpA = groups.find(g => g.id === a.groupId)?.name || '';
                              const grpB = groups.find(g => g.id === b.groupId)?.name || '';
                              if (grpA && grpB && grpA !== grpB) {
                                return grpA.localeCompare(grpB, undefined, { numeric: true });
                              }
                            }
                            return a.name.localeCompare(b.name, undefined, { numeric: true });
                          })
                          .map(c => {
                            const grp = groups.find(g => g.id === c.groupId);
                            const grpNum = grp ? grp.name.match(/^\d+/)?.[0] : null;
                            const hasNumPrefix = /^\d+/.test(c.name);
                            const label = !selectedGroupId && grpNum && !hasNumPrefix
                              ? `${grpNum} - ${c.name}`
                              : c.name;
                            return (
                              <option key={c.id} value={c.id}>{label}</option>
                            );
                          })}
                      </select>
                    </div>
                  )}
                  
                  {/* Opção Vincular Pendência vs Avulso */}
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: !isStandalone ? '600' : 'normal' }}>
                      <input 
                        type="radio" 
                        name="training_mode_type"
                        checked={!isStandalone} 
                        onChange={() => {
                          setIsStandalone(false);
                          if (pendingTrainings.length > 0 && !selectedDeliverableId) {
                            setSelectedDeliverableId(pendingTrainings[0].id);
                          }
                          setValidationError('');
                        }} 
                        disabled={pendingTrainings.length === 0} 
                      />
                      Vincular a Pendência ({pendingTrainings.length})
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: isStandalone ? '600' : 'normal' }}>
                      <input 
                        type="radio" 
                        name="training_mode_type"
                        checked={isStandalone} 
                        onChange={() => {
                          setIsStandalone(true);
                          setValidationError('');
                        }} 
                      />
                      Treinamento Avulso (Novo)
                    </label>
                  </div>
                </>
              )}

              {/* Seletor de Pendência ou Campo de Título Avulso */}
              {!isStandalone ? (
                <div>
                  <label className="modal-label" htmlFor="training-select" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Treinamento Pendente do Contrato <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  {pendingTrainings.length === 0 ? (
                    <div style={{
                      padding: '0.85rem', textAlign: 'center', color: 'var(--text-secondary)',
                      backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem', border: '1px dashed var(--border)'
                    }}>
                      ✅ Não há pendências para esta empresa. O modo foi alterado para Treinamento Avulso.
                    </div>
                  ) : (
                    <select
                      id="training-select"
                      value={selectedDeliverableId}
                      onChange={(e) => {
                        setSelectedDeliverableId(e.target.value);
                        if (validationError) setValidationError('');
                      }}
                      className="modal-input"
                      style={{
                        border: validationError && !selectedDeliverableId ? '2px solid var(--danger)' : undefined,
                        fontWeight: '600'
                      }}
                      disabled={saving}
                    >
                      <option value="">Selecione um treinamento pendente...</option>
                      {pendingTrainings.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title} {t.dueDate ? `(Prazo: ${new Date(t.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <label className="modal-label" htmlFor="training-custom" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Nome do Treinamento <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="training-custom"
                    type="text"
                    value={customTitle}
                    onChange={(e) => {
                      setCustomTitle(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    className="modal-input"
                    placeholder="Ex: NR-35 Trabalho em Altura / Brigada de Incêndio"
                    style={{
                      border: validationError && !customTitle.trim() ? '2px solid var(--danger)' : undefined,
                      fontWeight: '600'
                    }}
                    disabled={saving}
                  />
                </div>
              )}

              {/* Repetição Opcional */}
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>Repetição (Opcional)</label>
                <select
                  className="modal-input"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  disabled={saving}
                  style={{ marginTop: '0.25rem' }}
                >
                  <option value="none">Não repetir (padrão)</option>
                  <option value="weekly">Semanalmente (a cada 7 dias)</option>
                  <option value="weekly_same_day">Semanalmente (no mesmo dia da semana)</option>
                  <option value="monthly">Mensalmente (no mesmo dia da semana)</option>
                  <option value="custom">Personalizado (a cada X dias)</option>
                  <option value="custom_same_day">Personalizado (a cada X dias no mesmo dia da semana)</option>
                </select>

                {recurrence !== 'none' && (
                  <div className={recurrence === 'custom' || recurrence === 'custom_same_day' ? 'grid-responsive-2' : ''} style={{ display: 'grid', gridTemplateColumns: (recurrence === 'custom' || recurrence === 'custom_same_day') ? undefined : '1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    {(recurrence === 'custom' || recurrence === 'custom_same_day') && (
                      <div>
                        <label className="modal-label" style={{ fontSize: '0.75rem' }}>A cada quantos dias?</label>
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
                      <label className="modal-label" style={{ fontSize: '0.75rem' }}>Nº de ocorrências futuras</label>
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

              {/* Data e Horário */}
              <div className="grid-responsive-2">
                <div>
                  <label className="modal-label" htmlFor="training-date" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Data <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id="training-date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    className="modal-input"
                    style={{
                      border: validationError && !date ? '2px solid var(--danger)' : undefined,
                      marginTop: '0.25rem'
                    }}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="modal-label" htmlFor="training-time" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Horário
                  </label>
                  <input
                    id="training-time"
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="08:00 - 12:00"
                    className="modal-input"
                    disabled={saving}
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>
              </div>

              {/* Técnicos / Responsáveis */}
              <div className="grid-responsive-2">
                <div>
                  <label className="modal-label" htmlFor="training-responsible" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Responsável 1 (Técnico)
                  </label>
                  <select
                    id="training-responsible"
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    className="modal-input"
                    disabled={saving}
                    style={{ marginTop: '0.25rem' }}
                  >
                    <option value="">Nenhum</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="modal-label" htmlFor="training-responsible-2" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                    Responsável 2 (Técnico)
                  </label>
                  <select
                    id="training-responsible-2"
                    value={secondaryResponsibleId}
                    onChange={(e) => setSecondaryResponsibleId(e.target.value)}
                    className="modal-input"
                    disabled={saving}
                    style={{ marginTop: '0.25rem' }}
                  >
                    <option value="">Nenhum</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opção de Deslocamento */}
              <div>
                <label className="modal-label" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                  Haverá deslocamento até a empresa? <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: hasTravel === true ? '700' : 'normal' }}>
                    <input 
                      type="radio" 
                      name="has_travel_choice"
                      checked={hasTravel === true} 
                      onChange={() => {
                        setHasTravel(true);
                        if (validationError) setValidationError('');
                      }} 
                      disabled={saving} 
                    />
                    Sim, contabilizar percurso
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: hasTravel === false ? '700' : 'normal' }}>
                    <input 
                      type="radio" 
                      name="has_travel_choice"
                      checked={hasTravel === false} 
                      onChange={() => {
                        setHasTravel(false);
                        if (validationError) setValidationError('');
                      }} 
                      disabled={saving} 
                    />
                    Não (Ex: Online, interno)
                  </label>
                </div>
              </div>

              {/* Descrição / Observações */}
              <div>
                <label className="modal-label" htmlFor="training-description" style={{ fontWeight: '700', fontSize: '0.8125rem' }}>
                  Descrição / Observações
                </label>
                <textarea
                  id="training-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes adicionais sobre o treinamento..."
                  className="modal-input"
                  rows={3}
                  disabled={saving}
                  style={{ resize: 'vertical', marginTop: '0.25rem' }}
                />
              </div>

              {/* Alerta de Colisão de Data/Empresa se detectado */}
              {collisionDetected && (
                <div 
                  ref={collisionRef} 
                  style={{ 
                    backgroundColor: '#fffbeb', 
                    border: '1px solid #fcd34d', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem',
                    animation: 'fadeIn 0.2s ease-in-out'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
                    <AlertCircle size={20} />
                    <strong style={{ fontSize: '0.95rem' }}>Atenção: Já existe agendamento nesta data</strong>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#78350f', margin: 0 }}>
                    Já existe outro treinamento agendado para esta empresa no dia <strong>{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>. Como deseja prosseguir com o deslocamento?
                  </p>
                  
                  {hasTravel && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: collisionChoice === 'shared' ? '700' : 'normal' }}>
                        <input 
                          type="radio" 
                          name="collisionChoice" 
                          value="shared" 
                          checked={collisionChoice === 'shared'} 
                          onChange={(e) => setCollisionChoice(e.target.value)} 
                        />
                        🚗 Aproveitar a mesma viagem (Compartilhar deslocamento)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: collisionChoice === 'separate' ? '700' : 'normal' }}>
                        <input 
                          type="radio" 
                          name="collisionChoice" 
                          value="separate" 
                          checked={collisionChoice === 'separate'} 
                          onChange={(e) => setCollisionChoice(e.target.value)} 
                        />
                        🔄 Fazer uma nova viagem (Ida e volta novamente)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--danger)' }}>
                        <input 
                          type="radio" 
                          name="collisionChoice" 
                          value="cancel" 
                          checked={collisionChoice === 'cancel'} 
                          onChange={(e) => setCollisionChoice(e.target.value)} 
                        />
                        Cancelar e não agendar
                      </label>
                    </div>
                  )}

                  {!hasTravel && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: collisionChoice === 'separate' ? '700' : 'normal' }}>
                        <input 
                          type="radio" 
                          name="collisionChoiceNoTravel" 
                          value="separate" 
                          checked={collisionChoice === 'separate'} 
                          onChange={() => setCollisionChoice('separate')} 
                        />
                        Sim, agendar mesmo com outro treinamento na data
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--danger)' }}>
                        <input 
                          type="radio" 
                          name="collisionChoiceNoTravel" 
                          value="cancel" 
                          checked={collisionChoice === 'cancel'} 
                          onChange={() => setCollisionChoice('cancel')} 
                        />
                        Cancelar e não agendar
                      </label>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* RODAPÉ FIXO DO MODAL COM MENSAGEM DE VALIDAÇÃO E BOTÕES */}
            <div 
              className="modal-footer" 
              style={{ 
                flexShrink: 0, 
                backgroundColor: 'var(--surface)', 
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              {validationError && (
                <div style={{
                  color: 'var(--danger)',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={15} />
                  <span>{validationError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', width: '100%' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onClose} 
                  disabled={saving || checkingCollision}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={saving || checkingCollision}
                  style={{
                    backgroundColor: '#0284c7',
                    fontWeight: '700',
                    padding: '0.6rem 1.4rem',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  {checkingCollision ? 'Verificando...' : (saving ? 'Agendando...' : 'Agendar')}
                </button>
              </div>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default AddTrainingModal;
