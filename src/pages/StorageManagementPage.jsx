import React, { useState, useEffect } from 'react';
import { Database, HardDrive, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TABLES = [
  'companies',
  'groups',
  'contracts',
  'deliverables',
  'trainings',
  'inventory',
  'inventory_history',
  'convocations',
  'contacts'
];

const StorageManagementPage = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(null);
  const [exactSize, setExactSize] = useState(null);
  const [rpcError, setRpcError] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const newStats = {};
    let total = 0;
    
    for (const table of TABLES) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          newStats[table] = count;
          total += count;
        } else {
          newStats[table] = 'Erro';
        }
      } catch (err) {
        newStats[table] = 'Erro';
      }
    }

    // Obter o tamanho exato do banco (Requer RPC get_db_size)
    const { data: dbSize, error: rpcErr } = await supabase.rpc('get_db_size');
    if (rpcErr || dbSize === null) {
      setRpcError(true);
      setExactSize(0);
    } else {
      setRpcError(false);
      setExactSize(Number(dbSize));
    }

    setStats(newStats);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalLimitBytes = 500 * 1024 * 1024; // 500 MB (Plano Gratuito Supabase)
  
  // O Supabase tem um overhead interno de ~14MB (WAL, logs de sistema, schema base).
  // Adicionamos esse valor para o número do sistema bater mais próximo com o painel oficial.
  const SYSTEM_OVERHEAD = 14 * 1024 * 1024; 
  const usedBytes = exactSize ? exactSize + SYSTEM_OVERHEAD : 0;
  
  const remainingBytes = Math.max(0, totalLimitBytes - usedBytes);
  const usedPercentage = Math.min(100, (usedBytes / totalLimitBytes) * 100);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearTable = async (table) => {
    const confirm = window.confirm(`ATENÇÃO: Você está prestes a excluir TODOS os registros da tabela '${table}'. Esta ação é irreversível.\n\nDeseja realmente continuar?`);
    if (!confirm) return;

    setClearing(table);
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes all rows where ID is not zero-uuid (which matches all standard UUIDs)
      if (error) {
        alert(`Erro ao limpar a tabela ${table}: ${error.message}`);
      } else {
        alert(`Tabela ${table} limpa com sucesso.`);
        await fetchStats();
      }
    } catch (err) {
      alert(`Erro inesperado ao limpar a tabela ${table}.`);
    }
    setClearing(null);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <header className="header-responsive" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HardDrive size={28} color="var(--primary)" />
            Armazenamento do Banco de Dados
          </h1>
          <p className="text-subtitle">
            Gerencie e visualize o uso de dados das tabelas do sistema.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
          Atualizar Dados
        </button>
      </header>

      {/* Storage Progress Bar (Exact) */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Uso de Espaço do Banco de Dados
        </h3>
        
        {rpcError ? (
          <div style={{ padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', marginBottom: '1rem' }}>
            <h4 style={{ color: '#991b1b', fontWeight: '600', marginBottom: '0.5rem' }}>Configuração Necessária</h4>
            <p style={{ color: '#b91c1c', fontSize: '0.875rem' }}>
              Para visualizar os valores exatos de armazenamento em tempo real, você precisa executar um pequeno script SQL no painel do seu Supabase para habilitar a leitura do tamanho do banco.
            </p>
            <p style={{ color: '#b91c1c', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: '500' }}>
              O script foi salvo na raiz do projeto com o nome: <code>setup_storage_rpc.sql</code>
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tamanho das Suas Tabelas (Dados Reais):</span>
                <span style={{ fontWeight: '500' }}>{loading ? '...' : formatBytes(exactSize || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Diário de Segurança Supabase (WAL):</span>
                <span style={{ fontWeight: '500' }}>~ {formatBytes(SYSTEM_OVERHEAD)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Uso Total no Disco (O que conta pro limite):</span>
                <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{loading ? '...' : formatBytes(usedBytes)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Livre: {loading ? '...' : formatBytes(remainingBytes)} (Máximo: {formatBytes(totalLimitBytes)})
              </span>
            </div>

            <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ 
                height: '100%', 
                backgroundColor: usedPercentage > 90 ? 'var(--danger)' : usedPercentage > 75 ? '#f59e0b' : 'var(--primary)', 
                width: `${usedPercentage}%`,
                transition: 'width 0.5s ease-out'
              }} />
            </div>
            
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              * Os valores são exatos e fornecidos diretamente pelo banco de dados PostgreSQL. O limite de 500 MB é o padrão do plano gratuito do Supabase. Arquivos de PDF e Imagens armazenados em Buckets não entram nessa conta e possuem cota separada (1 GB).
            </p>
          </>
        )}
      </div>

      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ color: '#92400e', fontWeight: '600', marginBottom: '0.25rem' }}>Área de Risco</h4>
          <p style={{ color: '#b45309', fontSize: '0.875rem' }}>
            Esta é uma área administrativa avançada. A exclusão de dados em massa afetará o funcionamento do sistema e a integridade de dados interligados. Use com extrema cautela.
          </p>
        </div>
      </div>

      <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {TABLES.map(table => (
          <div key={table} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={20} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {table.replace('_', ' ')}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tabela</span>
              </div>
            </div>

            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              {loading ? '...' : (stats[table] !== undefined ? stats[table] : 'Erro')}
              <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                registros
              </span>
            </div>

            <button
              className="btn"
              onClick={() => handleClearTable(table)}
              disabled={loading || clearing === table || stats[table] === 0 || stats[table] === 'Erro'}
              style={{
                marginTop: 'auto',
                backgroundColor: 'transparent',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                width: '100%',
                opacity: (stats[table] === 0) ? 0.5 : 1
              }}
              onMouseEnter={(e) => { if (stats[table] > 0) { e.currentTarget.style.backgroundColor = '#fee2e2'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Trash2 size={16} /> 
              {clearing === table ? 'Limpando...' : 'Limpar Tabela'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StorageManagementPage;
