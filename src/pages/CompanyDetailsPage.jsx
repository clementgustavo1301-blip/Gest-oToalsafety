import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Calendar, FileText,
  Phone, User, Hash, Edit3, UserCheck,
  ShieldCheck, Clock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import {
  getCompanyById, getGroups, getTrainingsByCompany,
  getDeliverablesByCompany, uploadDocument, getDocumentUrl, addDeliverable,
  updateCompany, updateDeliverable
} from '../services/storageService';
import TrainingCalendar from '../components/TrainingCalendar';
import DeliverablesViewer from '../components/DeliverablesViewer';
import AddDeliverableModal from '../components/AddDeliverableModal';
import EditDeliverableModal from '../components/EditDeliverableModal';
import EditCompanyModal from '../components/EditCompanyModal';
import {
  isDelivered,
  isItemExpired,
  isItemExpiring30,
  isItemExpiring60,
  getDeliverableTimingInfo,
  getEffectiveValidityDate
} from '../utils/deliverableTiming';

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: <Building2 size={16} /> },
  { id: 'calendar', label: 'Calendário', icon: <Calendar size={16} /> },
  { id: 'deliverables', label: 'Entregáveis', icon: <FileText size={16} /> },
];

const CompanyDetailsPage = () => {
  const { companyId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [company, setCompany] = useState(null);
  const [group, setGroup] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const [comp, allGroups, trn, deliv] = await Promise.all([
      getCompanyById(companyId),
      getGroups(),
      getTrainingsByCompany(companyId),
      getDeliverablesByCompany(companyId)
    ]);
    
    setCompany(comp);
    setGroup(allGroups.find(g => g.id === comp?.groupId));
    setTrainings(trn);
    setDeliverables(deliv);
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    loadData(true);
  }, [companyId]);

  const handleAddDeliverable = async (deliverableData) => {
    let fileName = null;
    if (deliverableData.file) {
      fileName = await uploadDocument(deliverableData.file, `deliverables/${companyId}`);
    }
    await addDeliverable({ ...deliverableData, fileName, companyId });
    await loadData(false);
    setShowDeliverableModal(false);
  };

  const handleUpdateDeliverable = async (id, updates) => {
    await updateDeliverable(id, updates);
    await loadData(false);
    setEditingDeliverable(null);
  };

  const handleEditCompany = async (id, updates) => {
    await updateCompany(id, updates);
    await loadData(false);
    setShowEditModal(false);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando detalhes da empresa...</div>;
  }

  if (!company) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
        <Building2 size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
        <h2 className="text-h2">Empresa não encontrada</h2>
        <Link to="/companies" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Voltar
        </Link>
      </div>
    );
  }

  const programs = deliverables.filter(d => d.type === 'programa');

  const effSupervisor = group?.supervisor || company.supervisor || company.supportResponsible || 'Não definido';
  const effTecnico = group?.tecnicoResponsavel || company.tecnicoResponsavel || company.responsible || 'Não definido';
  const effVisitas = (group?.visitasTecnicas && group.visitasTecnicas !== 'N/A') ? group.visitasTecnicas : (company.visitasTecnicas || group?.visitasTecnicas || 'N/A');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  const activeDeliverables = deliverables.filter(d => d.status !== 'cancelado' && d.status !== 'nao_se_aplica');

  // Vencidos (validade expirada ou prazo de envio passado)
  const expiredDeliverablesList = activeDeliverables.filter(d => isItemExpired(d, today));

  // A Vencer em até 30 dias (excluindo os já vencidos)
  const expiring30 = activeDeliverables.filter(d => isItemExpiring30(d, today, in30Days));

  // A Vencer em 60 dias (entre 31 e 60 dias)
  const expiring60 = activeDeliverables.filter(d => isItemExpiring60(d, today, in30Days, in60Days));

  // Entregues e vigentes (válidos, sem prazo expirado ou crítico)
  const deliveredDeliverablesList = activeDeliverables.filter(d => 
    isDelivered(d) && 
    !isItemExpired(d, today) && 
    !isItemExpiring30(d, today, in30Days) && 
    !isItemExpiring60(d, today, in30Days, in60Days)
  );

  // Pendentes regulares (mais de 60 dias ou sem prazo crítico)
  const regularDeliverables = activeDeliverables.filter(d => 
    !isDelivered(d) && 
    !isItemExpired(d, today) && 
    !isItemExpiring30(d, today, in30Days) && 
    !isItemExpiring60(d, today, in30Days, in60Days)
  );

  const pendingDeliverablesList = activeDeliverables.filter(d => !isDelivered(d));

  const totalDeliverablesCount = activeDeliverables.length;
  const totalForBar = totalDeliverablesCount || 1;
  const pctExpired = Math.round((expiredDeliverablesList.length / totalForBar) * 100);
  const pct30 = Math.round((expiring30.length / totalForBar) * 100);
  const pct60 = Math.round((expiring60.length / totalForBar) * 100);
  const pctDelivered = Math.round((deliveredDeliverablesList.length / totalForBar) * 100);
  const pctRegular = Math.max(0, 100 - pctExpired - pct30 - pct60 - pctDelivered);

  const handleUpdateGestao = async (field, value) => {
    const updates = { [field]: value };
    if (field === 'gestaoCipa') {
      updates.gestao_cipa = value;
      updates.gestaoPgr = value;
      updates.gestao_pgr = value;
    }
    if (field === 'gestaoEpi') {
      updates.gestao_epi = value;
      updates.gestaoSipat = value;
      updates.gestao_sipat = value;
    }
    await updateCompany(companyId, updates);
    setCompany(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'gestaoCipa' ? { gestaoPgr: value, gestaoCipa: value } : {}),
      ...(field === 'gestaoEpi' ? { gestaoSipat: value, gestaoEpi: value } : {})
    }));
  };


  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        <Link to="/companies" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}>
          <ArrowLeft size={14} /> Empresas
        </Link>
        <span>/</span>
        <span>{group?.name || 'Sem Grupo'}</span>
        <span>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{company.name}</span>
      </div>

      {/* Company Header */}
      <div className="card flex-col-mobile" style={{ marginBottom: '1.5rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, alignItems: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', flexShrink: 0
          }}>
            <Building2 size={28} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {company.name}
              <button 
                onClick={() => setShowEditModal(true)} 
                title="Editar Empresa"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <Edit3 size={18} />
              </button>
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: "'JetBrains Mono', monospace" }}>
                <Hash size={14} /> {company.cnpj}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)' }} title="Supervisor (Grupo/Empresa)">
                <ShieldCheck size={14} color="var(--primary)" /> <span style={{ fontWeight: '400' }}>Supervisor:</span> <strong style={{ color: 'var(--text-primary)' }}>{effSupervisor}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--primary)', fontWeight: '600' }} title="Técnico Responsável">
                <UserCheck size={14} /> <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>Técnico Responsável:</span> {effTecnico}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--secondary-hover)', fontWeight: '600' }} title="Periodicidade de Visitas Técnicas">
                <Clock size={14} /> <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>Visitas:</span> {effVisitas === 'N/A' ? 'N/A' : `${effVisitas} dias`}
              </span>
              {company.contact && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }} title="Contato na Empresa Cliente">
                  <User size={14} /> <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>Contato:</span> {company.contact}
                </span>
              )}
              {company.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Phone size={14} /> {company.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 auto', textAlign: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>{trainings.length}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Programações</p>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--secondary)' }}>{programs.length}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Programas</p>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--warning)' }}>{deliverables.filter(d => d.status === 'pendente').length}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pendentes</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Painel Visão Geral: Prazos, Barra Amarelo e Vermelho, Gestão CIPA e EPI */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 className="text-h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} color="var(--primary)" /> Visão Geral de Conformidade e Gestão SST
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Acompanhamento de programas e entregáveis vencidos ou a vencer (30 e 60 dias) e gestão SST
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Total: <strong style={{ color: 'var(--text-primary)' }}>{totalDeliverablesCount}</strong>
                </span>
                <span style={{ color: 'var(--border)' }}>•</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#10b981' }}>
                  Entregues/Vigentes: <strong>{deliveredDeliverablesList.length}</strong>
                </span>
                {expiredDeliverablesList.length > 0 && (
                  <>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span style={{
                      fontSize: '0.8125rem', fontWeight: '700', color: '#dc2626',
                      backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '1rem',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <AlertTriangle size={13} /> Vencidos: <strong>{expiredDeliverablesList.length}</strong>
                    </span>
                  </>
                )}
                {expiring30.length > 0 && (
                  <>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#ea580c' }}>
                      A Vencer (≤30d): <strong>{expiring30.length}</strong>
                    </span>
                  </>
                )}
                {expiring60.length > 0 && (
                  <>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#b45309' }}>
                      A Vencer (≤60d): <strong>{expiring60.length}</strong>
                    </span>
                  </>
                )}
                <span style={{ color: 'var(--border)' }}>•</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Pendentes: <strong>{pendingDeliverablesList.length}</strong>
                </span>
              </div>
            </div>

            {/* Barra Visual: Vencidos + A Vencer 30/60 dias + Vigentes */}
            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <AlertTriangle size={15} color={expiredDeliverablesList.length > 0 ? '#dc2626' : '#f59e0b'} /> Status e Prazos dos Entregáveis
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {expiredDeliverablesList.length > 0 
                    ? `⚠️ ${expiredDeliverablesList.length} programa(s)/entregável(is) vencido(s)!` 
                    : `${pctDelivered}% concluído e vigente`}
                </span>
              </div>

              {/* Barra segmentada */}
              <div style={{ height: '14px', width: '100%', borderRadius: '7px', display: 'flex', overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: '0.75rem' }}>
                {expiredDeliverablesList.length > 0 && (
                  <div 
                    style={{ width: `${(expiredDeliverablesList.length / totalForBar) * 100}%`, backgroundColor: '#dc2626', transition: 'width 0.3s' }} 
                    title={`Vencidos (Crítico): ${expiredDeliverablesList.length}`}
                  />
                )}
                {expiring30.length > 0 && (
                  <div 
                    style={{ width: `${(expiring30.length / totalForBar) * 100}%`, backgroundColor: '#ea580c', transition: 'width 0.3s' }} 
                    title={`A Vencer em até 30 dias: ${expiring30.length}`}
                  />
                )}
                {expiring60.length > 0 && (
                  <div 
                    style={{ width: `${(expiring60.length / totalForBar) * 100}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s' }} 
                    title={`A Vencer em 60 dias (Alerta): ${expiring60.length}`}
                  />
                )}
                {deliveredDeliverablesList.length > 0 && (
                  <div 
                    style={{ width: `${(deliveredDeliverablesList.length / totalForBar) * 100}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }} 
                    title={`Entregues / Vigentes: ${deliveredDeliverablesList.length} (${pctDelivered}%)`}
                  />
                )}
                {regularDeliverables.length > 0 && (
                  <div 
                    style={{ width: `${(regularDeliverables.length / totalForBar) * 100}%`, backgroundColor: '#94a3b8', transition: 'width 0.3s' }} 
                    title={`Pendentes Regulares (>60 dias): ${regularDeliverables.length}`}
                  />
                )}
                {totalDeliverablesCount === 0 && (
                  <div style={{ width: '100%', backgroundColor: '#cbd5e1' }} title="Nenhum entregável cadastrado" />
                )}
              </div>

              {/* Legenda dos indicadores */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8125rem' }}>
                {expiredDeliverablesList.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }} />
                    <span style={{ color: '#dc2626', fontWeight: '700' }}>Vencidos: <strong>{expiredDeliverablesList.length}</strong></span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                  <span>Entregues/Vigentes: <strong style={{ color: '#10b981' }}>{deliveredDeliverablesList.length}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ea580c', display: 'inline-block' }} />
                  <span>A Vencer em <strong>30 dias</strong>: <strong style={{ color: '#ea580c' }}>{expiring30.length}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
                  <span>A Vencer em <strong>60 dias</strong>: <strong style={{ color: '#f59e0b' }}>{expiring60.length}</strong></span>
                </div>
                {regularDeliverables.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#94a3b8', display: 'inline-block' }} />
                    <span>Mais de 60 dias: <strong style={{ color: '#64748b' }}>{regularDeliverables.length}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Cards de Gestão de CIPA e Gestão de EPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {/* Card Gestão de CIPA */}
              {(() => {
                const cipaStatus = company.gestaoCipa || company.gestaoPgr || 'pendente';
                const epiStatus = company.gestaoEpi || company.gestaoSipat || 'pendente';
                return (
                  <>
                    <div style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Comissão / NR-5</span>
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Gestão de CIPA</h3>
                        </div>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', padding: '0.25rem 0.625rem', borderRadius: '1rem',
                          backgroundColor: cipaStatus === 'implementado' ? '#dcfce7' : cipaStatus === 'nao_implementado' ? '#fee2e2' : '#fef3c7',
                          color: cipaStatus === 'implementado' ? '#15803d' : cipaStatus === 'nao_implementado' ? '#b91c1c' : '#b45309',
                          border: `1px solid ${cipaStatus === 'implementado' ? '#86efac' : cipaStatus === 'nao_implementado' ? '#fca5a5' : '#fde68a'}`
                        }}>
                          {cipaStatus === 'implementado' ? 'Implementado' : cipaStatus === 'nao_implementado' ? 'Não Implementado' : 'Pendente'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateGestao('gestaoCipa', 'pendente')}
                          style={{
                            flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                            border: cipaStatus === 'pendente' ? '2px solid #b45309' : '1px solid var(--border)',
                            backgroundColor: cipaStatus === 'pendente' ? '#fef3c7' : 'var(--background)',
                            color: cipaStatus === 'pendente' ? '#b45309' : 'var(--text-secondary)',
                            fontWeight: cipaStatus === 'pendente' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          Pendente
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateGestao('gestaoCipa', 'implementado')}
                          style={{
                            flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                            border: cipaStatus === 'implementado' ? '2px solid #15803d' : '1px solid var(--border)',
                            backgroundColor: cipaStatus === 'implementado' ? '#dcfce7' : 'var(--background)',
                            color: cipaStatus === 'implementado' ? '#15803d' : 'var(--text-secondary)',
                            fontWeight: cipaStatus === 'implementado' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          Implementado
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateGestao('gestaoCipa', 'nao_implementado')}
                          style={{
                            flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                            border: cipaStatus === 'nao_implementado' ? '2px solid #b91c1c' : '1px solid var(--border)',
                            backgroundColor: cipaStatus === 'nao_implementado' ? '#fee2e2' : 'var(--background)',
                            color: cipaStatus === 'nao_implementado' ? '#b91c1c' : 'var(--text-secondary)',
                            fontWeight: cipaStatus === 'nao_implementado' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          Não Impl.
                        </button>
                      </div>
                    </div>

                    {/* Card Gestão de EPI */}
                    <div style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Equipamento / NR-6</span>
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Gestão de EPI</h3>
                        </div>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', padding: '0.25rem 0.625rem', borderRadius: '1rem',
                          backgroundColor: epiStatus === 'implementado' ? '#dcfce7' : epiStatus === 'nao_implementado' ? '#fee2e2' : '#fef3c7',
                          color: epiStatus === 'implementado' ? '#15803d' : epiStatus === 'nao_implementado' ? '#b91c1c' : '#b45309',
                          border: `1px solid ${epiStatus === 'implementado' ? '#86efac' : epiStatus === 'nao_implementado' ? '#fca5a5' : '#fde68a'}`
                        }}>
                          {epiStatus === 'implementado' ? 'Implementado' : epiStatus === 'nao_implementado' ? 'Não Implementado' : 'Pendente'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateGestao('gestaoEpi', 'pendente')}
                          style={{
                            flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                            border: epiStatus === 'pendente' ? '2px solid #b45309' : '1px solid var(--border)',
                            backgroundColor: epiStatus === 'pendente' ? '#fef3c7' : 'var(--background)',
                            color: epiStatus === 'pendente' ? '#b45309' : 'var(--text-secondary)',
                            fontWeight: epiStatus === 'pendente' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          Pendente
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateGestao('gestaoEpi', 'implementado')}
                          style={{
                            flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                            border: epiStatus === 'implementado' ? '2px solid #15803d' : '1px solid var(--border)',
                            backgroundColor: epiStatus === 'implementado' ? '#dcfce7' : 'var(--background)',
                            color: epiStatus === 'implementado' ? '#15803d' : 'var(--text-secondary)',
                            fontWeight: epiStatus === 'implementado' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          Implementado
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateGestao('gestaoEpi', 'nao_implementado')}
                          style={{
                            flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                            border: epiStatus === 'nao_implementado' ? '2px solid #b91c1c' : '1px solid var(--border)',
                            backgroundColor: epiStatus === 'nao_implementado' ? '#fee2e2' : 'var(--background)',
                            color: epiStatus === 'nao_implementado' ? '#b91c1c' : 'var(--text-secondary)',
                            fontWeight: epiStatus === 'nao_implementado' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          Não Impl.
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Programas */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} /> Programas
              </h2>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                onClick={() => setShowDeliverableModal(true)}
              >
                + Novo Programa
              </button>
            </div>
            
            {programs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nenhum programa registrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {programs.map(prog => {
                  const timing = getDeliverableTimingInfo(prog, today);
                  const isExpired = timing.isExpired;
                  
                  return (
                    <div key={prog.id} style={{
                      padding: '1rem', 
                      border: isExpired ? '1px solid #fca5a5' : '1px solid var(--border)',
                      borderLeft: isExpired ? '4px solid #dc2626' : undefined,
                      borderRadius: 'var(--radius-md)', 
                      backgroundColor: isExpired ? '#fef2f2' : 'var(--background)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '0.875rem', color: isExpired ? '#b91c1c' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {prog.title}
                          {isExpired && (
                            <span style={{ fontSize: '0.6875rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#dc2626', color: '#fff', fontWeight: '700' }}>
                              ⚠️ VENCIDO
                            </span>
                          )}
                        </h4>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                          <span>
                            Data de Emissão: <strong style={{ color: 'var(--text-primary)' }}>
                              {(prog.dataEmissao || prog.dataEnvio) 
                                ? new Date(prog.dataEmissao || prog.dataEnvio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
                                : 'Não informada'}
                            </strong>
                          </span>
                          <span>
                            Validade: <strong style={{ color: isExpired ? '#dc2626' : 'var(--text-primary)', fontWeight: isExpired ? '700' : '600' }}>
                              {(() => {
                                const effVal = getEffectiveValidityDate(prog);
                                if (effVal) {
                                  return `${effVal.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}${isExpired ? ' (Expirada)' : ''}`;
                                }
                                return 'Sem validade';
                              })()}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          fontSize: '0.75rem', padding: '0.2rem 0.6rem',
                          borderRadius: '1rem', backgroundColor: timing.bg,
                          color: timing.color, border: `1px solid ${timing.border}`,
                          fontWeight: '700', textTransform: 'capitalize', whiteSpace: 'nowrap'
                        }}>
                          {timing.label}
                        </span>
                        {prog.fileName && (
                          <button
                            onClick={() => window.open(getDocumentUrl(prog.fileName), '_blank')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)',
                              backgroundColor: 'transparent', border: '1px solid var(--border)',
                              fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '500', cursor: 'pointer'
                            }}
                            title="Baixar Anexo"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingDeliverable(prog)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'transparent', border: '1px solid var(--border)',
                            fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer'
                          }}
                          title="Editar Programa / Datas"
                        >
                          <Edit3 size={13} /> Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <TrainingCalendar companyId={companyId} onUpdate={() => loadData(false)} />
      )}

      {activeTab === 'deliverables' && (
        <DeliverablesViewer companyId={companyId} />
      )}

      {showDeliverableModal && (
        <AddDeliverableModal 
          companyId={companyId}
          initialType="programa"
          onClose={() => setShowDeliverableModal(false)} 
          onSave={handleAddDeliverable} 
        />
      )}

      {editingDeliverable && (
        <EditDeliverableModal
          deliverable={editingDeliverable}
          companyId={companyId}
          onClose={() => setEditingDeliverable(null)}
          onSave={handleUpdateDeliverable}
        />
      )}

      {showEditModal && (
        <EditCompanyModal 
          company={company}
          group={group}
          onClose={() => setShowEditModal(false)} 
          onSave={handleEditCompany} 
        />
      )}
    </div>
  );
};

export default CompanyDetailsPage;
