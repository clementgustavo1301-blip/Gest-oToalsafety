import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = [
    { id: 1, title: 'Palestra Preventiva (Online)', company: 'LD Agropecuaria LTDA', date: new Date(2026, 5, 20), time: '08:00 - 10:00' },
    { id: 2, title: 'Treinamento CIPA', company: 'LD Agropecuaria LTDA', date: new Date(2026, 5, 14), time: '14:00 - 17:00' },
    { id: 3, title: 'Exames ASO (Unidade Móvel)', company: 'LD Agropecuaria LTDA', date: new Date(2026, 5, 25), time: '09:00 - 16:00' },
  ];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      const dayEvents = events.filter(e => isSameDay(e.date, cloneDay));

      days.push(
        <div 
          key={day} 
          style={{
            minHeight: '120px',
            padding: '0.5rem',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            backgroundColor: !isSameMonth(day, monthStart) ? 'var(--background)' : 'var(--surface)',
            color: !isSameMonth(day, monthStart) ? 'var(--text-secondary)' : 'var(--text-primary)',
            transition: 'var(--transition)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
             e.currentTarget.style.backgroundColor = 'var(--primary-light)';
          }}
          onMouseLeave={(e) => {
             e.currentTarget.style.backgroundColor = !isSameMonth(cloneDay, monthStart) ? 'var(--background)' : 'var(--surface)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: isSameDay(day, new Date()) ? 'var(--primary)' : 'transparent',
              color: isSameDay(day, new Date()) ? 'white' : 'inherit',
              fontWeight: isSameDay(day, new Date()) ? 'bold' : 'normal',
              fontSize: '0.875rem'
            }}>
              {formattedDate}
            </span>
          </div>
          
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {dayEvents.map(event => (
              <div key={event.id} style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary-hover)',
                borderRadius: '4px',
                borderLeft: '3px solid var(--primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                <strong>{event.title}</strong>
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }} key={day}>
        {days}
      </div>
    );
    days = [];
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Agenda de Treinamentos</h1>
          <p className="text-subtitle">Programe e acompanhe as atividades nas empresas clientes.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} /> Novo Agendamento
        </button>
      </header>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
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

        {/* Days of week */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
          {weekDays.map(day => (
            <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {rows}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
