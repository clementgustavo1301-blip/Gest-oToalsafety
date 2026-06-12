import { ArrowRight, CheckCircle, Clock, AlertTriangle, FileText, Users } from 'lucide-react';
import React from 'react';

const Dashboard = () => {
  const stats = [
    { title: 'Contratos Ativos', value: '12', icon: <FileText size={24} color="var(--primary)" />, trend: '+2 este mês' },
    { title: 'Entregáveis Pendentes', value: '5', icon: <Clock size={24} color="var(--warning)" />, trend: 'Vencendo em breve' },
    { title: 'Treinamentos Realizados', value: '84', icon: <Users size={24} color="var(--secondary)" />, trend: '+15% vs último mês' },
    { title: 'Atenção Requerida', value: '2', icon: <AlertTriangle size={24} color="var(--danger)" />, trend: 'Ações imediatas' },
  ];

  const upcomingDeliverables = [
    { id: 1, company: 'LD Agropecuaria LTDA', task: 'Elaboração do PGR e PCMSO', dueDate: '15 Jun 2026', status: 'pendente' },
    { id: 2, company: 'LD Agropecuaria LTDA', task: 'Envio Eventos eSocial (S-2220/S-2240)', dueDate: '18 Jun 2026', status: 'pendente' },
    { id: 3, company: 'LD Agropecuaria LTDA', task: 'Implementação CIPA digital', dueDate: '20 Jun 2026', status: 'agendado' },
    { id: 4, company: 'LD Agropecuaria LTDA', task: 'Laudo LTCAT e LTIP', dueDate: '12 Jun 2026', status: 'concluido' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Dashboard Geral</h1>
          <p className="text-subtitle">Acompanhamento de entregáveis e saúde ocupacional.</p>
        </div>
        <button className="btn btn-primary">
          Novo Contrato
        </button>
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Deliverables List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="text-h2">Próximos Entregáveis</h2>
            <button style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: '500' }}>Ver todos</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcomingDeliverables.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--background)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {item.status === 'concluido' ? (
                    <CheckCircle color="var(--secondary)" size={20} />
                  ) : item.status === 'pendente' ? (
                    <Clock color="var(--warning)" size={20} />
                  ) : (
                    <Clock color="var(--info)" size={20} />
                  )}
                  <div>
                    <h4 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.125rem' }}>{item.task}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.company}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {item.dueDate}
                  </p>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '1rem',
                    backgroundColor: item.status === 'concluido' ? 'var(--secondary-light)' : item.status === 'pendente' ? '#fef3c7' : 'var(--primary-light)',
                    color: item.status === 'concluido' ? 'var(--secondary-hover)' : item.status === 'pendente' ? '#b45309' : 'var(--primary-hover)',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / Summary */}
        <div className="card" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
          <h2 className="text-h2" style={{ color: 'white', marginBottom: '1rem' }}>Ações Rápidas</h2>
          <p style={{ color: 'var(--primary-light)', marginBottom: '2rem', fontSize: '0.875rem' }}>
            Acesse rapidamente as ferramentas mais utilizadas no dia a dia da gestão de contratos.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
              color: 'white', transition: 'var(--transition)', ':hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
            }}>
              <span style={{ fontWeight: '500' }}>Agendar Treinamento</span>
              <ArrowRight size={16} />
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
              color: 'white', transition: 'var(--transition)'
            }}>
              <span style={{ fontWeight: '500' }}>Emitir Relatório SST</span>
              <ArrowRight size={16} />
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
              color: 'white', transition: 'var(--transition)'
            }}>
              <span style={{ fontWeight: '500' }}>Revisar Vencimentos</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
