import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, type View, Views } from 'react-big-calendar';
import dndModule from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays, Plus, Filter, Users, Building2, Clock, Eye
} from 'lucide-react';
import type { Campaign, PartnerAppointment, ToastType } from '../types';
import { EVENT_TYPE_LABELS } from '../types';
import { fmtDate, fmtLongDate, fmtCurrency } from '../utils/format';
import { DayDetailsModal } from '../components/DayDetailsModal';

// Setup localizer
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const withDragAndDrop = (dndModule as any).default || dndModule;
const DnDCalendar = withDragAndDrop(Calendar);

interface CalendarPageProps {
  campaigns: Campaign[];
  partners: PartnerAppointment[];
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  updatePartner: (id: string, updates: Partial<PartnerAppointment>) => void;
  deleteCampaign: (id: string) => void;
  deletePartner: (id: string) => void;
  onNewCampaign: (defaultDate?: string) => void;
  onNewPartner: (defaultDate?: string) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onEditPartner: (partner: PartnerAppointment) => void;
  showToast: (msg: string, type: ToastType) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  campaigns,
  partners,
  updateCampaign,
  updatePartner,
  deleteCampaign,
  deletePartner,
  onNewCampaign,
  onNewPartner,
  onEditCampaign,
  onEditPartner,
  showToast,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-10-23T12:00:00'));
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [activeDateSummary, setActiveDateSummary] = useState<string>('2026-10-23');
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // Filter campaigns & partners
  const filteredCampaigns = useMemo(() => {
    if (selectedType === 'all') return campaigns;
    if (selectedType === 'partner') return [];
    return campaigns.filter(c => c.eventType === selectedType);
  }, [campaigns, selectedType]);

  const filteredPartners = useMemo(() => {
    if (selectedType === 'all' || selectedType === 'partner') return partners;
    return [];
  }, [partners, selectedType]);

  // Convert to calendar event format
  const events = useMemo(() => {
    const cEvents = filteredCampaigns.map(c => {
      const [y, m, d] = c.date.split('-').map(Number);
      return {
        id: `camp_${c.id}`,
        rawId: c.id,
        category: 'campaign' as const,
        eventType: c.eventType,
        title: c.company,
        start: new Date(y, m - 1, d, 8, 0),
        end: new Date(y, m - 1, d, 17, 0),
        dateStr: c.date,
        resource: c,
      };
    });

    const pEvents = filteredPartners.map(p => {
      const [y, m, d] = p.date.split('-').map(Number);
      return {
        id: `part_${p.id}`,
        rawId: p.id,
        category: 'partner' as const,
        eventType: 'partner' as const,
        title: `${p.client} (${p.partnerClinic})`,
        start: new Date(y, m - 1, d, 9, 0),
        end: new Date(y, m - 1, d, 16, 0),
        dateStr: p.date,
        resource: p,
      };
    });

    return [...cEvents, ...pEvents];
  }, [filteredCampaigns, filteredPartners]);

  // Drag and drop event handler
  const onEventDrop = useCallback(({ event, start }: any) => {
    const newDateStr = format(start, 'yyyy-MM-dd');
    if (event.category === 'campaign') {
      updateCampaign(event.rawId, { date: newDateStr });
      showToast(`Campanha de ${event.resource.company} reagendada para ${fmtDate(newDateStr)}`, 'success');
    } else {
      updatePartner(event.rawId, { date: newDateStr });
      showToast(`Agendamento de ${event.resource.client} movido para ${fmtDate(newDateStr)}`, 'success');
    }
    setActiveDateSummary(newDateStr);
  }, [updateCampaign, updatePartner, showToast]);

  // On clicking an event
  const onSelectEvent = useCallback((event: any) => {
    setActiveDateSummary(event.dateStr);
    setIsDayModalOpen(true);
  }, []);

  // On clicking a date slot/day cell
  const onSelectSlot = useCallback((slotInfo: any) => {
    const clickedDateStr = format(slotInfo.start, 'yyyy-MM-dd');
    setActiveDateSummary(clickedDateStr);
    setIsDayModalOpen(true);
  }, []);

  // Custom event renderer
  const CustomEventComponent = ({ event }: any) => {
    const isCamp = event.category === 'campaign';
    const camp = isCamp ? (event.resource as Campaign) : null;
    const part = !isCamp ? (event.resource as PartnerAppointment) : null;

    return (
      <div className="cal-custom-event-content">
        <div className="event-top-row">
          <span className="event-title-text">{event.title}</span>
        </div>
        {isCamp && camp && (
          <div className="event-details-row">
            <span className="event-detail-item">
              <Users size={10} /> {camp.attendedCount || camp.expectedCount} vidas
            </span>
            <span className={`status-mini-indicator ${camp.kitReady ? 'kit-ok' : 'kit-wait'}`}>
              {camp.kitReady ? 'Kit OK' : 'Sem Kit'}
            </span>
          </div>
        )}
        {!isCamp && part && (
          <div className="event-details-row">
            <span className="event-detail-item">
              <Building2 size={10} /> {part.state}
            </span>
            <span className="event-detail-item text-emerald">
              {fmtCurrency(part.value)}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Event style getter
  const eventPropGetter = (event: any) => {
    let bg = '#0066ff';
    let borderColor = '#0052cc';

    if (event.category === 'campaign') {
      if (event.eventType === 'acao') {
        bg = '#7c3aed';
        borderColor = '#6d28d9';
      } else if (event.eventType === 'palestra') {
        bg = '#d97706';
        borderColor = '#b45309';
      }
    } else {
      bg = '#0284c7';
      borderColor = '#0369a1';
    }

    return {
      style: {
        backgroundColor: bg,
        borderColor: borderColor,
        borderRadius: '6px',
        color: '#ffffff',
        padding: '3px 6px',
        border: `1px solid ${borderColor}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }
    };
  };

  // Selected date summary calculations for bottom panel
  const selectedDateCampaigns = campaigns.filter(c => c.date === activeDateSummary);
  const selectedDatePartners = partners.filter(p => p.date === activeDateSummary);
  const totalSelectedEvents = selectedDateCampaigns.length + selectedDatePartners.length;
  const totalSelectedExpected = selectedDateCampaigns.reduce((s, c) => s + c.expectedCount, 0);
  const totalSelectedValue = selectedDatePartners.reduce((s, p) => s + p.value, 0);

  return (
    <div className="page-wrapper calendar-page-layout">
      {/* Calendar Filter & Control Header */}
      <div className="calendar-controls-bar">
        <div className="filter-pill-group">
          <span className="filter-group-label">
            <Filter size={14} /> Filtrar Exibição:
          </span>
          <button
            className={`filter-btn ${selectedType === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedType('all')}
          >
            Todos os Eventos ({campaigns.length + partners.length})
          </button>
          <button
            className={`filter-btn ${selectedType === 'campanha' ? 'active' : ''}`}
            onClick={() => setSelectedType('campanha')}
          >
            Unidade Móvel ({campaigns.filter(c => c.eventType === 'campanha').length})
          </button>
          <button
            className={`filter-btn ${selectedType === 'acao' ? 'active' : ''}`}
            onClick={() => setSelectedType('acao')}
          >
            Ações In-Company ({campaigns.filter(c => c.eventType === 'acao').length})
          </button>
          <button
            className={`filter-btn ${selectedType === 'palestra' ? 'active' : ''}`}
            onClick={() => setSelectedType('palestra')}
          >
            Palestras ({campaigns.filter(c => c.eventType === 'palestra').length})
          </button>
          <button
            className={`filter-btn ${selectedType === 'partner' ? 'active' : ''}`}
            onClick={() => setSelectedType('partner')}
          >
            Clínicas Parceiras ({partners.length})
          </button>
        </div>

        <div className="cal-actions-right">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onNewCampaign(activeDateSummary)}
          >
            <Plus size={15} /> Agendar Evento
          </button>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="card calendar-card">
        <div className="cal-notice-banner">
          <div className="banner-left">
            <CalendarDays size={16} className="text-cyan" />
            <span>
              <strong>Dica de Produtividade:</strong> Clique em qualquer dia para abrir o <strong>Resumo Diário Completo</strong> ou arraste os eventos para reagendar datas.
            </span>
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setIsDayModalOpen(true)}
          >
            <Eye size={14} /> Ver Resumo de {fmtDate(activeDateSummary)}
          </button>
        </div>

        <div className="calendar-container" style={{ height: '640px' }}>
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            date={currentDate}
            onNavigate={(date: Date) => setCurrentDate(date)}
            view={currentView}
            onView={(view: View) => setCurrentView(view)}
            onEventDrop={onEventDrop}
            onSelectEvent={onSelectEvent}
            onSelectSlot={onSelectSlot}
            selectable
            resizable={false}
            components={{ event: CustomEventComponent }}
            eventPropGetter={eventPropGetter}
            culture="pt-BR"
            messages={{
              next: 'Próximo ›',
              previous: '‹ Anterior',
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              agenda: 'Lista / Agenda',
              showMore: (total: number) => `+${total} mais itens`
            }}
          />
        </div>
      </div>

      {/* Dedicated Daily Summary Card (Permanent Overview for Selected Date) */}
      <div className="card daily-summary-dock">
        <div className="dock-header">
          <div className="dock-title-wrap">
            <div className="dock-date-badge">
              <span className="badge-day">{activeDateSummary.split('-')[2]}</span>
              <span className="badge-month">OUT/26</span>
            </div>
            <div>
              <span className="dock-subtitle">PAINEL DE RESUMO DIÁRIO SELECIONADO</span>
              <h3 className="dock-title">{fmtLongDate(activeDateSummary)}</h3>
            </div>
          </div>

          <div className="dock-kpi-pills">
            <div className="dock-kpi">
              <span className="dock-kpi-val">{totalSelectedEvents}</span>
              <span className="dock-kpi-lbl">Atividades</span>
            </div>
            <div className="dock-kpi">
              <span className="dock-kpi-val text-cyan">{totalSelectedExpected}</span>
              <span className="dock-kpi-lbl">Vidas Previstas</span>
            </div>
            <div className="dock-kpi">
              <span className="dock-kpi-val text-emerald">{fmtCurrency(totalSelectedValue)}</span>
              <span className="dock-kpi-lbl">Faturamento</span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsDayModalOpen(true)}
            >
              <Eye size={14} /> Abrir Detalhes Completos
            </button>
          </div>
        </div>

        <div className="dock-events-preview">
          {totalSelectedEvents === 0 ? (
            <div className="dock-empty-msg">
              <Clock size={18} />
              <span>Nenhum atendimento programado para {fmtDate(activeDateSummary)}. Clique em qualquer dia no calendário para inspecionar.</span>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onNewCampaign(activeDateSummary)}
              >
                <Plus size={14} /> Agendar nesta data
              </button>
            </div>
          ) : (
            <div className="dock-items-row">
              {selectedDateCampaigns.map(c => (
                <div key={c.id} className="dock-item-pill" onClick={() => setIsDayModalOpen(true)}>
                  <span className="dock-item-tag móvel">{EVENT_TYPE_LABELS[c.eventType]}</span>
                  <strong>{c.company}</strong>
                  <span className="dock-item-sub">
                    <Users size={12} /> {c.expectedCount} vidas • {c.kitReady ? '✓ Kit Pronto' : '⚠️ Sem Kit'}
                  </span>
                </div>
              ))}
              {selectedDatePartners.map(p => (
                <div key={p.id} className="dock-item-pill partner" onClick={() => setIsDayModalOpen(true)}>
                  <span className="dock-item-tag partner">Parceira • {p.state}</span>
                  <strong>{p.client}</strong>
                  <span className="dock-item-sub">
                    <Building2 size={12} /> {p.partnerClinic} • {fmtCurrency(p.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Day Details Modal */}
      {isDayModalOpen && (
        <DayDetailsModal
          dateStr={activeDateSummary}
          campaigns={campaigns}
          partners={partners}
          onClose={() => setIsDayModalOpen(false)}
          onUpdateCampaign={updateCampaign}
          onUpdatePartner={updatePartner}
          onEditCampaign={onEditCampaign}
          onEditPartner={onEditPartner}
          onDeleteCampaign={c => deleteCampaign(c.id)}
          onDeletePartner={p => deletePartner(p.id)}
          onAddCampaignForDate={date => onNewCampaign(date)}
          onAddPartnerForDate={date => onNewPartner(date)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
