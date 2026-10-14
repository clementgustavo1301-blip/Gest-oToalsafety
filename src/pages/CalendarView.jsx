import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle, PauseCircle, XCircle, Building2, Calendar as CalendarIcon, Filter, Edit2, Trash2, Sunrise, Sun, FileText, X } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { getTrainings, getCompanies, getGroups, addTraining, updateTraining, deleteTraining } from '../services/storageService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '../assets/logoBase64';
import AddTrainingModal from '../components/AddTrainingModal';
import EditTrainingModal from '../components/EditTrainingModal';
import ReportGeneratorModal from '../components/ReportGeneratorModal';
import ScheduleModal from '../components/ScheduleModal';

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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [generatingReportFor, setGeneratingReportFor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  
  const [calendarScope, setCalendarScope] = useState('geral');
  const [calendarCompanyId, setCalendarCompanyId] = useState('');
  const [calendarResponsibleId, setCalendarResponsibleId] = useState('');
  const { userProfile, activeLink } = useAuth();

  const [trainings, setTrainings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [pendingTrainings, setPendingTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const [trn, comp, grps, { getDeliverables, getProfiles }] = await Promise.all([
      getTrainings(),
      getCompanies(),
      getGroups(),
      import('../services/storageService')
    ]);
    const deliverables = await getDeliverables();
    const profs = await getProfiles();

    setTrainings(trn);
    setCompanies(comp);
    setGroups(grps);
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

  const getCompanyName = (companyId, event = null) => {
    if (event?.externalCompanyName) return event.externalCompanyName;
    if (event?.isExternal || event?.demandType === 'externa') return 'Demanda Externa';
    return companies.find(c => c.id === companyId)?.name || 'N/A';
  };
  const getCompanyGroupName = (companyId) => {
    const comp = companies.find(c => c.id === companyId);
    if (!comp || !comp.groupId) return '';
    const group = groups.find(g => g.id === comp.groupId);
    return group ? group.name.replace(/^\d+\s*-\s*/, '').trim() : '';
  };
  const getCompanyCategory = (companyId) => companies.find(c => c.id === companyId)?.category || 'TotalSafety';
  const getProfileName = (profileId) => profiles.find(p => p.id === profileId)?.name || 'Desconhecido';

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDayClick = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (selectedDate === dateStr) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando calendário...</div>;
  }

  const cleanDescription = (desc) => {
    if (!desc) return '';
    return desc
      .replace(/\[NO_TRAVEL\]/g, '')
      .replace(/\[SHARED_TRIP\]/g, '')
      .replace(/\[RESP2_ID:[^\]]+\]/g, '')
      .replace(/\[EXTERNAL_COMPANY:[^\]]+\]/g, '')
      .trim();
  };
  const getSecondaryResponsible = (desc) => {
    if (!desc) return null;
    const match = desc.match(/\[RESP2_ID:([^\]]+)\]/);
    return match ? match[1] : null;
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const getCompanyRegion = (companyId) => companies.find(c => c.id === companyId)?.region || 'Natal';

  const filteredTrainings = trainings.filter(t => {
    const isExt = t.isExternal || t.demandType === 'externa' || (t.description && t.description.includes('[EXTERNAL_COMPANY:'));
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchRegion = filterRegion === 'all' || (isExt ? true : getCompanyRegion(t.companyId) === filterRegion);
    const matchScope = calendarScope === 'geral' 
      ? true 
      : calendarScope === 'minha_agenda'
      ? t.responsibleId === userProfile?.id || getSecondaryResponsible(t.description) === userProfile?.id
      : calendarScope === 'empresa'
      ? t.companyId === calendarCompanyId
      : calendarScope === 'responsavel'
      ? t.responsibleId === calendarResponsibleId || getSecondaryResponsible(t.description) === calendarResponsibleId
      : calendarScope === 'externas'
      ? isExt
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
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;

      days.push(
        <div 
          key={dateStr}
          className="calendar-day-cell"
          onClick={() => handleDayClick(cloneDay)}
          style={{
            backgroundColor: !isCurrentMonth 
              ? 'var(--background)' 
              : isSelected 
              ? 'var(--primary-light)' 
              : isWeekend 
              ? 'rgba(0,0,0,0.015)' 
              : 'var(--surface)',
            color: !isCurrentMonth ? 'var(--text-secondary)' : 'var(--text-primary)',
            opacity: isCurrentMonth ? 1 : 0.45,
            border: isSelected ? '2px solid var(--primary)' : undefined,
          }}
          onMouseEnter={(e) => {
            if (!isSelected && isCurrentMonth) e.currentTarget.style.backgroundColor = 'var(--primary-light)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = !isCurrentMonth ? 'var(--background)' : (isWeekend ? 'rgba(0,0,0,0.015)' : 'var(--surface)');
          }}
        >
          {/* Day Number */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px' }}>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: isMobile ? '20px' : '22px', height: isMobile ? '20px' : '22px', borderRadius: '50%',
              backgroundColor: isToday ? 'var(--primary)' : 'transparent',
              color: isToday ? 'white' : 'inherit',
              fontWeight: isToday || isSelected ? '700' : '600',
              fontSize: isMobile ? '0.7rem' : '0.75rem'
            }}>
              {format(day, 'd')}
            </span>
          </div>
          
          {/* Mobile view (< 768px): micro-badge with group name */}
          {isMobile && dayEvents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', marginTop: 'auto', paddingBottom: '2px' }}>
              {dayEvents.slice(0, 2).map((ev) => {
                const isExt = ev.isExternal || ev.demandType === 'externa' || (ev.description && ev.description.includes('[EXTERNAL_COMPANY:'));
                const sc = STATUS_CONFIG[ev.status] || STATUS_CONFIG.agendado;
                let extName = ev.externalCompanyName;
                if (!extName && ev.description) {
                  const m = ev.description.match(/\[EXTERNAL_COMPANY:([^\]]+)\]/);
                  if (m) extName = m[1].trim();
                }
                const rawGroupName = getCompanyGroupName(ev.companyId);
                const rawCompName = getCompanyName(ev.companyId);
                const displayGroup = isExt ? (extName || 'Ext') : (rawGroupName || rawCompName);
                const catColor = isExt ? '#8b5cf6' : getCompanyCategory(ev.companyId) === 'Consultoria Fixa' ? '#f97316' : '#22c55e';

                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '3px',
                      backgroundColor: sc.bg, color: sc.color,
                      borderLeft: `2px solid ${isExt ? '#8b5cf6' : sc.color}`,
                      padding: '1px 3px', borderRadius: '2px',
                      fontSize: '0.52rem', fontWeight: '700',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      lineHeight: 1.15
                    }}
                  >
                    <span 
                      style={{
                        width: '4px', height: '4px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: catColor
                      }} 
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {displayGroup}
                    </span>
                  </div>
                );
              })}
              {dayEvents.length > 2 && (
                <span style={{ fontSize: '0.52rem', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  +{dayEvents.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Desktop view (>= 768px): Category Dot + Group Name prominent + Activity Title + Time */}
          {!isMobile && dayEvents.length > 0 && (() => {
            const maxVisible = 3;
            const visibleEvents = dayEvents.slice(0, maxVisible);
            const remaining = dayEvents.length - maxVisible;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                {visibleEvents.map((event) => {
                  const sc = STATUS_CONFIG[event.status] || STATUS_CONFIG.agendado;
                  const isExt = event.isExternal || event.demandType === 'externa' || (event.description && event.description.includes('[EXTERNAL_COMPANY:'));
                  let extName = event.externalCompanyName;
                  if (!extName && event.description) {
                    const m = event.description.match(/\[EXTERNAL_COMPANY:([^\]]+)\]/);
                    if (m) extName = m[1].trim();
                  }
                  const rawGroupName = getCompanyGroupName(event.companyId);
                  const rawCompName = getCompanyName(event.companyId);
                  const displayGroup = isExt 
                    ? (extName || 'Demanda Externa') 
                    : (rawGroupName || rawCompName);
                  const categoryColor = isExt 
                    ? '#8b5cf6' 
                    : getCompanyCategory(event.companyId) === 'Consultoria Fixa' 
                    ? '#f97316' 
                    : '#22c55e';
                  const categoryTitle = isExt 
                    ? 'Demanda Externa (Fora do TotalSafety)' 
                    : getCompanyCategory(event.companyId) === 'Consultoria Fixa' 
                    ? 'Consultoria Fixa' 
                    : 'TotalSafety';
                  const timeShort = event.time ? event.time.split(' ')[0] : '';

                  return (
                    <div 
                      key={event.id}
                      className="calendar-event-item"
                      title={`${displayGroup} • ${event.title} (${categoryTitle}) (${event.time || ''})`}
                      style={{
                        backgroundColor: sc.bg, color: sc.color,
                        borderLeft: `3px solid ${isExt ? '#8b5cf6' : sc.color}`,
                        display: 'flex', flexDirection: 'column',
                        gap: '1px', padding: '2px 5px', borderRadius: '3px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Line 1: Category Dot + Group Name (Prominent & Uppercase) + Time */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
                          <span 
                            title={categoryTitle}
                            style={{
                              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                              backgroundColor: categoryColor,
                              boxShadow: `0 0 0 1px ${categoryColor}40`
                            }} 
                          />
                          <span style={{ 
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', 
                            fontWeight: '700', fontSize: '0.67rem', letterSpacing: '0.01em',
                            color: isExt ? '#7c3aed' : sc.color
                          }}>
                            {isExt ? `⚡ ${displayGroup}` : displayGroup}
                          </span>
                        </div>
                        {timeShort && (
                          <span style={{ opacity: 0.85, fontSize: '0.58rem', flexShrink: 0, fontWeight: '600' }}>
                            {timeShort}
                          </span>
                        )}
                      </div>

                      {/* Line 2: Activity Title */}
                      <span style={{ 
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', 
                        fontSize: '0.63rem', opacity: 0.9, fontWeight: '500',
                        paddingLeft: '10px'
                      }}>
                        {event.title}
                      </span>
                    </div>
                  );
                })}
                {remaining > 0 && (
                  <div style={{
                    fontSize: '0.62rem', fontWeight: '700', color: 'var(--primary)',
                    textAlign: 'center', padding: '1px 6px', borderRadius: '10px',
                    backgroundColor: 'var(--primary-light)', alignSelf: 'center',
                    marginTop: '1px'
                  }}>
                    +{remaining} mais
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

  const handleGenerateMonthlySchedule = () => {
    const currentMonthEvents = filteredTrainings.filter(t => {
      const tDate = new Date(t.date + 'T12:00:00');
      return isSameMonth(tDate, currentDate);
    });

    if (currentMonthEvents.length === 0) {
      alert("Não há treinamentos para este mês no filtro atual.");
      return;
    }

    currentMonthEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit
    const margin = 10;
    
    // Header Table
    autoTable(doc, {
      startY: margin,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, halign: 'center', valign: 'middle', cellPadding: 2 },
      body: [
        [
          { content: '', rowSpan: 2, styles: { minCellWidth: 40 } }, // Placeholder for logo
          { content: 'SISTEMA DE GESTÃO DE SEGURANÇA NO TRABALHO - SGST', styles: { fontStyle: 'bold', fontSize: 11, minCellHeight: 15 } }
        ],
        [
          { content: `TÍTULO: CRONOGRAMA DE AGENDAMENTOS - ${format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]
      ],
      didDrawCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 0 && cellData.row.index === 0) {
          if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', cellData.cell.x + 2, cellData.cell.y + 2, 36, 16);
          }
        }
      }
    });

    // Content Table
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      margin: { left: margin, right: margin, bottom: margin + 10 },
      head: [['Data', 'Horário', 'Empresa', 'Treinamento', 'Status', 'Responsável']],
      body: currentMonthEvents.map(t => {
        const resp1 = getProfileName(t.responsibleId);
        const resp2Id = getSecondaryResponsible(t.description);
        const resp2 = resp2Id ? getProfileName(resp2Id) : '';
        const responsible = [resp1, resp2].filter(Boolean).join(' e ');
        const isExt = t.isExternal || t.demandType === 'externa' || (t.description && t.description.includes('[EXTERNAL_COMPANY:'));
        const compDisplay = isExt 
          ? `⚡ ${t.externalCompanyName || 'Demanda Externa'} (Fora TotalSafety)` 
          : getCompanyName(t.companyId);
        return [
          dateFormatted,
          t.time || '',
          compDisplay,
          t.title,
          STATUS_CONFIG[t.status]?.label || t.status,
          responsible
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [43, 87, 154], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const status = currentMonthEvents[data.row.index].status;
          
          if (status === 'agendado') {
            data.cell.styles.fillColor = [239, 246, 255]; 
          } else if (status === 'concluido') {
            data.cell.styles.fillColor = [236, 253, 245]; 
          } else if (status === 'adiado') {
            data.cell.styles.fillColor = [254, 243, 199]; 
          } else if (status === 'nao_feito') {
            data.cell.styles.fillColor = [254, 226, 226]; 
          }

          if (data.column.index === 4) {
             data.cell.styles.fontStyle = 'bold';
             if (status === 'agendado') data.cell.styles.textColor = [59, 130, 246];
             else if (status === 'concluido') data.cell.styles.textColor = [16, 185, 129];
             else if (status === 'adiado') data.cell.styles.textColor = [180, 83, 9];
             else if (status === 'nao_feito') data.cell.styles.textColor = [239, 68, 68];
          }
        }
      },
      didDrawPage: (data) => {
        // Footer with page number
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(8);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageSize.width / 2, pageHeight - 10, { align: 'center' });
      }
    });

    doc.save(`cronograma_${format(currentDate, 'MM_yyyy')}.pdf`);
  };

  const weekDays = isMobile ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const selectedDayEvents = selectedDate
    ? filteredTrainings.filter(t => t.date === selectedDate).map(t => {
        const isExt = t.isExternal || t.demandType === 'externa' || (t.description && t.description.includes('[EXTERNAL_COMPANY:'));
        return {
          ...t,
          isExternal: isExt,
          companyName: isExt ? (t.externalCompanyName || 'Demanda Externa') : getCompanyName(t.companyId)
        };
      })
    : [];

  const statusIcons = {
    agendado: <CalendarIcon size={14} color="var(--primary)" />,
    concluido: <CheckCircle size={14} color="var(--secondary)" />,
    adiado: <PauseCircle size={14} color="#b45309" />,
    nao_feito: <XCircle size={14} color="var(--danger)" />,
  };

  const renderEventCard = (event, periodLabel, periodColor, PeriodIcon) => {
    const sc = STATUS_CONFIG[event.status] || STATUS_CONFIG.agendado;
    const isExt = event.isExternal || event.demandType === 'externa' || (event.description && event.description.includes('[EXTERNAL_COMPANY:'));
    let extName = event.externalCompanyName;
    if (!extName && event.description) {
      const m = event.description.match(/\[EXTERNAL_COMPANY:([^\]]+)\]/);
      if (m) extName = m[1].trim();
    }
    const rawGroupName = getCompanyGroupName(event.companyId);
    const rawCompName = event.companyName || getCompanyName(event.companyId);
    const groupName = isExt ? extName : rawGroupName;
    const compName = isExt ? (extName || 'Demanda Externa') : rawCompName;
    return (
      <div key={event.id} className="card" style={{ padding: '0.75rem', borderLeft: isExt ? '4px solid #8b5cf6' : `3px solid ${sc.color}`, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {statusIcons[event.status]}
          <span style={{
            fontSize: '0.6875rem', padding: '0.1rem 0.45rem', borderRadius: '1rem',
            backgroundColor: sc.bg, color: sc.color, fontWeight: '600'
          }}>
            {sc.label}
          </span>
          <span style={{
            fontSize: '0.6875rem', padding: '0.1rem 0.45rem', borderRadius: '1rem',
            backgroundColor: periodColor === 'var(--primary)' ? 'var(--primary-light)' : '#fef3c7',
            color: periodColor, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.2rem'
          }}>
            <PeriodIcon size={11} /> {periodLabel}
          </span>
          {isExt && (
            <span style={{
              fontSize: '0.6875rem', padding: '0.1rem 0.45rem', borderRadius: '1rem',
              backgroundColor: '#f3e8ff', color: '#7c3aed', border: '1px solid #d8b4fe', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '0.2rem'
            }}>
              ⚡ Fora TS
            </span>
          )}
          <button 
            onClick={() => setEditingEvent(event)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', padding: '0.2rem' }}
            title="Editar Agendamento"
          >
            <Edit2 size={13} /> Editar
          </button>
        </div>

        <div>
          <h4 style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
            {event.title}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building2 size={12} color={isExt ? '#7c3aed' : undefined} />
              <span 
                title={isExt ? 'Demanda Externa (Fora do TotalSafety)' : getCompanyCategory(event.companyId)}
                style={{
                  width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: isExt ? '#8b5cf6' : getCompanyCategory(event.companyId) === 'Consultoria Fixa' ? '#f97316' : '#22c55e'
                }} 
              />
              <span style={{ fontWeight: '700', color: isExt ? '#7c3aed' : 'var(--text-primary)' }}>
                {isExt ? `⚡ ${compName}` : (groupName && groupName !== compName ? `${groupName} • ${compName}` : compName)}
              </span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={12} /> {event.time || 'Sem horário'}
              </span>
              <button
                className="btn"
                onClick={() => setGeneratingReportFor(event)}
                style={{
                  padding: '0.2rem 0.45rem', fontSize: '0.65rem',
                  backgroundColor: 'var(--info-light)', color: 'var(--info)',
                  border: '1px solid var(--info)', borderRadius: 'var(--radius-md)',
                  fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem'
                }}
                title="Gerar Relatório"
              >
                <FileText size={11} /> Relatório
              </button>
            </div>
            {(event.responsibleId || getSecondaryResponsible(event.description)) && (
              <span style={{ fontSize: '0.6875rem' }}>
                Resp: {[getProfileName(event.responsibleId), getSecondaryResponsible(event.description) ? getProfileName(getSecondaryResponsible(event.description)) : null].filter(Boolean).join(' e ')}
              </span>
            )}
          </div>
        </div>

        {/* Status Actions */}
        <div style={{
          display: 'flex', gap: '0.35rem', paddingTop: '0.45rem',
          borderTop: '1px solid var(--border)', flexWrap: 'wrap'
        }}>
          {event.status !== 'concluido' && (
            <button
              className="btn"
              onClick={() => handleStatusChange(event.id, 'concluido')}
              style={{
                padding: '0.25rem 0.5rem', fontSize: '0.6875rem',
                backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-hover)',
                border: '1px solid var(--secondary)', borderRadius: 'var(--radius-sm)',
                fontWeight: '600', gap: '0.25rem'
              }}
            >
              <CheckCircle size={11} /> Concluir
            </button>
          )}
          {event.status !== 'adiado' && (
            <button
              className="btn"
              onClick={() => handleStatusChange(event.id, 'adiado')}
              style={{
                padding: '0.25rem 0.5rem', fontSize: '0.6875rem',
                backgroundColor: '#fef3c7', color: '#b45309',
                border: '1px solid #f59e0b', borderRadius: 'var(--radius-sm)',
                fontWeight: '600', gap: '0.25rem'
              }}
            >
              <PauseCircle size={11} /> Adiar
            </button>
          )}
          {event.status !== 'nao_feito' && (
            <button
              className="btn"
              onClick={() => handleStatusChange(event.id, 'nao_feito')}
              style={{
                padding: '0.25rem 0.5rem', fontSize: '0.6875rem',
                backgroundColor: '#fee2e2', color: 'var(--danger)',
                border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)',
                fontWeight: '600', gap: '0.25rem'
              }}
            >
              <XCircle size={11} /> Não Feito
            </button>
          )}
          {event.status !== 'agendado' && (
            <button
              className="btn"
              onClick={() => handleStatusChange(event.id, 'agendado')}
              style={{
                padding: '0.25rem 0.5rem', fontSize: '0.6875rem',
                backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)',
                fontWeight: '600', gap: '0.25rem'
              }}
            >
              <CalendarIcon size={11} /> Reagendar
            </button>
          )}
          <button
            className="btn"
            onClick={() => handleDeleteTraining(event.id)}
            style={{
              padding: '0.25rem 0.5rem', fontSize: '0.6875rem',
              backgroundColor: 'transparent', color: 'var(--danger)',
              border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)',
              fontWeight: '600', gap: '0.25rem', marginLeft: 'auto'
            }}
            title="Remover do calendário"
          >
            <Trash2 size={11} /> Excluir
          </button>
        </div>
      </div>
    );
  };

  const renderDayDetails = () => {
    if (!selectedDate) return null;

    const manha = selectedDayEvents.filter(e => getPeriod(e.time) === 'manha');
    const tarde = selectedDayEvents.filter(e => getPeriod(e.time) === 'tarde');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Day Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)'
        }}>
          <div>
            <h3 style={{ fontWeight: '700', fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize' }}>
              {format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {selectedDayEvents.length} atividade{selectedDayEvents.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Plus size={13} /> Agendar
            </button>
            <button
              onClick={() => setSelectedDate(null)}
              style={{
                padding: '0.3rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', color: 'var(--text-secondary)',
                backgroundColor: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
              title="Fechar painel do dia"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Day Events List */}
        <div style={{ padding: '0.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {selectedDayEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
              <CalendarIcon size={28} style={{ marginBottom: '0.5rem', opacity: 0.35 }} />
              <p style={{ fontSize: '0.8125rem', marginBottom: '0.75rem' }}>Nenhum treinamento neste dia.</p>
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(true)}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                <Plus size={13} /> Agendar Treinamento
              </button>
            </div>
          ) : (
            <>
              {manha.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>
                    <Sunrise size={13} /> Turno da Manhã ({manha.length})
                  </div>
                  {manha.map(e => renderEventCard(e, 'Manhã', 'var(--primary)', Sunrise))}
                </div>
              )}
              {tarde.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '700', color: '#d97706' }}>
                    <Sun size={13} /> Turno da Tarde ({tarde.length})
                  </div>
                  {tarde.map(e => renderEventCard(e, 'Tarde', '#d97706', Sun))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Day Modal Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.65rem 1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Total: {selectedDayEvents.length} atividade{selectedDayEvents.length !== 1 ? 's' : ''}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setSelectedDate(null)}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
          >
            Fechar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '1520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Top Header: Title, pending pill, action buttons */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.6rem', paddingBottom: '0.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Agenda de Treinamentos
            </h1>
            <span style={{
              fontSize: '0.75rem', fontWeight: '600', padding: '0.15rem 0.5rem',
              borderRadius: '1rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)'
            }}>
              {filteredTrainings.length} atividades
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
            Visão geral de todas as empresas e demandas avulsas
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {pendingTrainings.length > 0 && (
            <div style={{
              padding: '0.35rem 0.65rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.75rem', fontWeight: '600'
            }} title="Treinamentos aguardando agendamento">
              <PauseCircle size={14} />
              <span>{pendingTrainings.length} pendentes</span>
            </div>
          )}
          <button 
            className="btn btn-primary" 
            onClick={() => setShowModal(true)}
            style={{ padding: '0.38rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Agendar Treinamento para Cliente TotalSafety ou Demanda Externa"
          >
            <Plus size={15} /> Novo Agendamento
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowScheduleModal(true)}
            style={{ padding: '0.38rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Gerar Cronograma da Agenda em Formato Calendário A4 ou Tabela"
          >
            <CalendarIcon size={15} /> Cronograma (A4)
          </button>
        </div>
      </div>

      {/* Main Calendar Card - Always 100% Full Width */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', width: '100%' }}>
          
          {/* Calendar Toolbar: Month Nav & Filters */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.6rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)'
          }}>
            {/* Month Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button onClick={prevMonth} className="btn btn-secondary" style={{ padding: '0.3rem 0.45rem' }} title="Mês anterior">
                <ChevronLeft size={16} />
              </button>
              <h2 style={{ fontSize: '1.05rem', fontWeight: '700', textTransform: 'capitalize', minWidth: '135px', textAlign: 'center', margin: 0 }}>
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <button onClick={nextMonth} className="btn btn-secondary" style={{ padding: '0.3rem 0.45rem' }} title="Próximo mês">
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="btn btn-secondary" style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}>
                Hoje
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <Filter size={14} color="var(--text-secondary)" />
              <select
                value={calendarScope}
                onChange={(e) => {
                  setCalendarScope(e.target.value);
                  if (e.target.value === 'empresa' && companies.length > 0 && !calendarCompanyId) {
                    setCalendarCompanyId(companies[0].id);
                  }
                  if (e.target.value === 'responsavel' && profiles.length > 0 && !calendarResponsibleId) {
                    setCalendarResponsibleId(profiles[0].id);
                  }
                }}
                style={{
                  padding: '0.28rem 0.5rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', fontSize: '0.75rem',
                  backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
                  fontFamily: 'inherit', cursor: 'pointer'
                }}
              >
                <option value="geral">Agenda Geral</option>
                <option value="minha_agenda">Minha Agenda</option>
                <option value="externas">⚡ Demandas Fora TS</option>
                <option value="empresa">Por Empresa</option>
                <option value="responsavel">Por Responsável</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.28rem 0.5rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', fontSize: '0.75rem',
                  backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
                  fontFamily: 'inherit', cursor: 'pointer'
                }}
              >
                <option value="all">Todos Status</option>
                <option value="agendado">Agendados</option>
                <option value="concluido">Concluídos</option>
                <option value="adiado">Adiados</option>
                <option value="nao_feito">Não Feitos</option>
              </select>

              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                style={{
                  padding: '0.28rem 0.5rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', fontSize: '0.75rem',
                  backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
                  fontFamily: 'inherit', cursor: 'pointer'
                }}
              >
                <option value="all">Todas Regiões</option>
                <option value="Natal">Natal</option>
                <option value="Mossoró">Mossoró</option>
              </select>

              {calendarScope === 'empresa' && (
                <select
                  value={calendarCompanyId}
                  onChange={(e) => setCalendarCompanyId(e.target.value)}
                  style={{
                    padding: '0.28rem 0.5rem', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', fontSize: '0.75rem',
                    backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
                    fontFamily: 'inherit', cursor: 'pointer', maxWidth: '160px'
                  }}
                >
                  <option value="" disabled>Selecione a Empresa</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              {calendarScope === 'responsavel' && (
                <select
                  value={calendarResponsibleId}
                  onChange={(e) => setCalendarResponsibleId(e.target.value)}
                  style={{
                    padding: '0.28rem 0.5rem', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', fontSize: '0.75rem',
                    backgroundColor: 'var(--surface)', color: 'var(--text-primary)',
                    fontFamily: 'inherit', cursor: 'pointer', maxWidth: '160px'
                  }}
                >
                  <option value="" disabled>Selecione o Responsável</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Compact Legend Sub-bar */}
          <div style={{
            display: 'flex', gap: '0.75rem', padding: '0.35rem 0.85rem', backgroundColor: 'var(--background)',
            borderBottom: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap', alignItems: 'center',
            fontSize: '0.6875rem', color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--primary)' }} />
              <span>Agendado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--secondary)' }} />
              <span>Concluído</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#d97706' }} />
              <span>Adiado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--danger)' }} />
              <span>Não Feito</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#8b5cf6' }} />
              <span>⚡ Fora TS</span>
            </div>
            <span style={{ width: '1px', height: '10px', backgroundColor: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Cliente com plano TotalSafety">
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 0 1px rgba(34,197,94,0.4)' }} />
              <span>TotalSafety</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Cliente com plano Consultoria Fixa">
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f97316', boxShadow: '0 0 0 1px rgba(249,115,22,0.4)' }} />
              <span>Consultoria Fixa</span>
            </div>
            <span style={{ width: '1px', height: '10px', backgroundColor: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--primary)', fontWeight: '600' }}>
              <Sunrise size={12} /> Manhã
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#d97706', fontWeight: '600' }}>
              <Sun size={12} /> Tarde
            </div>
          </div>

          {/* Calendar Grid Container */}
          <div className="calendar-scroll-area">
            <div className="calendar-scroll-inner">
              {/* Weekday Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                {weekDays.map(d => (
                  <div key={d} style={{ padding: '0.45rem 0.25rem', textAlign: 'center', fontWeight: '600', fontSize: isMobile ? '0.72rem' : '0.8125rem', color: 'var(--text-secondary)' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rows}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Day Details Pop-up Modal when clicking any day */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              width: '95%',
              maxHeight: '88vh',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-xl)'
            }}
          >
            {renderDayDetails()}
          </div>
        </div>
      )}

      {showModal && (
        <AddTrainingModal
          defaultDate={selectedDate || format(new Date(), 'yyyy-MM-dd')}
          companyId={null}
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

      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          initialDate={currentDate}
          trainings={trainings}
          companies={companies}
          groups={groups}
          profiles={profiles}
          initialScope={calendarScope}
          initialCompanyId={calendarCompanyId}
          initialResponsibleId={calendarResponsibleId}
          initialRegion={filterRegion}
          initialStatus={filterStatus}
          userProfile={userProfile}
        />
      )}
    </div>
  );
};

export default CalendarView;
