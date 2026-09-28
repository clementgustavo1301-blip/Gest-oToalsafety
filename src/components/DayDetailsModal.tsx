import React from 'react';
import {
  CalendarDays, Truck, Building2, MapPin, Users,
  CheckCircle2, Clock, Plus, Pencil, Trash2, X
} from 'lucide-react';
import type { Campaign, PartnerAppointment, ToastType } from '../types';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../types';
import { fmtCurrency } from '../utils/format';

interface DayDetailsModalProps {
  dateStr: string; // YYYY-MM-DD
  campaigns: Campaign[];
  partners: PartnerAppointment[];
  onClose: () => void;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => void;
  onUpdatePartner: (id: string, updates: Partial<PartnerAppointment>) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onEditPartner: (partner: PartnerAppointment) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
  onDeletePartner: (partner: PartnerAppointment) => void;
  onAddCampaignForDate: (dateStr: string) => void;
  onAddPartnerForDate: (dateStr: string) => void;
  showToast: (msg: string, type: ToastType) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  dateStr,
  campaigns,
  partners,
  onClose,
  onUpdateCampaign,
  onUpdatePartner,
  onEditCampaign,
  onEditPartner,
  onDeleteCampaign,
  onDeletePartner,
  onAddCampaignForDate,
  onAddPartnerForDate,
  showToast,
}) => {
  // Format readable title
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const dayCampaigns = campaigns.filter(c => c.date === dateStr);
  const dayPartners = partners.filter(p => p.date === dateStr);

  const totalEvents = dayCampaigns.length + dayPartners.length;
  const totalExpected = dayCampaigns.reduce((acc, c) => acc + (c.expectedCount || 0), 0);
  const totalAttended = dayCampaigns.reduce((acc, c) => acc + (c.attendedCount || 0), 0);
  const totalValue = dayPartners.reduce((acc, p) => acc + (p.value || 0), 0);
  const kitsPending = dayCampaigns.filter(c => !c.kitReady).length;
  const pendingSOC = dayCampaigns.filter(c => c.attendedCount > 0 && !c.insertedSOC).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content day-summary-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="day-modal-title-wrap">
            <div className="day-modal-icon">
              <CalendarDays size={22} />
            </div>
            <div>
              <span className="day-modal-tag">RESUMO OPERACIONAL DO DIA</span>
              <h2 className="day-modal-title">{formattedDate}</h2>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Day KPI Stats Cards */}
        <div className="day-stats-grid">
          <div className="day-stat-card">
            <span className="stat-label">Total Atividades</span>
            <span className="stat-value">{totalEvents}</span>
            <span className="stat-sub">
              {dayCampaigns.length} móvel • {dayPartners.length} parceiras
            </span>
          </div>

          <div className="day-stat-card">
            <span className="stat-label">Vidas / Exames</span>
            <span className="stat-value text-cyan">{totalExpected}</span>
            <span className="stat-sub">
              {totalAttended > 0 ? `${totalAttended} atendidos (${Math.round((totalAttended / totalExpected) * 100)}%)` : 'Previstos no dia'}
            </span>
          </div>

          <div className="day-stat-card">
            <span className="stat-label">Valor Parceiras</span>
            <span className="stat-value text-emerald">{fmtCurrency(totalValue)}</span>
            <span className="stat-sub">{dayPartners.filter(p => p.paid).length} de {dayPartners.length} pagas</span>
          </div>

          <div className="day-stat-card">
            <span className="stat-label">Kits & Pendências</span>
            <span className={`stat-value ${kitsPending > 0 ? 'text-amber' : 'text-emerald'}`}>
              {kitsPending > 0 ? `${kitsPending} Pendente` : '100% Prontos'}
            </span>
            <span className="stat-sub">
              {pendingSOC > 0 ? `${pendingSOC} fora do SOC` : 'SOC em dia'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="day-modal-body">
          {totalEvents === 0 ? (
            <div className="empty-day-state">
              <Clock size={40} className="empty-icon" />
              <h3>Nenhum atendimento programado para esta data</h3>
              <p>Agende uma nova campanha da unidade móvel ou um atendimento em clínica parceira para este dia.</p>
              <div className="empty-day-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => { onAddCampaignForDate(dateStr); onClose(); }}
                >
                  <Plus size={16} /> Agendar Unidade Móvel
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { onAddPartnerForDate(dateStr); onClose(); }}
                >
                  <Plus size={16} /> Agendar Clínica Parceira
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Campaigns Section */}
              {dayCampaigns.length > 0 && (
                <div className="day-section">
                  <div className="day-section-header">
                    <div className="section-title-wrap">
                      <Truck size={18} className="text-blue" />
                      <h4>Unidade Móvel & Eventos In-Company ({dayCampaigns.length})</h4>
                    </div>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => { onAddCampaignForDate(dateStr); onClose(); }}
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>

                  <div className="day-items-list">
                    {dayCampaigns.map(camp => (
                      <div key={camp.id} className="day-item-card">
                        <div className="day-item-top">
                          <div className="item-main-info">
                            <span
                              className="event-type-pill"
                              style={{
                                borderColor: EVENT_TYPE_COLORS[camp.eventType],
                                color: EVENT_TYPE_COLORS[camp.eventType],
                                background: `${EVENT_TYPE_COLORS[camp.eventType]}15`
                              }}
                            >
                              {EVENT_TYPE_LABELS[camp.eventType]}
                            </span>
                            <h5 className="item-company-name">{camp.company}</h5>
                            <div className="item-meta-row">
                              <span className="item-location">
                                <MapPin size={13} /> {camp.location}
                              </span>
                              {camp.eventType === 'campanha' && (
                                <span className="item-attendance">
                                  <Users size={13} /> {camp.attendedCount} / {camp.expectedCount} vidas
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="day-item-actions">
                            <button
                              className="btn-icon"
                              title="Editar evento"
                              onClick={() => { onEditCampaign(camp); onClose(); }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              title="Excluir evento"
                              onClick={() => { onDeleteCampaign(camp); onClose(); }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Interactive checklist for this campaign */}
                        <div className="day-item-checklist">
                          <label className="checkbox-toggle-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={camp.kitReady}
                              onChange={() => {
                                onUpdateCampaign(camp.id, { kitReady: !camp.kitReady });
                                showToast(
                                  camp.kitReady ? 'Kit desmarcado' : `Kit de ${camp.company} marcado como pronto!`,
                                  'success'
                                );
                              }}
                            />
                            <span>Kit Separado & Pronto</span>
                          </label>

                          <label className="checkbox-toggle-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={camp.scanned}
                              onChange={() => {
                                onUpdateCampaign(camp.id, { scanned: !camp.scanned });
                                showToast(
                                  camp.scanned ? 'Status de escaneamento removido' : `ASOs de ${camp.company} escaneados!`,
                                  'success'
                                );
                              }}
                            />
                            <span>ASOs Escaneados</span>
                          </label>

                          <label className="checkbox-toggle-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={camp.insertedSOC}
                              onChange={() => {
                                onUpdateCampaign(camp.id, { insertedSOC: !camp.insertedSOC });
                                showToast(
                                  camp.insertedSOC ? 'Removido do SOC' : `Atendimentos de ${camp.company} inseridos no SOC!`,
                                  'success'
                                );
                              }}
                            />
                            <span>Inserido no SOC / SGS</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Partners Section */}
              {dayPartners.length > 0 && (
                <div className="day-section" style={{ marginTop: '20px' }}>
                  <div className="day-section-header">
                    <div className="section-title-wrap">
                      <Building2 size={18} className="text-cyan" />
                      <h4>Clínicas Parceiras Agendadas ({dayPartners.length})</h4>
                    </div>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => { onAddPartnerForDate(dateStr); onClose(); }}
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>

                  <div className="day-items-list">
                    {dayPartners.map(part => (
                      <div key={part.id} className="day-item-card">
                        <div className="day-item-top">
                          <div className="item-main-info">
                            <span className="event-type-pill partner-pill">
                              {part.state} • {part.invoiceStatus.toUpperCase()}
                            </span>
                            <h5 className="item-company-name">{part.client}</h5>
                            <div className="item-meta-row">
                              <span className="item-location">
                                <Building2 size={13} /> {part.partnerClinic}
                              </span>
                              <span className="item-attendance text-emerald">
                                {fmtCurrency(part.value)}
                              </span>
                              {part.invoiceRef && (
                                <span className="item-invoice-badge">Ref: {part.invoiceRef}</span>
                              )}
                            </div>
                          </div>

                          <div className="day-item-actions">
                            <button
                              className="btn-icon"
                              title="Editar agendamento"
                              onClick={() => { onEditPartner(part); onClose(); }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              title="Excluir agendamento"
                              onClick={() => { onDeletePartner(part); onClose(); }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Interactive checklist for partner */}
                        <div className="day-item-checklist">
                          <label className="checkbox-toggle-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={part.paid}
                              onChange={() => {
                                onUpdatePartner(part.id, { paid: !part.paid });
                                showToast(
                                  part.paid ? 'Pagamento desmarcado' : `Atendimento ${part.client} marcado como pago!`,
                                  'success'
                                );
                              }}
                            />
                            <span>Pagamento Confirmado</span>
                          </label>

                          <label className="checkbox-toggle-label">
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={part.examsReceived}
                              onChange={() => {
                                onUpdatePartner(part.id, { examsReceived: !part.examsReceived });
                                showToast(
                                  part.examsReceived ? 'ASOs desmarcados' : `ASOs da ${part.partnerClinic} recebidos!`,
                                  'success'
                                );
                              }}
                            />
                            <span>Exames & ASOs Físicos Recebidos</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-day">
          <div className="footer-left-status">
            <CheckCircle2 size={15} className="text-emerald" />
            <span>Alterações salvas automaticamente no banco local</span>
          </div>
          <div className="footer-right-buttons">
            <button className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
