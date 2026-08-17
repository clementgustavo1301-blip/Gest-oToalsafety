import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle, PauseCircle, XCircle, Building2, Calendar as CalendarIcon, Filter, Edit2, Trash2, Sunrise, Sun, FileText } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getTrainings, getCompanies, addTraining, updateTraining, deleteTraining } from '../services/storageService';
import AddTrainingModal from '../components/AddTrainingModal';
import EditTrainingModal from '../components/EditTrainingModal';
import ReportGeneratorModal from '../components/ReportGeneratorModal';

const getPeriod = (timeStr) => {
  if (!timeStr) return 'manha';
  const match = timeStr.match(/(\d{1,2})[:h]/i);
  if (match) {
    const hour = parseInt(match[1], 10);
    if (hour >= 12) return 'tarde';
  }
  return 'manha';
};

const STATUS_CONFIG = {
  agendado: { label: 'Agendado', color: 'var(--primary)', bg: 'var(--primary-light)' },
  concluido: { label: 'Concluído', color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  adiado: { label: 'Adiado', color: '#b45309', bg: '#fef3c7' },
  nao_feito: { label: 'Não Feito', color: 'var(--danger)', bg: '#fee2e2' },
};

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [generatingReportFor, setGeneratingReportFor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  
  const [calendarScope, setCalendarScope] = useState('geral');
  const [calendarCompanyId, setCalendarCompanyId] = useState('');
  
  const { userProfile } = useAuth();

  const [trainings, setTrainings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [pendingTrainings, setPendingTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const [trn, comp, { getDeliverables, getProfiles }] = await Promise.all([
      getTrainings(),
      getCompanies(),
      import('../services/storageService')
    ]);
    const deliverables = await getDeliverables();
    const profs = await getProfiles();
    
    setTrainings(trn);
    setCompanies(comp);
    setProfiles(profs);
    setPendingTrainings(deliverables.filter(d => d.type === 'treinamento' && d.status === 'pendente'));
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleAddTraining = async (dataOrArray) => {
    const items = Array.isArray(dataOrArray) ? dataOrArray : [dataOrArray];
    for (const data of items) {
      await addTraining(data);
    }
    setShowModal(false);
    await loadData(false);
  };

  const handleStatusChange = async (trainingId, newStatus) => {
    await updateTraining(trainingId, { status: newStatus });
    await loadData(false);
  };

  const handleDeleteTraining = async (trainingId) => {
    if (window.confirm('Deseja realmente cancelar este agendamento? Ele voltará para a lista de pendentes.')) {
      await deleteTraining(trainingId);
      await loadData(false);
    }
  };

  const getCompanyName = (companyId) => companies.find(c => c.id === companyId)?.name || 'N/A';
  const getCompanyCategory = (companyId) => companies.find(c => c.id === companyId)?.category || 'TotalSafety';
  const getProfileName = (profileId) => profiles.find(p => p.id === profileId)?.name || 'Desconhecido';

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDayClick = (day) => {
    setSelectedDate(format(day, 'yyyy-MM-dd'));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando calendário...</div>;
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const getCompanyRegion = (companyId) => companies.find(c => c.id === companyId)?.region || 'Natal';

  const filteredTrainings = trainings.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchRegion = filterRegion === 'all' || getCompanyRegion(t.companyId) === filterRegion;
    const matchScope = calendarScope === 'geral' 
      ? true 
      : calendarScope === 'minha_agenda'
      ? t.responsibleId === userProfile?.id
      : calendarScope === 'empresa'
      ? t.companyId === calendarCompanyId
      : true;
    return matchStatus && matchRegion && matchScope;
  });

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEvents = filteredTrainings.filter(t => t.date === dateStr);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());
      const isSelected = selectedDate === dateStr;

      days.push(
        <div 
          key={dateStr}
          onClick={() => handleDayClick(cloneDay)}
          style={{
            minHeight: '120px',
            minWidth: 0, /* Fixes grid item blowout */
            padding: '0.5rem',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            backgroundColor: !isCurrentMonth ? 'var(--background)' : isSelected ? 'var(--primary-light)' : 'var(--surface)',
            color: !isCurrentMonth ? 'var(--text-secondary)' : 'var(--text-primary)',
            transition: 'var(--transition)',
            cursor: 'pointer',
            opacity: isCurrentMonth ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--primary-light)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = !isCurrentMonth ? 'var(--background)' : 'var(--surface)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: isToday ? 'var(--primary)' : 'transparent',
              color: isToday ? 'white' : 'inherit',
              fontWeight: isToday ? 'bold' : 'normal',
              fontSize: '0.875rem'
            }}>
              {format(day, 'd')}
            </span>
          </div>
          
          {/* Day Events grouped by Manhã / Tarde */}
          {(() => {
            const manhaEvents = dayEvents.filter(t => getPeriod(t.time) === 'manha');
            const tardeEvents = dayEvents.filter(t => getPeriod(t.time) === 'tarde');

            const renderEventItem = (event) => {
              const sc = STATUS_CONFIG[event.status] || STATUS_CONFIG.agendado;
              const compName = getCompanyName(event.companyId);
              return (
                <div key={event.id} style={{
                  fontSize: '0.6875rem', padding: '0.125rem 0.375rem',
                  backgroundColor: sc.bg, color: sc.color,
                  borderRadius: '3px', borderLeft: `3px solid ${sc.color}`,
                  overflow: 'hidden',
                  fontWeight: '500'
                }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
                    {event.time && <span style={{ fontSize: '0.5625rem', opacity: 0.8, marginLeft: '0.25rem', flexShrink: 0 }}>{event.time.split(' ')[0]}</span>}
                  </div>
                  {compName && compName !== 'N/A' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginTop: '1px',
                    }}>
                      <span 
                        title={getCompanyCategory(event.companyId)}
                        style={{
                          width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: getCompanyCategory(event.companyId) === 'Consultoria Fixa' ? '#f97316' : '#22c55e'
                        }} 
                      />
                      <div style={{
                        fontSize: '0.5625rem',
                        opacity: 0.85,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '1.1'
                      }}>
                        {compName}
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {manhaEvents.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <div style={{ fontSize: '0.5625rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem', opacity: 0.9 }}>
                      <Sunrise size={10} /> Manhã
                    </div>
                    {manhaEvents.map(renderEventItem)}
                  </div>
                )}
                {tardeEvents.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <div style={{ fontSize: '0.5625rem', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem', opacity: 0.9 }}>
                      <Sun size={10} /> Tarde
                    </div>
                    {tardeEvents.map(renderEventItem)}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }} key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const selectedDayEvents = selectedDate
    ? filteredTrainings.filter(t => t.date === selectedDate).map(t => ({ ...t, companyName: getCompanyName(t.companyId) }))
    : [];

  const statusIcons = {
    agendado: <CalendarIcon size={16} color="var(--primary)" />,
    concluido: <CheckCircle size={16} color="var(--secondary)" />,
    adiado: <PauseCircle size={16} color="#b45309" />,
    nao_feito: <XCircle size={16} color="var(--danger)" />,
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header className="header-responsive" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-h1">Agenda de Treinamentos</h1>
          <p className="text-subtitle">Visão geral de todas as empresas. Acesse a empresa para agendar.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {pendingTrainings.length > 0 && (
            <div style={{
              padding: '0.75rem 1rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.8125rem', fontWeight: '500'
            }}>
              <PauseCircle size={16} />
              Você tem {pendingTrainings.length} treinamento(s) aguardando agendamento! (Vá na Empresa para agendar)
            </div>
          )}
        </div>
      </header>

      {/* Legend and Filter */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: val.color }} />
              {val.label}
            </div>
          ))}
          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border)', margin: '0 0.25rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
            <Sunrise size={14} /> Manhã (&lt; 12h)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#d97706', fontWeight: '600' }}>
            <Sun size={14} /> Tarde (≥ 12h)
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', fontSize: '0.8125rem',
              backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
              fontFamily: 'inherit', cursor: 'pointer'
            }}
          >
            <option value="all">Todos os Status</option>
            <option value="agendado">Agendados</option>
            <option value="concluido">Concluídos</option>
            <option value="adiado">Adiados</option>
            <option value="nao_feito">Não Feitos</option>
          </select>
          
          <select
            value={calendarScope}
            onChange={(e) => {
              setCalendarScope(e.target.value);
              if (e.target.value === 'empresa' && companies.length > 0 && !calendarCompanyId) {
                setCalendarCompanyId(companies[0].id);
              }
            }}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', fontSize: '0.8125rem',
              backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
              fontFamily: 'inherit', cursor: 'pointer'
            }}
          >
            <option value="geral">Agenda Geral</option>
            <option value="minha_agenda">Minha Agenda</option>
            <option value="empresa">Por Empresa</option>
          </select>

          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            style={{
              padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', fontSize: '0.8125rem',
              backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
              fontFamily: 'inherit', cursor: 'pointer'
            }}
          >
            <option value="all">Todas as Regiões</option>
            <option value="Natal">Natal</option>
            <option value="Mossoró">Mossoró</option>
          </select>

          {calendarScope === 'empresa' && (
            <select
              value={calendarCompanyId}
              onChange={(e) => setCalendarCompanyId(e.target.value)}
              style={{
                padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', fontSize: '0.8125rem',
                backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
                fontFamily: 'inherit', cursor: 'pointer', maxWidth: '200px'
              }}
            >
              <option value="" disabled>Selecione a Empresa</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className={selectedDate ? "grid-responsive-calendar" : ""} style={{ display: 'grid', gridTemplateColumns: selectedDate ? undefined : '1fr', gap: '1.5rem', flex: 1 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Calendar Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-h2" style={{ textTransform: 'capitalize' }}>
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={prevMonth} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="btn btn-secondary">
                Hoje
              </button>
              <button onClick={nextMonth} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Calendar Scroll Area */}
          <div className="calendar-scroll-area">
            <div className="calendar-scroll-inner">
              {/* Weekday Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                {weekDays.map(d => (
                  <div key={d} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {rows}
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {selectedDate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.2s ease' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontWeight: '600', fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {selectedDayEvents.length} treinamento{selectedDayEvents.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowModal(true)}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <Plus size={14} /> Agendar
                </button>
              </div>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <CalendarIcon size={28} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p style={{ fontSize: '0.8125rem' }}>Nenhum treinamento neste dia.</p>
              </div>
            ) : (
              (() => {
                const manha = selectedDayEvents.filter(e => getPeriod(e.time) === 'manha');
                const tarde = selectedDayEvents.filter(e => getPeriod(e.time) === 'tarde');

                const renderCard = (event, periodLabel, periodColor, PeriodIcon) => {
                  const sc = STATUS_CONFIG[event.status] || STATUS_CONFIG.agendado;
                  return (
                    <div key={event.id} className="card" style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {statusIcons[event.status]}
                        <span style={{
                          fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                          backgroundColor: sc.bg, color: sc.color, fontWeight: '600'
                        }}>
                          {sc.label}
                        </span>
                        <span style={{
                          fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                          backgroundColor: periodColor === 'var(--primary)' ? 'var(--primary-light)' : '#fef3c7',
                          color: periodColor, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}>
                          <PeriodIcon size={12} /> {periodLabel}
                        </span>
                        <button 
                          onClick={() => setEditingEvent(event)}
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.25rem' }}
                          title="Editar Agendamento"
                        >
                          <Edit2 size={14} /> Editar
                        </button>
                      </div>
                      <h4 style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                        {event.title}
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Building2 size={12} />
                            <span 
                              title={getCompanyCategory(event.companyId)}
                              style={{
                                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                backgroundColor: getCompanyCategory(event.companyId) === 'Consultoria Fixa' ? '#f97316' : '#22c55e'
                              }} 
                            />
                            {event.companyName}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Clock size={12} /> {event.time}
                          </span>
                          {event.responsibleId && (
                            <span>Responsável: {getProfileName(event.responsibleId)}</span>
                          )}
                        </div>
                        <button
                          className="btn"
                          onClick={() => setGeneratingReportFor(event)}
                          style={{
                            padding: '0.375rem 0.5rem', fontSize: '0.65rem',
                            backgroundColor: 'var(--info-light)', color: 'var(--info)',
                            border: '1px solid var(--info)', borderRadius: 'var(--radius-md)',
                            fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem',
                            flexShrink: 0
                          }}
                          title="Gerar Relatório"
                        >
                          <FileText size={12} /> Gerar Relatório
                        </button>
                      </div>
                      {/* Status Actions */}
                      <div style={{
                        display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', marginTop: '1rem',
                        borderTop: '1px solid var(--border)', flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', alignSelf: 'center', marginRight: '0.25rem' }}>
                          Ações:
                        </span>
                        {event.status !== 'concluido' && (
                          <button
                            className="btn"
                            onClick={() => handleStatusChange(event.id, 'concluido')}
                            style={{
                              padding: '0.375rem 0.75rem', fontSize: '0.75rem',
                              backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-hover)',
                              border: '1px solid var(--secondary)', borderRadius: 'var(--radius-md)',
                              fontWeight: '600', gap: '0.375rem'
                            }}
                          >
                            <CheckCircle size={12} /> Concluir
                          </button>
                        )}
                        {event.status !== 'adiado' && (
                          <button
                            className="btn"
                            onClick={() => handleStatusChange(event.id, 'adiado')}
                            style={{
                              padding: '0.375rem 0.75rem', fontSize: '0.75rem',
                              backgroundColor: '#fef3c7', color: '#b45309',
                              border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)',
                              fontWeight: '600', gap: '0.375rem'
                            }}
                          >
                            <PauseCircle size={12} /> Adiar
                          </button>
                        )}
                        {event.status !== 'nao_feito' && (
                          <button
                            className="btn"
                            onClick={() => handleStatusChange(event.id, 'nao_feito')}
                            style={{
                              padding: '0.375rem 0.75rem', fontSize: '0.75rem',
                              backgroundColor: '#fee2e2', color: 'var(--danger)',
                              border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)',
                              fontWeight: '600', gap: '0.375rem'
                            }}
                          >
                            <XCircle size={12} /> Não Feito
                          </button>
                        )}
                        {event.status !== 'agendado' && (
                          <button
                            className="btn"
                            onClick={() => handleStatusChange(event.id, 'agendado')}
                            style={{
                              padding: '0.375rem 0.75rem', fontSize: '0.75rem',
                              backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                              border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)',
                              fontWeight: '600', gap: '0.375rem'
                            }}
                          >
                            <CalendarIcon size={12} /> Reagendar
                          </button>
                        )}
                        <button
                          className="btn"
                          onClick={() => handleDeleteTraining(event.id)}
                          style={{
                            padding: '0.375rem 0.75rem', fontSize: '0.75rem',
                            backgroundColor: 'transparent', color: 'var(--danger)',
                            border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)',
                            fontWeight: '600', gap: '0.375rem', marginLeft: 'auto'
                          }}
                          title="Remover do calendário e voltar para pendentes"
                        >
                          <Trash2 size={12} /> Cancelar Agendamento
                        </button>
                      </div>
                    </div>
                  );
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {manha.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: '700', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.25rem' }}>
                          <Sunrise size={16} /> Turno da Manhã ({manha.length})
                        </div>
                        {manha.map(e => renderCard(e, 'Manhã', 'var(--primary)', Sunrise))}
                      </div>
                    )}
                    {tarde.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: '700', color: '#d97706', borderBottom: '2px solid #fef3c7', paddingBottom: '0.25rem' }}>
                          <Sun size={16} /> Turno da Tarde ({tarde.length})
                        </div>
                        {tarde.map(e => renderCard(e, 'Tarde', '#d97706', Sun))}
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>

      {showModal && (
        <AddTrainingModal
          defaultDate={selectedDate || format(new Date(), 'yyyy-MM-dd')}
          companyId={null} // Global calendar doesn't have a specific company
          onClose={() => setShowModal(false)}
          onSave={handleAddTraining}
        />
      )}

      {editingEvent && (
        <EditTrainingModal
          training={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={() => { setEditingEvent(null); loadData(false); }}
        />
      )}

      {generatingReportFor && (
        <ReportGeneratorModal
          event={generatingReportFor}
          onClose={() => setGeneratingReportFor(null)}
          userProfile={userProfile}
        />
      )}
    </div>
  );
};

export default CalendarView;
