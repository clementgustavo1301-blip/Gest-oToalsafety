import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, Calendar, FileText, ClipboardList,
  Phone, User, Hash, Edit3
} from 'lucide-react';
import {
  getCompanyById, getGroups, getTrainingsByCompany,
  getContractsByCompany, getDeliverablesByCompany, addContract,
  updateContract, uploadDocument, getDocumentUrl, addDeliverable,
  updateCompany
} from '../services/storageService';
import TrainingCalendar from '../components/TrainingCalendar';
import DeliverablesViewer from '../components/DeliverablesViewer';
import AddContractModal from '../components/AddContractModal';
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
  const [contracts, setContracts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingContractId, setUploadingContractId] = useState(null);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const [comp, allGroups, trn, ctr, deliv] = await Promise.all([
      getCompanyById(companyId),
      getGroups(),
      getTrainingsByCompany(companyId),
      getContractsByCompany(companyId),
      getDeliverablesByCompany(companyId)
    ]);
    
    setCompany(comp);
    setGroup(allGroups.find(g => g.id === comp?.groupId));
    setTrainings(trn);
    setContracts(ctr);
    setDeliverables(deliv);
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    loadData(true);
  }, [companyId]);

  const handleAddContract = async (contractData) => {
    let filePath = null;
    if (contractData.file) {
      filePath = await uploadDocument(contractData.file, `contracts/${companyId}`);
    }
    await addContract({ ...contractData, filePath, companyId });
    await loadData(false);
    setShowContractModal(false);
  };

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

  const handleContractFileUpload = async (contractId, file) => {
    if (!file) return;
    setUploadingContractId(contractId);
    
    const filePath = await uploadDocument(file, `contracts/${companyId}`);
    if (filePath) {
      await updateContract(contractId, { filePath });
      await loadData(false);
    } else {
      alert('Erro ao fazer upload do contrato.');
    }
    setUploadingContractId(null);
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

  const statusColors = {
    ativo: { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' },
    vencido: { bg: '#fee2e2', color: '#dc2626' },
    pendente: { bg: '#fef3c7', color: '#b45309' },
  };

  const pendingTrainingDeliverables = deliverables
    .filter(d => d.type === 'treinamento' && d.status === 'pendente')
    .map(d => ({
      id: d.id,
      title: d.title,
      date: d.dueDate || '',
      time: 'Aguardando Agendamento',
      status: 'pendente',
      isDeliverable: true
    }));

  const allUpcomingTrainings = [...trainings, ...pendingTrainingDeliverables].slice(0, 5);
  const totalTrainingsCount = trainings.length + pendingTrainingDeliverables.length;

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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: "'JetBrains Mono', monospace" }}>
                <Hash size={14} /> {company.cnpj}
              </span>
              {company.contact && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <User size={14} /> {company.contact}
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
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>{totalTrainingsCount}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Treinamentos</p>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--secondary)' }}>{contracts.length}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Contratos</p>
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
        <div className="grid-responsive-overview">
          {/* Contracts */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={20} /> Contratos TotalSafety
              </h2>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                onClick={() => setShowContractModal(true)}
              >
                + Novo Contrato
              </button>
            </div>
            {contracts.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nenhum contrato vinculado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {contracts.map(contract => {
                  const colors = statusColors[contract.status] || statusColors.pendente;
                  return (
                    <div key={contract.id} style={{
                      padding: '1rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontWeight: '600', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                          {contract.contractNumber}
                        </h4>
                        <span style={{
                          fontSize: '0.75rem', padding: '0.125rem 0.5rem',
                          borderRadius: '1rem', backgroundColor: colors.bg,
                          color: colors.color, fontWeight: '500', textTransform: 'capitalize'
                        }}>
                          {contract.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                        {contract.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>{contract.startDate ? new Date(contract.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''} → {contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}</span>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{contract.value}</span>
                      </div>
                      
                      {/* Upload / Download File */}
                      <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                        {contract.filePath ? (
                          <button
                            onClick={() => window.open(getDocumentUrl(contract.filePath), '_blank')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
                              padding: '0.375rem', borderRadius: 'var(--radius-md)', width: '100%',
                              backgroundColor: 'transparent', border: '1px solid var(--border)',
                              fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '500', cursor: 'pointer'
                            }}
                          >
                            <FileText size={14} /> Ver Contrato Anexado
                          </button>
                        ) : (
                          <label
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
                              padding: '0.375rem', borderRadius: 'var(--radius-md)', width: '100%',
                              backgroundColor: 'var(--surface)', border: '1px dashed var(--border)',
                              fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: uploadingContractId === contract.id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <FileText size={14} /> {uploadingContractId === contract.id ? 'Enviando...' : 'Anexar PDF do Contrato'}
                            <input 
                              type="file" 
                              accept=".pdf,.doc,.docx" 
                              style={{ display: 'none' }} 
                              disabled={uploadingContractId === contract.id}
                              onChange={(e) => handleContractFileUpload(contract.id, e.target.files[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Trainings */}
          <div className="card">
            <h2 className="text-h2" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} /> Próximos Treinamentos
            </h2>
            {allUpcomingTrainings.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nenhum treinamento registrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {allUpcomingTrainings.map(training => {
                  const statusStyle = training.status === 'concluido'
                    ? { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' }
                    : training.status === 'agendado'
                      ? { bg: 'var(--primary-light)', color: 'var(--primary)' }
                      : training.status === 'pendente'
                        ? { bg: '#fef3c7', color: '#b45309' }
                        : { bg: '#fee2e2', color: '#dc2626' };
                  return (
                    <div key={training.id} style={{
                      padding: '1rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {training.title}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                          {training.isDeliverable 
                            ? <span style={{color: '#b45309', fontWeight: '500'}}>Aguardando Agendamento</span>
                            : `${training.date ? new Date(training.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'} • ${training.time}`
                          }
                        </p>
                      </div>
                      <span style={{
                        fontSize: '0.75rem', padding: '0.125rem 0.5rem',
                        borderRadius: '1rem', backgroundColor: statusStyle.bg,
                        color: statusStyle.color, fontWeight: '500', textTransform: 'capitalize'
                      }}>
                        {training.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Programas e Laudos Recentes */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} /> Programas e Laudos
              </h2>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                onClick={() => setShowDeliverableModal(true)}
              >
                + Novo Documento
              </button>
            </div>
            
            {deliverables.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nenhum laudo ou programa registrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {deliverables.slice(0, 5).map(deliv => {
                  const isDone = deliv.status === 'entregue' || deliv.status === 'feito';
                  const style = isDone
                    ? { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' }
                    : deliv.status === 'pendente'
                      ? { bg: '#fef3c7', color: '#b45309' }
                      : { bg: 'var(--primary-light)', color: 'var(--primary)' };
                  
                  return (
                    <div key={deliv.id} style={{
                      padding: '1rem', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {deliv.title}
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem', textTransform: 'capitalize' }}>
                          {deliv.type} • Vencimento: {deliv.dueDate ? new Date(deliv.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem prazo'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{
                          fontSize: '0.75rem', padding: '0.125rem 0.5rem',
                          borderRadius: '1rem', backgroundColor: style.bg,
                          color: style.color, fontWeight: '500', textTransform: 'capitalize', whiteSpace: 'nowrap'
                        }}>
                          {deliv.status}
                        </span>
                        {deliv.fileName && (
                          <button
                            onClick={() => window.open(getDocumentUrl(deliv.fileName), '_blank')}
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
      )}

      {activeTab === 'calendar' && (
        <TrainingCalendar companyId={companyId} onUpdate={() => loadData(false)} />
      )}

      {activeTab === 'deliverables' && (
        <DeliverablesViewer companyId={companyId} />
      )}

      {showContractModal && (
        <AddContractModal 
          onClose={() => setShowContractModal(false)} 
          onSave={handleAddContract} 
        />
      )}

      {showDeliverableModal && (
        <AddDeliverableModal 
          companyId={companyId}
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
