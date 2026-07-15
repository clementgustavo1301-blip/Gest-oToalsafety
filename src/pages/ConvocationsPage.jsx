import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Save, AlertCircle, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';

const MONTHS = [
  { key: 'jan', label: 'Jan' },
  { key: 'feb', label: 'Fev' },
  { key: 'mar', label: 'Mar' },
  { key: 'apr', label: 'Abr' },
  { key: 'may', label: 'Mai' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Ago' },
  { key: 'sep', label: 'Set' },
  { key: 'oct', label: 'Out' },
  { key: 'nov', label: 'Nov' },
  { key: 'dec', label: 'Dez' }
];

const ConvocationsPage = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [convocations, setConvocations] = useState({});
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch convocations for the selected year
      const { data: convData, error: convError } = await supabase
        .from('convocations')
        .select('*')
        .eq('year', year);

      if (convError && convError.code !== '42P01') { 
        // Ignore table doesn't exist error for now if it happens during dev
        throw convError;
      }

      const convMap = {};
      if (convData) {
        convData.forEach(c => {
          convMap[c.company_id] = c;
        });
      }
      setConvocations(convMap);

    } catch (err) {
      console.error('Error fetching data:', err);
      // We don't want to break the UI if the table isn't created yet
      if (err.code === '42P01') {
         setError('A tabela "convocations" não existe no banco de dados. Execute o script SQL no painel do Supabase para criá-la.');
      } else {
         setError('Erro ao carregar dados: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMonth = async (companyId, monthKey) => {
    try {
      setSaving(true);
      
      const currentRecord = convocations[companyId] || { 
        company_id: companyId, 
        year, 
        jan: false, feb: false, mar: false, apr: false, may: false, jun: false, 
        jul: false, aug: false, sep: false, oct: false, nov: false, dec: false 
      };
      
      const newValue = !currentRecord[monthKey];
      const updatedRecord = { ...currentRecord, [monthKey]: newValue };

      // Optimistic UI update
      setConvocations(prev => ({ ...prev, [companyId]: updatedRecord }));

      // Upsert into Supabase
      const { data, error } = await supabase
        .from('convocations')
        .upsert(updatedRecord, { onConflict: 'company_id,year' })
        .select()
        .single();

      if (error) throw error;
      
      // Update with confirmed data from server
      setConvocations(prev => ({ ...prev, [companyId]: data }));
      
    } catch (err) {
      console.error('Error saving convocation:', err);
      setError('Erro ao salvar alteração: ' + err.message);
      // Revert UI on error
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-secondary">Carregando convocações...</p>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Convocações</h1>
          <p className="page-description">Controle mensal de convocações por empresa</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setYear(y => y - 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <ChevronLeft size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.125rem' }}>
            <CalendarIcon size={18} className="text-primary" />
            {year}
          </div>
          
          <button 
            onClick={() => setYear(y => y + 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--secondary-light)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', width: '300px', position: 'sticky', left: 0, backgroundColor: 'var(--secondary-light)', zIndex: 10 }}>Empresa</th>
                {MONTHS.map(month => (
                  <th key={month.key} style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {month.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map(company => {
                const record = convocations[company.id] || {};
                
                return (
                  <tr key={company.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }} className="table-row-hover">
                    <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-primary)', position: 'sticky', left: 0, backgroundColor: 'var(--surface)', zIndex: 5, borderRight: '1px solid var(--border)' }}>
                      {company.name}
                    </td>
                    
                    {MONTHS.map(month => {
                      const isDone = !!record[month.key];
                      
                      return (
                        <td key={month.key} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleToggleMonth(company.id, month.key)}
                            disabled={saving}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: 'var(--radius-md)',
                              border: isDone ? 'none' : '1px solid var(--border)',
                              backgroundColor: isDone ? 'var(--success)' : 'transparent',
                              color: isDone ? 'white' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: saving ? 'wait' : 'pointer',
                              margin: '0 auto',
                              transition: 'all 0.2s',
                              opacity: saving ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!isDone && !saving) {
                                e.currentTarget.style.backgroundColor = 'var(--secondary-light)';
                                e.currentTarget.style.color = 'var(--text-muted)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isDone && !saving) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'transparent';
                              }
                            }}
                          >
                            <Check size={20} strokeWidth={3} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              
              {companies.length === 0 && (
                <tr>
                  <td colSpan={13} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConvocationsPage;
