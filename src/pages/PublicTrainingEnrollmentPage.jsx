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

  // Campos digitados pelo participante: CPF e Data de Nascimento
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Nome puxado da API após informar CPF e Data de Nascimento
  const [nome, setNome] = useState('');

  // Informações da turma se vinculada
  const [activeTurma, setActiveTurma] = useState(null);

  // Estados de controle
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

  // Etapa 1: Busca o nome na API após preencher CPF e Data de Nascimento
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
        setErrorMsg(res.error || 'Não foi possível localizar os dados do titular. Verifique os números informados.');
        setSearched(false);
        setNome('');
      }
    } catch (err) {
      console.error('Erro na consulta:', err);
      setErrorMsg('Erro ao conectar ao serviço de consulta de CPF.');
      setSearched(false);
    } finally {
      setSearching(false);
    }
  };

  // Etapa 2: Confirma e envia para a lista de participação do sistema
  const handleConfirmarEnvio = async () => {
    if (!nome) {
      setErrorMsg('Busque o nome antes de confirmar.');
      return;
    }

    const digits = cleanCpf(cpf);
    setSubmitting(true);
    setErrorMsg('');

    try {
      const protocolNumber = `PART-${Date.now().toString().slice(-6)}`;
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
        turmaNome: activeTurma?.course_name || activeTurma?.name || 'Treinamento'
      });
    } catch (err) {
      console.error('Erro ao enviar:', err);
      setErrorMsg('Erro ao registrar participação no sistema. Tente novamente.');
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
      backgroundColor: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#0f172a'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        
        {/* Cabeçalho Institucional Simples */}
        <div style={{
          padding: '1.75rem 1.75rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff'
        }}>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#0f172a', 
            margin: 0,
            lineHeight: '1.3'
          }}>
            Formulário de Participação
          </h1>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#64748b', 
            marginTop: '0.35rem', 
            marginBottom: 0,
            lineHeight: '1.4'
          }}>
            Preencha seu CPF e data de nascimento para registrar sua presença no treinamento.
          </p>

          {activeTurma && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                Treinamento:
              </div>
              <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', marginTop: '2px' }}>
                {activeTurma.course_name || activeTurma.name}
              </div>
              {activeTurma.company && (
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  Empresa: {activeTurma.company}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Corpo do Formulário */}
        <div style={{ padding: '1.75rem' }}>
          {successData ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <CheckCircle2 size={28} />
              </div>

              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.35rem' }}>
                Participação Registrada
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Seus dados foram enviados com sucesso para a lista de presença.
              </p>

              {/* Tabela de Comprovante */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '1rem',
                textAlign: 'left',
                marginBottom: '1.25rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Protocolo:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{successData.protocol}</strong>
                    <button
                      type="button"
                      onClick={handleCopyProtocol}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: copiedProtocol ? '#16a34a' : '#64748b' }}
                      title="Copiar"
                    >
                      {copiedProtocol ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Participante: </span>
                    <strong style={{ color: '#0f172a' }}>{successData.nome}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>CPF: </span>
                    <strong style={{ color: '#0f172a' }}>{successData.cpf}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Data de Nascimento: </span>
                    <strong style={{ color: '#0f172a' }}>
                      {successData.data_nascimento ? new Date(successData.data_nascimento).toLocaleDateString('pt-BR') : '-'}
                    </strong>
                  </div>
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
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <RefreshCw size={14} />
                Novo Registro
              </button>
            </div>
          ) : (
            <form onSubmit={handleBuscarNome} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* CAMPO 1: CPF */}
              <div>
                <label htmlFor="cpf-input" style={{ 
                  display: 'block',
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: '#334155',
                  marginBottom: '0.35rem' 
                }}>
                  CPF
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
                    padding: '0.75rem 0.85rem',
                    backgroundColor: '#ffffff',
                    border: `1px solid ${searched ? '#16a34a' : '#cbd5e1'}`,
                    borderRadius: '6px',
                    color: '#0f172a',
                    fontSize: '1rem',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* CAMPO 2: DATA DE NASCIMENTO */}
              <div>
                <label htmlFor="birthdate-input" style={{ 
                  display: 'block',
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: '#334155',
                  marginBottom: '0.35rem' 
                }}>
                  Data de Nascimento
                </label>
                <input
                  id="birthdate-input"
                  type="date"
                  value={birthDate}
                  onChange={handleBirthDateChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.85rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#0f172a',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {errorMsg && (
                <div style={{ 
                  padding: '0.65rem 0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* NOME ENCONTRADO PELA API */}
              {searched && nome && (
                <div style={{
                  padding: '0.85rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
                    Nome Identificado:
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                    {nome}
                  </div>
                  {nome === 'Test Token' && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                      (Retorno fictício do token de testes)
                    </div>
                  )}
                </div>
              )}

              {/* BOTÕES DE AÇÃO */}
              {!searched ? (
                <button
                  type="submit"
                  disabled={!canSearch}
                  style={{
                    marginTop: '0.25rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: canSearch ? '#0284c7' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.925rem',
                    fontWeight: '600',
                    cursor: canSearch ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'background-color 0.15s'
                  }}
                >
                  {searching ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
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
                    marginTop: '0.25rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.925rem',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Confirmar Participação
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}

            </form>
          )}
        </div>

        {/* Rodapé Simples */}
        <div style={{
          padding: '0.75rem 1.75rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          Registro de Presença • Dados protegidos
        </div>

      </div>
    </div>
  );
}
