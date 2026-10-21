import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Calendar, FileText,
  Phone, User, Hash, Edit3, UserCheck, LifeBuoy,
  ShieldCheck, Clock, CheckCircle2, AlertTriangle, AlertCircle
} from 'lucide-react';
import {
  getCompanyById, getGroups, getTrainingsByCompany,
  getDeliverablesByCompany, uploadDocument, getDocumentUrl, addDeliverable,
  updateCompany
} from '../services/storageService';
import TrainingCalendar from '../components/TrainingCalendar';
import DeliverablesViewer from '../components/DeliverablesViewer';
import AddDeliverableModal from '../components/AddDeliverableModal';
import EditCompanyModal from '../components/EditCompanyModal';

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

  const effSupervisor = company.supervisor || group?.supervisor || company.supportResponsible || 'Não definido';
  const effTecnico = company.tecnicoResponsavel || group?.tecnicoResponsavel || company.responsible || 'Não definido';
  const effVisitas = company.visitasTecnicas || group?.visitasTecnicas || 'N/A';

  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  const isDelivered = (d) => ['entregue', 'feito', 'concluido'].includes(d.status);
  const deliveredDeliverablesList = deliverables.filter(isDelivered);
  const pendingDeliverablesList = deliverables.filter(d => !isDelivered(d) && d.status !== 'cancelado' && d.status !== 'nao_se_aplica');
  
  // A Vencer em até 30 dias (ou já vencidos)
  const expiring30 = pendingDeliverablesList.filter(d => {
    const targetDate = d.validityDate || d.dueDate || d.dataEnvio;
    if (!targetDate) return false;
    const dt = new Date(targetDate);
    return dt <= in30Days;
  });

  // A Vencer em 60 dias (entre 31 e 60 dias)
  const expiring60 = pendingDeliverablesList.filter(d => {
    const targetDate = d.validityDate || d.dueDate || d.dataEnvio;
    if (!targetDate) return false;
    const dt = new Date(targetDate);
    return dt > in30Days && dt <= in60Days;
  });

  // Mais de 60 dias ou sem prazo crítico
  const regularDeliverables = pendingDeliverablesList.filter(d => {
    const targetDate = d.validityDate || d.dueDate || d.dataEnvio;
    if (!targetDate) return true;
    const dt = new Date(targetDate);
    return dt > in60Days;
  });

  const totalDeliverablesCount = deliveredDeliverablesList.length + pendingDeliverablesList.length;
  const totalForBar = totalDeliverablesCount || 1;
  const pctDelivered = Math.round((deliveredDeliverablesList.length / totalForBar) * 100);
  const pct30 = Math.round((expiring30.length / totalForBar) * 100);
  const pct60 = Math.round((expiring60.length / totalForBar) * 100);
  const pctRegular = Math.max(0, 100 - pctDelivered - pct30 - pct60);

  const handleUpdateGestao = async (field, value) => {
    await updateCompany(companyId, { [field]: value });
    setCompany(prev => ({ ...prev, [field]: value }));
  };

  // Ordena programações: próximas/futuras primeiro (por data ascendente), seguidas pelas passadas (por data descendente)
  const sortedSchedules = [...trainings].sort((a, b) => {
    const aIsFuture = (a.date || '') >= todayStr;
    const bIsFuture = (b.date || '') >= todayStr;
    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;
    if (aIsFuture && bIsFuture) return (a.date || '').localeCompare(b.date || '');
    return (b.date || '').localeCompare(a.date || '');
  });

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
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
              fontWeight: activeTab === tab.id ? '600' : '500',
              fontSize: '0.875rem', transition: 'var(--transition)',
              backgroundColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Painel Visão Geral: Prazos, Barra Amarelo e Vermelho, Gestão PGR e SIPAT */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 className="text-h2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} color="var(--primary)" /> Visão Geral de Conformidade e Gestão SST
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Acompanhamento de entregáveis a vencer (30 e 60 dias) e status dos programas de gestão SST
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Total: <strong style={{ color: 'var(--text-primary)' }}>{totalDeliverablesCount}</strong>
                </span>
                <span style={{ color: 'var(--border)' }}>•</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#10b981' }}>
                  Entregues: <strong>{deliveredDeliverablesList.length}</strong>
                </span>
                <span style={{ color: 'var(--border)' }}>•</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: pendingDeliverablesList.length > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                  Pendentes: <strong>{pendingDeliverablesList.length}</strong>
                </span>
              </div>
            </div>

            {/* Barra Visual: Entregues + A Vencer 60 dias e 30 dias */}
            <div style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <AlertTriangle size={15} color="#f59e0b" /> Status e Prazos dos Entregáveis
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Olhar barra verde, amarelo e vermelho ({pctDelivered}% concluído)
                </span>
              </div>

              {/* Barra segmentada */}
              <div style={{ height: '14px', width: '100%', borderRadius: '7px', display: 'flex', overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: '0.75rem' }}>
                {deliveredDeliverablesList.length > 0 && (
                  <div 
                    style={{ width: `${(deliveredDeliverablesList.length / totalForBar) * 100}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }} 
                    title={`Entregues (Concluídos): ${deliveredDeliverablesList.length} (${pctDelivered}%)`}
                  />
                )}
                {regularDeliverables.length > 0 && (
                  <div 
                    style={{ width: `${(regularDeliverables.length / totalForBar) * 100}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s' }} 
                    title={`Mais de 60 dias / Regular: ${regularDeliverables.length} (${pctRegular}%)`}
                  />
                )}
                {expiring60.length > 0 && (
                  <div 
                    style={{ width: `${(expiring60.length / totalForBar) * 100}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s' }} 
                    title={`A Vencer em 60 dias (Alerta): ${expiring60.length}`}
                  />
                )}
                {expiring30.length > 0 && (
                  <div 
                    style={{ width: `${(expiring30.length / totalForBar) * 100}%`, backgroundColor: '#ef4444', transition: 'width 0.3s' }} 
                    title={`Crítico / A Vencer em até 30 dias: ${expiring30.length}`}
                  />
                )}
                {totalDeliverablesCount === 0 && (
                  <div style={{ width: '100%', backgroundColor: '#cbd5e1' }} title="Nenhum entregável cadastrado" />
                )}
              </div>

              {/* Legenda dos indicadores */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                  <span>Entregues: <strong style={{ color: '#10b981' }}>{deliveredDeliverablesList.length}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                  <span>A Vencer em <strong>30 dias</strong> (Crítico): <strong style={{ color: '#ef4444' }}>{expiring30.length}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
                  <span>A Vencer em <strong>60 dias</strong> (Alerta): <strong style={{ color: '#f59e0b' }}>{expiring60.length}</strong></span>
                </div>
                {regularDeliverables.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }} />
                    <span>Mais de 60 dias: <strong style={{ color: '#3b82f6' }}>{regularDeliverables.length}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Cards de Gestão PGR e Gestão SIPAT */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {/* Card Gestão PGR */}
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
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Programa</span>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Gestão PGR</h3>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', padding: '0.25rem 0.625rem', borderRadius: '1rem',
                    backgroundColor: company.gestaoPgr === 'implementado' ? '#dcfce7' : company.gestaoPgr === 'nao_implementado' ? '#fee2e2' : '#fef3c7',
                    color: company.gestaoPgr === 'implementado' ? '#15803d' : company.gestaoPgr === 'nao_implementado' ? '#b91c1c' : '#b45309',
                    border: `1px solid ${company.gestaoPgr === 'implementado' ? '#86efac' : company.gestaoPgr === 'nao_implementado' ? '#fca5a5' : '#fde68a'}`
                  }}>
                    {company.gestaoPgr === 'implementado' ? 'Implementado' : company.gestaoPgr === 'nao_implementado' ? 'Não Implementado' : 'Pendente'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateGestao('gestaoPgr', 'pendente')}
                    style={{
                      flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                      border: company.gestaoPgr === 'pendente' ? '2px solid #b45309' : '1px solid var(--border)',
                      backgroundColor: company.gestaoPgr === 'pendente' ? '#fef3c7' : 'var(--background)',
                      color: company.gestaoPgr === 'pendente' ? '#b45309' : 'var(--text-secondary)',
                      fontWeight: company.gestaoPgr === 'pendente' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Pendente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateGestao('gestaoPgr', 'implementado')}
                    style={{
                      flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                      border: company.gestaoPgr === 'implementado' ? '2px solid #15803d' : '1px solid var(--border)',
                      backgroundColor: company.gestaoPgr === 'implementado' ? '#dcfce7' : 'var(--background)',
                      color: company.gestaoPgr === 'implementado' ? '#15803d' : 'var(--text-secondary)',
                      fontWeight: company.gestaoPgr === 'implementado' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Implementado
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateGestao('gestaoPgr', 'nao_implementado')}
                    style={{
                      flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                      border: company.gestaoPgr === 'nao_implementado' ? '2px solid #b91c1c' : '1px solid var(--border)',
                      backgroundColor: company.gestaoPgr === 'nao_implementado' ? '#fee2e2' : 'var(--background)',
                      color: company.gestaoPgr === 'nao_implementado' ? '#b91c1c' : 'var(--text-secondary)',
                      fontWeight: company.gestaoPgr === 'nao_implementado' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Não Impl.
                  </button>
                </div>
              </div>

              {/* Card Gestão SIPAT */}
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
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Evento / Campanha</span>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Gestão de SIPAT</h3>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', padding: '0.25rem 0.625rem', borderRadius: '1rem',
                    backgroundColor: company.gestaoSipat === 'implementado' ? '#dcfce7' : company.gestaoSipat === 'nao_implementado' ? '#fee2e2' : '#fef3c7',
                    color: company.gestaoSipat === 'implementado' ? '#15803d' : company.gestaoSipat === 'nao_implementado' ? '#b91c1c' : '#b45309',
                    border: `1px solid ${company.gestaoSipat === 'implementado' ? '#86efac' : company.gestaoSipat === 'nao_implementado' ? '#fca5a5' : '#fde68a'}`
                  }}>
                    {company.gestaoSipat === 'implementado' ? 'Implementado' : company.gestaoSipat === 'nao_implementado' ? 'Não Implementado' : 'Pendente'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateGestao('gestaoSipat', 'pendente')}
                    style={{
                      flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                      border: company.gestaoSipat === 'pendente' ? '2px solid #b45309' : '1px solid var(--border)',
                      backgroundColor: company.gestaoSipat === 'pendente' ? '#fef3c7' : 'var(--background)',
                      color: company.gestaoSipat === 'pendente' ? '#b45309' : 'var(--text-secondary)',
                      fontWeight: company.gestaoSipat === 'pendente' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Pendente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateGestao('gestaoSipat', 'implementado')}
                    style={{
                      flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                      border: company.gestaoSipat === 'implementado' ? '2px solid #15803d' : '1px solid var(--border)',
                      backgroundColor: company.gestaoSipat === 'implementado' ? '#dcfce7' : 'var(--background)',
                      color: company.gestaoSipat === 'implementado' ? '#15803d' : 'var(--text-secondary)',
                      fontWeight: company.gestaoSipat === 'implementado' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Implementado
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateGestao('gestaoSipat', 'nao_implementado')}
                    style={{
                      flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm, 6px)',
                      border: company.gestaoSipat === 'nao_implementado' ? '2px solid #b91c1c' : '1px solid var(--border)',
                      backgroundColor: company.gestaoSipat === 'nao_implementado' ? '#fee2e2' : 'var(--background)',
                      color: company.gestaoSipat === 'nao_implementado' ? '#b91c1c' : 'var(--text-secondary)',
                      fontWeight: company.gestaoSipat === 'nao_implementado' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    Não Impl.
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid-responsive-overview">
          {/* Programações no Calendário */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} /> Programações no Calendário
              </h2>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                onClick={() => setActiveTab('calendar')}
              >
                Ver Calendário
              </button>
            </div>
            {sortedSchedules.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nenhuma programação registrada no calendário.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sortedSchedules.map(item => {
                  const statusStyle = item.status === 'concluido'
                    ? { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)', label: 'Concluído' }
                    : item.status === 'agendado'
                      ? { bg: 'var(--primary-light)', color: 'var(--primary)', label: 'Agendado' }
                      : item.status === 'adiado'
                        ? { bg: '#fef3c7', color: '#b45309', label: 'Adiado' }
                        : item.status === 'nao_feito'
                          ? { bg: '#fee2e2', color: '#dc2626', label: 'Não Feito' }
                          : { bg: 'var(--primary-light)', color: 'var(--primary)', label: item.status || 'Agendado' };

                  return (
                    <div key={item.id} style={{
                      padding: '1rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                          {item.date ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'}
                          {item.time ? ` • ${item.time}` : ''}
                          {item.instructor ? ` • Instrutor: ${item.instructor}` : ''}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '0.75rem', padding: '0.125rem 0.5rem',
                        borderRadius: '1rem', backgroundColor: statusStyle.bg,
                        color: statusStyle.color, fontWeight: '500', textTransform: 'capitalize', whiteSpace: 'nowrap'
                      }}>
                        {statusStyle.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
                  const isDone = prog.status === 'entregue' || prog.status === 'feito';
                  const style = isDone
                    ? { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' }
                    : prog.status === 'pendente'
                      ? { bg: '#fef3c7', color: '#b45309' }
                      : { bg: 'var(--primary-light)', color: 'var(--primary)' };
                  
                  return (
                    <div key={prog.id} style={{
                      padding: '1rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {prog.title}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem', textTransform: 'capitalize' }}>
                          Programa • Vencimento: {prog.dueDate ? new Date(prog.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem prazo'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{
                          fontSize: '0.75rem', padding: '0.125rem 0.5rem',
                          borderRadius: '1rem', backgroundColor: style.bg,
                          color: style.color, fontWeight: '500', textTransform: 'capitalize', whiteSpace: 'nowrap'
                        }}>
                          {prog.status}
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
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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

      {showEditModal && (
        <EditCompanyModal 
          company={company}
          onClose={() => setShowEditModal(false)} 
          onSave={handleEditCompany} 
        />
      )}
    </div>
  );
};

export default CompanyDetailsPage;
