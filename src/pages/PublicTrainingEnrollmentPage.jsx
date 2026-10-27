import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, Loader2, ArrowRight,
  RefreshCw, Copy, Check, Search, Calendar, Clock,
  Building, User, ChevronDown
} from 'lucide-react';
import { formatCpf, cleanCpf, searchCpfA } from '../services/cpfService';
import { getTrainingClasses, getTrainingClassById, registerStudent } from '../services/trainingClassesService';

export default function PublicTrainingEnrollmentPage() {
  const { turmaId: paramTurmaId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTurmaId = searchParams.get('turma');
  const targetTurmaId = paramTurmaId || queryTurmaId;

  // Lista de turmas abertas disponíveis para escolha
  const [openTurmas, setOpenTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [activeTurma, setActiveTurma] = useState(null);

  // Campos do formulário
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [isManualNome, setIsManualNome] = useState(false);

  // Estados de controle e feedback
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Carrega as turmas abertas e a turma do link (se houver)
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setGeneralError('');

      try {
        const allClasses = await getTrainingClasses();
        if (cancelled) return;

        // Filtra apenas as turmas ABERTAS
        const abertas = (allClasses || []).filter(t => {
          const st = String(t.status || 'Aberta').trim().toLowerCase();
          return st === 'aberta';
        });

        setOpenTurmas(abertas);

        if (targetTurmaId) {
          // Link específico de turma
          let target = abertas.find(t => String(t.id) === String(targetTurmaId));
          if (!target) {
            try {
              target = await getTrainingClassById(targetTurmaId);
            } catch (e) {
              console.warn('Erro ao carregar turma por ID:', e);
            }
          }

          if (cancelled) return;

          if (target) {
            const isAberta = String(target.status || 'Aberta').trim().toLowerCase() === 'aberta';
            if (!isAberta) {
              setGeneralError(`Esta turma não está com inscrições abertas (Status: ${target.status || 'Concluída'}).`);
            } else {
              setActiveTurma(target);
              setSelectedTurmaId(String(target.id));
            }
          } else {
            setGeneralError('A turma informada no link não foi encontrada.');
          }
        } else {
          // Link Geral (/inscricao)
          if (abertas.length === 1) {
            // Se só tiver uma aberta, já pré-seleciona
            setActiveTurma(abertas[0]);
            setSelectedTurmaId(String(abertas[0].id));
          } else {
            setActiveTurma(null);
            setSelectedTurmaId('');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao inicializar página de inscrição:', err);
          setGeneralError('Não foi possível carregar as turmas disponíveis.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [targetTurmaId]);

  // Troca de turma pelo dropdown
  const handleTurmaSelectChange = (e) => {
    const id = e.target.value;
    setSelectedTurmaId(id);
    setErrorMsg('');
    if (!id) {
      setActiveTurma(null);
      return;
    }
    const found = openTurmas.find(t => String(t.id) === String(id));
    setActiveTurma(found || null);
  };

  const handleCpfChange = (e) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
    setErrorMsg('');
    if (searched && !isManualNome) {
      setSearched(false);
      setNome('');
    }
  };

  const handleBirthDateChange = (e) => {
    setBirthDate(e.target.value);
    setErrorMsg('');
    if (searched && !isManualNome) {
      setSearched(false);
      setNome('');
    }
  };

  // Etapa 1: Busca o nome a partir do CPF e Data de Nascimento
  const handleBuscarNome = async (e) => {
    if (e) e.preventDefault();

    if (!activeTurma) {
      setErrorMsg('Selecione a turma antes de continuar.');
      return;
    }

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
        setIsManualNome(false);
      } else {
        setErrorMsg(res.error || 'Nome não localizado automaticamente. Você pode preenchê-lo abaixo.');
        setSearched(true);
        setIsManualNome(true);
      }
    } catch (err) {
      console.error('Erro na consulta:', err);
      setErrorMsg('Não foi possível consultar os dados automaticamente. Preencha seu nome abaixo.');
      setSearched(true);
      setIsManualNome(true);
    } finally {
      setSearching(false);
    }
  };

  // Etapa 2: Confirma e salva o registro
  const handleConfirmarEnvio = async () => {
    if (!activeTurma?.id) {
      setErrorMsg('Selecione uma turma válida para realizar a inscrição.');
      return;
    }

    if (!nome.trim()) {
      setErrorMsg('Informe o nome do participante antes de confirmar.');
      return;
    }

    const digits = cleanCpf(cpf);
    setSubmitting(true);
    setErrorMsg('');

    try {
      const protocolNumber = `PART-${Date.now().toString().slice(-6)}`;
      const result = await registerStudent({
        turma_id: activeTurma.id,
        nome: nome.trim(),
        cpf: formatCpf(digits),
        matricula: matricula.trim() || null,
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
      console.error('Erro ao enviar inscrição:', err);
      setErrorMsg(err.message || 'Erro ao registrar participação. Tente novamente.');
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

  const canSearch = Boolean(activeTurma) && cleanCpf(cpf).length === 11 && Boolean(birthDate) && !searching;

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
        maxWidth: '520px',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        
        {/* Cabeçalho */}
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
            Preencha seus dados para registrar sua presença no treinamento.
          </p>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '1.75rem' }}>
          {loading ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: '#0284c7' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Carregando turmas disponíveis...</p>
            </div>
          ) : successData ? (
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
                {successData.already_registered ? 'Presença já registrada' : 'Participação registrada'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {successData.already_registered
                  ? 'Seu CPF já constava na lista de presença desta turma.'
                  : 'Seu nome já foi incluído na lista de presença desta turma.'}
              </p>

              {/* Comprovante */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
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
                    <span style={{ color: '#64748b' }}>Turma: </span>
                    <strong style={{ color: '#0f172a' }}>{successData.turmaNome}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Participante: </span>
                    <strong style={{ color: '#0f172a' }}>{successData.nome}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>CPF: </span>
                    <strong style={{ color: '#0f172a' }}>{successData.cpf}</strong>
                  </div>
                  {successData.matricula && (
                    <div>
                      <span style={{ color: '#64748b' }}>Matrícula: </span>
                      <strong style={{ color: '#0f172a' }}>{successData.matricula}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: '#64748b' }}>Data de Nascimento: </span>
                    <strong style={{ color: '#0f172a' }}>
                      {successData.data_nascimento ? new Date(`${successData.data_nascimento}T12:00:00`).toLocaleDateString('pt-BR') : '-'}
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
                  setMatricula('');
                  setNome('');
                  setSearched(false);
                  setIsManualNome(false);
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
            <div>
              {/* Alerta Geral se turma informada for inválida ou não encontrada */}
              {generalError && (
                <div style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{generalError}</span>
                </div>
              )}

              {/* Se não houver turmas abertas */}
              {openTurmas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <Calendar size={24} />
                  </div>
                  <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.45rem', color: '#0f172a', fontWeight: '700' }}>
                    Nenhuma turma aberta no momento
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    No momento não há turmas com inscrições abertas. Caso precise de assistência, entre em contato com a equipe organizadora.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleBuscarNome} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  
                  {/* SELEÇÃO DE TURMA: Mostra apenas as turmas ABERTAS */}
                  <div>
                    <label htmlFor="turma-select" style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      color: '#1e293b',
                      marginBottom: '0.4rem'
                    }}>
                      Selecione a Turma *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        id="turma-select"
                        value={selectedTurmaId}
                        onChange={handleTurmaSelectChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.2rem 0.75rem 0.85rem',
                          backgroundColor: '#ffffff',
                          border: `1px solid ${!selectedTurmaId ? '#0284c7' : '#cbd5e1'}`,
                          borderRadius: '6px',
                          color: selectedTurmaId ? '#0f172a' : '#64748b',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box',
                          outline: 'none',
                          appearance: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Selecione qual turma deseja participar --</option>
                        {openTurmas.map(t => {
                          const dateStr = t.start_date ? new Date(t.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                          const durationStr = t.duration || t.duracao || '';
                          const extra = [dateStr, durationStr].filter(Boolean).join(' • ');
                          const label = `${t.name ? `${t.name} — ` : ''}${t.course_name || t.curso || 'Treinamento'}${extra ? ` (${extra})` : ''}`;
                          return (
                            <option key={t.id} value={t.id}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown size={16} style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#64748b'
                      }} />
                    </div>
                  </div>

                  {/* CARTÃO DETALHADO DA TURMA SELECIONADA */}
                  {activeTurma && (
                    <div style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Turma Selecionada
                      </div>
                      <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '700', marginTop: '2px' }}>
                        {activeTurma.name ? `${activeTurma.name}: ` : ''}{activeTurma.course_name || activeTurma.curso || activeTurma.name}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.45rem', fontSize: '0.78rem', color: '#475569' }}>
                        {activeTurma.start_date && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={13} style={{ color: '#64748b' }} />
                            {new Date(activeTurma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {(activeTurma.duration || activeTurma.duracao) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={13} style={{ color: '#64748b' }} />
                            {activeTurma.duration || activeTurma.duracao}
                          </span>
                        )}
                        {activeTurma.company && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Building size={13} style={{ color: '#64748b' }} />
                            {activeTurma.company}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CAMPO 1: CPF */}
                  <div>
                    <label htmlFor="cpf-input" style={{ 
                      display: 'block',
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: '#334155',
                      marginBottom: '0.35rem' 
                    }}>
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

                  {/* CAMPO 3: MATRÍCULA (OPCIONAL) */}
                  <div>
                    <label htmlFor="matricula-input" style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: '#334155',
                      marginBottom: '0.35rem' 
                    }}>
                      <span>Matrícula</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#64748b' }}>Opcional</span>
                    </label>
                    <input
                      id="matricula-input"
                      type="text"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      placeholder="Número de matrícula (opcional)"
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

                  {/* NOME ENCONTRADO OU DIGITADO */}
                  {searched && (
                    <div>
                      <label htmlFor="nome-input" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#334155',
                        marginBottom: '0.35rem'
                      }}>
                        <span>Nome Completo do Participante *</span>
                        {nome && !isManualNome && (
                          <button
                            type="button"
                            onClick={() => setIsManualNome(true)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0284c7',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline'
                            }}
                          >
                            Corrigir nome
                          </button>
                        )}
                      </label>
                      <input
                        id="nome-input"
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Nome completo do participante"
                        required
                        disabled={!isManualNome}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.85rem',
                          backgroundColor: isManualNome ? '#ffffff' : '#f0fdf4',
                          border: `1px solid ${isManualNome ? '#cbd5e1' : '#bbf7d0'}`,
                          borderRadius: '6px',
                          color: '#0f172a',
                          fontSize: '1rem',
                          fontWeight: '600',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                      />
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
                          Continuar
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmarEnvio}
                      disabled={submitting || !nome.trim()}
                      style={{
                        marginTop: '0.25rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: submitting || !nome.trim() ? '#94a3b8' : '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.925rem',
                        fontWeight: '600',
                        cursor: submitting || !nome.trim() ? 'not-allowed' : 'pointer',
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
          )}
        </div>

        {/* Rodapé */}
        <div style={{
          padding: '0.75rem 1.75rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          Registro de Presença • TotalSafety
        </div>

      </div>
    </div>
  );
}
