import React from 'react';

const ScheduleGeneratorPage = () => {
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 className="page-title">Gerador de Cronograma</h1>
        <p className="page-subtitle">Análise de contratos e geração de cronogramas com Inteligência Artificial.</p>
      </div>
      
      <div style={{ 
        flex: 1, 
        backgroundColor: 'var(--surface)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '600px'
      }}>
        <iframe 
          src="http://localhost:3000" 
          title="Gerador de Cronograma"
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Nota: Esta ferramenta requer que o servidor do "Gerador de Cronograma" esteja em execução localmente (porta 3000).
      </div>
    </div>
  );
};

export default ScheduleGeneratorPage;
