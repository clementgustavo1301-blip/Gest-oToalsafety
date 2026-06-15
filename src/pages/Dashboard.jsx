import { ArrowRight, CheckCircle, Clock, AlertTriangle, FileText, Users, Building2, PauseCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import {
  getContracts, getDeliverables, getTrainings, getCompanies
} from '../services/storageService';

const Dashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [c, d, t, comp] = await Promise.all([
        getContracts(),
        getDeliverables(),
        getTrainings(),
        getCompanies()
      ]);
      setContracts(c);
      setDeliverables(d);
      setTrainings(t);
      setCompanies(comp);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando dados do painel...</div>;
  }

  const activeContracts = contracts.filter(c => c.status === 'ativo').length;
  const pendingDeliverables = deliverables.filter(d => d.status === 'pendente' || d.status === 'em_elaboracao').length;
  const completedTrainings = trainings.filter(t => t.status === 'concluido').length;
  const attentionItems = trainings.filter(t => t.status === 'nao_feito' || t.status === 'adiado').length;

  const stats = [
    { title: 'Contratos Ativos', value: String(activeContracts), icon: <FileText size={24} color="var(--primary)" />, trend: `${contracts.length} total` },
    { title: 'Entregáveis Pendentes', value: String(pendingDeliverables), icon: <Clock size={24} color="var(--warning)" />, trend: 'Aguardando ação' },
    { title: 'Treinamentos Concluídos', value: String(completedTrainings), icon: <Users size={24} color="var(--secondary)" />, trend: `de ${trainings.length} agendados` },
    { title: 'Atenção Requerida', value: String(attentionItems), icon: <AlertTriangle size={24} color="var(--danger)" />, trend: 'Adiados / Não feitos' },
  ];

  const getCompanyName = (companyId) => companies.find(c => c.id === companyId)?.name || 'N/A';

  const upcomingDeliverables = deliverables
    .filter(d => d.status !== 'entregue' && d.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
    .map(d => ({
      ...d,
      companyName: getCompanyName(d.companyId),
    }));

  const upcomingTrainingsScheduled = trainings
    .filter(t => t.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => ({
      ...t,
      companyName: getCompanyName(t.companyId),
      isDeliverable: false
    }));

  const pendingTrainingDeliverables = deliverables
    .filter(d => d.type === 'treinamento' && d.status === 'pendente')
    .map(d => ({
      id: d.id,
      title: d.title,
      companyName: getCompanyName(d.companyId),
      date: d.dueDate || '',
      time: 'Pendente de Agendamento',
      status: 'pendente',
      isDeliverable: true
    }));

  const upcomingTrainings = [...upcomingTrainingsScheduled, ...pendingTrainingDeliverables].slice(0, 5);

  const statusIcons = {
    concluido: <CheckCircle color="var(--secondary)" size={18} />,
    pendente: <Clock color="var(--warning)" size={18} />,
    em_elaboracao: <AlertTriangle color="var(--primary)" size={18} />,
    agendado: <Clock color="var(--info)" size={18} />,
    adiado: <PauseCircle color="#b45309" size={18} />,
    nao_feito: <XCircle color="var(--danger)" size={18} />,
  };

  const statusLabels = {
    concluido: 'Concluído', pendente: 'Pendente', em_elaboracao: 'Em Elaboração',
    agendado: 'Agendado', adiado: 'Adiado', nao_feito: 'Não Feito', entregue: 'Entregue',
  };

  const statusColors = {
    concluido: { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' },
    pendente: { bg: '#fef3c7', color: '#b45309' },
    em_elaboracao: { bg: 'var(--primary-light)', color: 'var(--primary)' },
    agendado: { bg: 'var(--primary-light)', color: 'var(--primary-hover)' },
    adiado: { bg: '#fef3c7', color: '#b45309' },
    nao_feito: { bg: '#fee2e2', color: 'var(--danger)' },
    entregue: { bg: 'var(--secondary-light)', color: 'var(--secondary-hover)' },
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Dashboard Geral</h1>
          <p className="text-subtitle">Acompanhamento integrado de entregáveis, treinamentos e contratos.</p>
        </div>
        <Link to="/companies" className="btn btn-primary">
          <Building2 size={18} /> Ver Empresas
        </Link>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {stats.map((stat, index) => (
          <div key={index} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="text-subtitle" style={{ marginBottom: '0.25rem' }}>{stat.title}</p>
                <h3 className="text-h1" style={{ margin: 0 }}>{stat.value}</h3>
              </div>
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--background)',
                borderRadius: 'var(--radius-md)'
              }}>
                {stat.icon}
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {stat.trend}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Upcoming Deliverables */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="text-h2">Entregáveis Pendentes</h2>
            <Link to="/deliverables" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: '500' }}>Ver todos</Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcomingDeliverables.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                ✅ Nenhum entregável pendente!
              </p>
            ) : upcomingDeliverables.map((item) => {
              const sc = statusColors[item.status] || statusColors.pendente;
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.875rem', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {statusIcons[item.status] || statusIcons.pendente}
                    <div>
                      <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.125rem', fontSize: '0.875rem' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.companyName}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem prazo'}
                    </p>
                    <span style={{
                      fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                      backgroundColor: sc.bg, color: sc.color, fontWeight: '500'
                    }}>
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Trainings */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="text-h2">Treinamentos</h2>
            <Link to="/calendar" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: '500' }}>Ver calendário</Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcomingTrainings.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                Nenhum treinamento registrado.
              </p>
            ) : upcomingTrainings.map((item) => {
              const sc = statusColors[item.status] || statusColors.agendado;
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.875rem', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {statusIcons[item.status] || statusIcons.agendado}
                    <div>
                      <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.125rem', fontSize: '0.875rem' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.companyName} • {item.isDeliverable ? <span style={{color: '#b45309', fontWeight: '600'}}>Aguardando Agendamento</span> : item.time}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {item.isDeliverable && !item.date 
                        ? 'Sem data definida' 
                        : item.date 
                          ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
                          : 'Sem data'}
                    </p>
                    <span style={{
                      fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                      backgroundColor: sc.bg, color: sc.color, fontWeight: '500'
                    }}>
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
