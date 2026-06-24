import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle, PauseCircle, XCircle, Building2, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTrainings, getCompanies, addTraining } from '../services/storageService';
import AddTrainingModal from '../components/AddTrainingModal';

const STATUS_CONFIG = {
  agendado: { label: 'Agendado', color: 'var(--primary)', bg: 'var(--primary-light)' },
  concluido: { label: 'Concluído', color: 'var(--secondary-hover)', bg: 'var(--secondary-light)' },
  adiado: { label: 'Adiado', color: '#b45309', bg: '#fef3c7' },
  nao_feito: { label: 'Não Feito', color: 'var(--danger)', bg: '#fee2e2' },
};

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const [trainings, setTrainings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pendingTrainings, setPendingTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const [trn, comp, { getDeliverables }] = await Promise.all([
      getTrainings(),
      getCompanies(),
      import('../services/storageService')
    ]);
    const deliverables = await getDeliverables();
    
    setTrainings(trn);
    setCompanies(comp);
    setPendingTrainings(deliverables.filter(d => d.type === 'treinamento' && d.status === 'pendente'));
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleAddTraining = async (trainingData) => {
    await addTraining(trainingData);
    setShowModal(false);
    await loadData(false);
  };

  const getCompanyName = (companyId) => companies.find(c => c.id === companyId)?.name || 'N/A';

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

  const filteredTrainings = trainings.filter(t => filterStatus === 'all' || t.status === filterStatus);

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
          
          <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {dayEvents.map(event => {
              const sc = STATUS_CONFIG[event.status] || STATUS_CONFIG.agendado;
              return (
                <div key={event.id} style={{
                  fontSize: '0.6875rem', padding: '0.125rem 0.375rem',
                  backgroundColor: sc.bg, color: sc.color,
                  borderRadius: '3px', borderLeft: `3px solid ${sc.color}`,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontWeight: '500'
                }}>
                  {event.title}
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
      </header>

      {/* Legend and Filter */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: val.color }} />
              {val.label}
            </div>
          ))}
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
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 320px' : '1fr', gap: '1.5rem', flex: 1 }}>
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

        {/* Side Panel */}
        {selectedDate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.2s ease' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <h3 style={{ fontWeight: '600', fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {selectedDayEvents.length} treinamento{selectedDayEvents.length !== 1 ? 's' : ''}
              </p>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <CalendarIcon size={28} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p style={{ fontSize: '0.8125rem' }}>Nenhum treinamento neste dia.</p>
              </div>
            ) : (
              selectedDayEvents.map(event => {
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
                    </div>
                    <h4 style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                      {event.title}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Building2 size={12} /> {event.companyName}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Clock size={12} /> {event.time}
                      </span>
                      {event.instructor && (
                        <span>Instrutor: {event.instructor}</span>
                      )}
                    </div>
                  </div>
                );
              })
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
    </div>
  );
};

export default CalendarView;
