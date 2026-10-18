import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, Loader2, Calendar, 
  CreditCard, Award, ArrowRight, ShieldCheck, 
  RefreshCw, Copy, Check, Search, UserCheck
} from 'lucide-react';
import { formatCpf, cleanCpf, searchCpfA } from '../services/cpfService';
import { getTrainingClasses, registerStudent } from '../services/trainingClassesService';

export default function PublicTrainingEnrollmentPage() {
  const { turmaId: paramTurmaId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTurmaId = searchParams.get('turma');
  const targetTurmaId = paramTurmaId || queryTurmaId;

  // Campos digitados pelo usuário
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Nome puxado da API após informar CPF e Data de Nascimento
  const [nome, setNome] = useState('');

  // Turma opcional
  const [activeTurma, setActiveTurma] = useState(null);

  // Estados de controle e feedback
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Carrega turma se o link tiver ID
  useEffect(() => {
    async function loadTurma() {
      if (targetTurmaId) {
        const list = await getTrainingClasses();
        const found = list.find(t => String(t.id) === String(targetTurmaId));
        if (found) setActiveTurma(found);
      }
    }
    loadTurma();
  }, [targetTurmaId]);

  const handleCpfChange = (e) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
    setErrorMsg('');
    // Se o usuário alterar o CPF após ter buscado, reseta a busca
    if (searched) {
      setSearched(false);
      setNome('');
    }
  };

  const handleBirthDateChange = (e) => {
    setBirthDate(e.target.value);
    setErrorMsg('');
    if (searched) {
      setSearched(false);
      setNome('');
    }
  };

  // Etapa 1: Busca o nome na API após CPF e Data de Nascimento estarem preenchidos
  const handleBuscarNome = async (e) => {
    if (e) e.preventDefault();

    const digits = cleanCpf(cpf);
    if (digits.length !== 11) {
      setErrorMsg('Informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!birthDate) {
      setErrorMsg('Informe sua data de nascimento.');
      return;
    }

    setSearching(true);
    setErrorMsg('');

    try {
      const res = await searchCpfA(digits);
      if (res.success && res.nome) {
        setNome(res.nome);
        setSearched(true);
      } else {
        setErrorMsg(res.error || 'Não foi possível localizar os dados na Receita Federal.');
        setSearched(false);
        setNome('');
      }
    } catch (err) {
      console.error('Erro na consulta:', err);
      setErrorMsg('Erro ao conectar ao serviço de busca da Receita Federal.');
      setSearched(false);
    } finally {
      setSearching(false);
    }
  };

  // Etapa 2: Confirma e envia para o sistema
  const handleConfirmarEnvio = async () => {
    if (!nome) {
      setErrorMsg('Busque o nome primeiro antes de enviar.');
      return;
    }

    const digits = cleanCpf(cpf);
    setSubmitting(true);
    setErrorMsg('');

    try {
      const protocolNumber = `TRN-${Date.now().toString().slice(-6)}`;
      const result = await registerStudent({
        turma_id: targetTurmaId || null,
        nome: nome.trim(),
        cpf: formatCpf(digits),
        data_nascimento: birthDate,
        empresa: activeTurma?.company || null,
        status: 'Inscrito'
      });

      setSuccessData({
        ...result,
        protocol: protocolNumber,
        turmaNome: activeTurma?.course_name || activeTurma?.name || 'Treinamento TotalSafety'
      });
    } catch (err) {
      console.error('Erro ao enviar:', err);
      setErrorMsg('Erro ao registrar no sistema. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyProtocol = () => {
    if (!successData?.protocol) return;
    navigator.clipboard.writeText(successData.protocol);
    setCopiedProtocol(true);
    setTimeout(() => setCopiedProtocol(false), 2500);
  };

  const canSearch = cleanCpf(cpf).length === 11 && Boolean(birthDate) && !searching;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.45) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(13, 148, 136, 0.3) 0px, transparent 50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#f8fafc'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '1.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        overflow: 'hidden'
      }}>
        
        {/* Cabeçalho */}
        <div style={{
          padding: '2rem 2rem 1.5rem',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%)',
          borderBottom: '1px solid #334155',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <img 
              src="/logo-totalsafety.png" 
              alt="TotalSafety" 
              style={{ maxHeight: '38px', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span style={{ 
              backgroundColor: '#0284c7', 
              color: '#ffffff', 
              fontSize: '0.72rem', 
              fontWeight: '700', 
              padding: '0.25rem 0.65rem', 
              borderRadius: '9999px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Lista de Presença
            </span>
          </div>

          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Inscrição no Treinamento
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.4rem', marginBottom: 0 }}>
            Coloque seu CPF e Data de Nascimento para buscar seu nome oficial na Receita Federal.
          </p>

          {activeTurma && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textAlign: 'left'
            }}>
              <Award size={22} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.72rem', color: '#7dd3fc', fontWeight: '700', textTransform: 'uppercase' }}>
                  Turma
                </div>
                <div style={{ fontSize: '0.95rem', color: '#f0f9ff', fontWeight: '700' }}>
                  {activeTurma.course_name || activeTurma.name}
                </div>
                {activeTurma.company && (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Empresa: {activeTurma.company} {activeTurma.start_date ? `• Data: ${new Date(activeTurma.start_date).toLocaleDateString('pt-BR')}` : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Corpo */}
        <div style={{ padding: '2rem' }}>
          {successData ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.4rem' }}>
                Inscrição Confirmada!
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                Seus dados foram enviados com sucesso para a lista de presença do setor de treinamento.
              </p>

              {/* Comprovante */}
              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '0.85rem',
                padding: '1.25rem',
                textAlign: 'left',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Protocolo</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <code style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700' }}>{successData.protocol}</code>
                    <button
                      type="button"
                      onClick={handleCopyProtocol}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedProtocol ? '#10b981' : '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Copiar Protocolo"
                    >
                      {copiedProtocol ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Nome Completo: </span>
                    <strong style={{ color: '#f8fafc' }}>{successData.nome}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>CPF: </span>
                    <strong style={{ color: '#f8fafc' }}>{successData.cpf}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Data de Nascimento: </span>
                    <strong style={{ color: '#f8fafc' }}>
                      {successData.data_nascimento ? new Date(successData.data_nascimento).toLocaleDateString('pt-BR') : '-'}
                    </strong>
                  </div>
                  {successData.turmaNome && (
                    <div>
                      <span style={{ color: '#64748b' }}>Treinamento: </span>
                      <strong style={{ color: '#38bdf8' }}>{successData.turmaNome}</strong>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuccessData(null);
                  setCpf('');
                  setBirthDate('');
                  setNome('');
                  setSearched(false);
                }}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.65rem',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <RefreshCw size={15} />
                Realizar Nova Inscrição
              </button>
            </div>
          ) : (
            <form onSubmit={handleBuscarNome} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* CAMPO 1: CPF */}
              <div>
                <label htmlFor="cpf-input" style={{ fontSize: '0.875rem', fontWeight: '700', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <CreditCard size={16} style={{ color: '#38bdf8' }} />
                  CPF *
                </label>

                <input
                  id="cpf-input"
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem',
                    backgroundColor: '#0f172a',
                    border: `1.5px solid ${searched ? '#10b981' : '#334155'}`,
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '1.1rem',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none',
                    letterSpacing: '0.05em'
                  }}
                />
              </div>

              {/* CAMPO 2: DATA DE NASCIMENTO */}
              <div>
                <label htmlFor="birthdate-input" style={{ fontSize: '0.875rem', fontWeight: '700', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                  <Calendar size={16} style={{ color: '#38bdf8' }} />
                  Data de Nascimento *
                </label>
                <input
                  id="birthdate-input"
                  type="date"
                  value={birthDate}
                  onChange={handleBirthDateChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem',
                    backgroundColor: '#0f172a',
                    border: '1.5px solid #334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {errorMsg && (
                <div style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={14} />
                  {errorMsg}
                </div>
              )}

              {/* RESULTADO DA BUSCA: Nome Encontrado */}
              {searched && nome && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={18} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.72rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}>
                      Nome Identificado (Receita Federal)
                    </span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff' }}>
                    {nome}
                  </div>
                  {nome === 'Test Token' && (
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', opacity: 0.8 }}>
                      * Retorno da API com token de testes oficial. Em produção com seu token retornará o nome real do titular.
                    </div>
                  )}
                </div>
              )}

              {/* BOTÕES DE AÇÃO: Buscar Nome ou Confirmar Envio */}
              {!searched ? (
                <button
                  type="submit"
                  disabled={!canSearch}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.95rem 1.5rem',
                    backgroundColor: !canSearch ? '#334155' : '#0284c7',
                    backgroundImage: !canSearch ? 'none' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: !canSearch ? '#94a3b8' : '#ffffff',
                    border: 'none',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: !canSearch ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: !canSearch ? 'none' : '0 10px 15px -3px rgba(2, 132, 199, 0.4)',
                    transition: 'all 0.15s'
                  }}
                >
                  {searching ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Consultando Receita Federal...
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      Buscar Nome
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmarEnvio}
                  disabled={submitting}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.95rem 1.5rem',
                    backgroundColor: '#10b981',
                    backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando para o Sistema...
                    </>
                  ) : (
                    <>
                      Confirmar e Enviar para o Sistema
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              )}

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.4rem', 
                fontSize: '0.75rem', 
                color: '#64748b', 
                marginTop: '0.25rem' 
              }}>
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                Consulta oficial de CPF A em tempo real (Receita Federal)
              </div>

            </form>
          )}
        </div>

        {/* Rodapé */}
        <div style={{
          padding: '1rem 2rem',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          TotalSafety Treinamentos © {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
}
