import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Clock, User, Users,
  CheckCircle, PauseCircle, XCircle, Calendar as CalendarIcon,
  Trash2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTrainingsByCompany, addTraining, updateTraining, deleteTraining } from '../services/storageService';
import AddTrainingModal from './AddTrainingModal';

const STATUS_CONFIG = {
  agendado: { label: 'Agendado', color: 'var(--primary)', bg: 'var(--primary-light)', icon: <CalendarIcon size={14} /> },
  concluido: { label: 'Concluído', color: 'var(--secondary-hover)', bg: 'var(--secondary-light)', icon: <CheckCircle size={14} /> },
  adiado: { label: 'Adiado', color: '#b45309', bg: '#fef3c7', icon: <PauseCircle size={14} /> },
  nao_feito: { label: 'Não Feito', color: 'var(--danger)', bg: '#fee2e2', icon: <XCircle size={14} /> },
};

const TrainingCalendar = ({ companyId, onUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);
  
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const trn = await getTrainingsByCompany(companyId);
    setTrainings(trn);
    setLoading(false);
    if (selectedDate) {
      setSelectedEvents(trn.filter(t => t.date === selectedDate));
    }
  };

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleAddTraining = async (dataOrArray) => {
    const items = Array.isArray(dataOrArray) ? dataOrArray : [dataOrArray];
    for (const data of items) {
      await addTraining({ ...data, companyId });
    }
    setShowModal(false);
    await loadData();
    if (onUpdate) onUpdate();
  };

  const handleStatusChange = async (trainingId, newStatus) => {
    await updateTraining(trainingId, { status: newStatus });
    await loadData();
    if (onUpdate) onUpdate();
  };

  const handleDeleteTraining = async (trainingId) => {
    if (window.confirm('Deseja realmente cancelar este agendamento? Ele voltará para a lista de pendentes.')) {
      await deleteTraining(trainingId);
      await loadData();
      if (onUpdate) onUpdate();
    }
  };

  const handleDayClick = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    const dayTrainings = trainings.filter(t => t.date === dateStr);
    setSelectedEvents(dayTrainings);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando calendário...</div>;
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const rows = [];
  let days = [];
  let day = calStart;

  while (day <= calEnd) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTrainings = trainings.filter(t => t.date === dateStr);
      const isToday = isSameDay(day, new Date());
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = selectedDate === dateStr;

      days.push(
        <div
          key={dateStr}
          onClick={() => handleDayClick(cloneDay)}
          style={{
            minHeight: '100px', padding: '0.5rem', minWidth: 0,
            borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
            backgroundColor: !isCurrentMonth ? 'var(--background)' : isSelected ? 'var(--primary-light)' : 'var(--surface)',
            opacity: isCurrentMonth ? 1 : 0.5,
            transition: 'var(--transition)', cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--primary-light)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = isCurrentMonth ? 'var(--surface)' : 'var(--background)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: isToday ? 'var(--primary)' : 'transparent',
              color: isToday ? 'white' : 'inherit',
              fontWeight: isToday ? 'bold' : 'normal', fontSize: '0.875rem'
            }}>
              {format(day, 'd')}
            </span>
          </div>
          <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {dayTrainings.map(t => {
              const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.agendado;
              return (
                <div key={t.id} style={{
                  fontSize: '0.6875rem', padding: '0.125rem 0.375rem',
                  backgroundColor: sc.bg, color: sc.color,
                  borderRadius: '3px', borderLeft: `3px solid ${sc.color}`,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontWeight: '500'
                }}>
                  {t.title}
                </div>
              );
            })}
          </div>
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

  // Stats
  const agendados = trainings.filter(t => t.status === 'agendado').length;
  const concluidos = trainings.filter(t => t.status === 'concluido').length;
  const adiados = trainings.filter(t => t.status === 'adiado').length;
  const naoFeitos = trainings.filter(t => t.status === 'nao_feito').length;

  return (
    <div>
      {/* Stats */}
      <div className="grid-responsive-stats" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Agendados', value: agendados, ...STATUS_CONFIG.agendado },
          { label: 'Concluídos', value: concluidos, ...STATUS_CONFIG.concluido },
          { label: 'Adiados', value: adiados, ...STATUS_CONFIG.adiado },
          { label: 'Não Feitos', value: naoFeitos, ...STATUS_CONFIG.nao_feito },
        ].map((s, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: s.color
            }}>
              {s.icon}
            </div>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: s.color }}>{s.value}</span>
              <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
        {/* Calendar Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)'
        }}>
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
            <button
              className="btn btn-primary"
              onClick={() => { setSelectedDate(format(new Date(), 'yyyy-MM-dd')); setShowModal(true); }}
            >
              <Plus size={16} /> Agendar
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)'
        }}>
          {weekDays.map(d => (
            <div key={d} style={{
              padding: '0.625rem', textAlign: 'center', fontWeight: '600',
              fontSize: '0.8125rem', color: 'var(--text-secondary)'
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div>{rows}</div>
      </div>

      {/* Event Detail Panel with Status Controls */}
      {selectedEvents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {selectedEvents.map(event => {
            const sc = STATUS_CONFIG[event.status] || STATUS_CONFIG.agendado;
            return (
              <div key={event.id} className="card" style={{ animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {event.title}
                    </h3>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                      backgroundColor: sc.bg, color: sc.color, fontWeight: '600'
                    }}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>
                </div>

                <div className="grid-responsive-2" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <Clock size={14} /> {event.date ? new Date(event.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''} • {event.time}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <User size={14} /> {event.instructor || 'Sem instrutor'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <Users size={14} /> {event.participants || 0} participantes
                  </div>
                </div>

                {event.description && (
                  <div style={{
                    fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem',
                    padding: '0.5rem', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                    borderLeft: '2px solid var(--border)'
                  }}>
                    {event.description}
                  </div>
                )}

                {/* Status Actions */}
                <div style={{
                  display: 'flex', gap: '0.5rem', paddingTop: '0.75rem',
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
          })}
        </div>
      )}

      {/* No events for selected day */}
      {selectedDate && selectedEvents.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', animation: 'fadeIn 0.2s ease' }}>
          <CalendarIcon size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
          <p style={{ fontSize: '0.875rem' }}>Nenhum treinamento neste dia.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={14} /> Agendar para esta data
          </button>
        </div>
      )}

      {showModal && (
        <AddTrainingModal
          defaultDate={selectedDate}
          companyId={companyId}
          onClose={() => { setShowModal(false); }}
          onSave={handleAddTraining}
        />
      )}
    </div>
  );
};

export default TrainingCalendar;
