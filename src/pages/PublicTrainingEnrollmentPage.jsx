import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, Loader2, ArrowRight,
  RefreshCw, Copy, Check, Search, Calendar, Clock,
  Building, User, ChevronDown, Lock, BookOpen, FileX
} from 'lucide-react';
import { formatCpf, cleanCpf, searchCpfA } from '../services/cpfService';
import { getTrainingClasses, getTrainingClassById, registerStudent } from '../services/trainingClassesService';

/**
 * Verifica se a turma está com status "Aberta"
 */
const isTurmaAberta = (t) => {
  if (!t) return false;
  const st = String(t.status || 'Aberta').trim().toLowerCase();
  return st === 'aberta';
};

export default function PublicTrainingEnrollmentPage() {
  const { turmaId: paramTurmaId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTurmaId = searchParams.get('turma');
  const targetTurmaId = paramTurmaId || queryTurmaId;
  const isIndividualLink = Boolean(targetTurmaId);

  // Lista de turmas abertas disponíveis para escolha no link geral
  const [openTurmas, setOpenTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [activeTurma, setActiveTurma] = useState(null);

  // Estados de validação para link individual
  const [turmaNotFound, setTurmaNotFound] = useState(false);
  const [turmaClosed, setTurmaClosed] = useState(false);

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
      setTurmaNotFound(false);
      setTurmaClosed(false);
      setErrorMsg('');

      try {
        const allClasses = await getTrainingClasses();
        if (cancelled) return;

        // Filtra estritamente apenas as turmas ABERTAS
        const abertas = (allClasses || []).filter(isTurmaAberta);
        setOpenTurmas(abertas);

        if (isIndividualLink) {
          // Link específico de turma: busca diretamente a turma informada
          let target = (allClasses || []).find(t => String(t.id) === String(targetTurmaId));
          if (!target) {
            try {
              target = await getTrainingClassById(targetTurmaId);
            } catch (e) {
              console.warn('Erro ao carregar turma por ID:', e);
            }
          }

          if (cancelled) return;

          if (!target) {
            // Turma inexistente
            setTurmaNotFound(true);
            setActiveTurma(null);
            setSelectedTurmaId('');
          } else if (!isTurmaAberta(target)) {
            // Turma existe mas NÃO está aberta (ex: Concluída, Em Andamento, etc.)
            setTurmaClosed(true);
            setActiveTurma(target);
            setSelectedTurmaId(String(target.id));
          } else {
            // Turma encontrada e ABERTA: bloqueia formulário exclusivamente nela
            setActiveTurma(target);
            setSelectedTurmaId(String(target.id));
          }
        } else {
          // Link Geral (/inscricao):
          // Exibe seleção somente das turmas abertas
          if (abertas.length === 1) {
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
          setGeneralError('Não foi possível carregar as informações do treinamento. Tente novamente mais tarde.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [targetTurmaId, isIndividualLink]);

  // Troca de turma no Link Geral (somente permitido se NÃO for link individual)
  const handleTurmaSelectChange = (e) => {
    if (isIndividualLink) return;
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
      setErrorMsg(isIndividualLink ? 'Turma inválida para inscrição.' : 'Selecione a turma antes de continuar.');
      return;
    }

    if (!isTurmaAberta(activeTurma)) {
      setErrorMsg('Esta turma não está com inscrições abertas.');
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
      setErrorMsg('Nenhuma turma válida selecionada.');
      return;
    }

    if (!isTurmaAberta(activeTurma)) {
      setErrorMsg('Esta turma não está mais com inscrições abertas.');
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

  const canSearch = Boolean(activeTurma) && isTurmaAberta(activeTurma) && cleanCpf(cpf).length === 11 && Boolean(birthDate) && !searching;

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
      color: '#0f172a',
      colorScheme: 'light'
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
            {isIndividualLink ? 'Inscrição no Treinamento' : 'Formulário de Participação'}
          </h1>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#64748b', 
            marginTop: '0.35rem', 
            marginBottom: 0,
            lineHeight: '1.4'
          }}>
            {isIndividualLink 
              ? 'Preencha seus dados para confirmar sua presença nesta turma.'
              : 'Selecione a turma e preencha seus dados para registrar sua presença.'}
          </p>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '1.75rem' }}>
          {loading ? (
            <div style={{ padding: '2.5rem 0', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: '#0284c7' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                {isIndividualLink ? 'Carregando dados da turma...' : 'Carregando turmas disponíveis...'}
              </p>
            </div>
          ) : successData ? (
            /* Tela de Sucesso */
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
                  : 'Seu nome já foi incluído na lista de presença com sucesso.'}
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
                      title="Copiar protocolo"
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
                  setErrorMsg('');
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
          ) : isIndividualLink && turmaNotFound ? (
            /* Caso 1 de Link Individual: Turma Não Encontrada */
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <FileX size={26} />
              </div>

              <h2 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem', color: '#0f172a', fontWeight: '700' }}>
                Turma não encontrada
              </h2>

              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: '0 auto 1.25rem', maxWidth: '380px' }}>
                O endereço informado não corresponde a nenhuma turma ativa no sistema. O link pode estar incorreto ou a turma foi removida.
              </p>

              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.75rem',
                fontSize: '0.8rem',
                color: '#64748b'
              }}>
                Solicite o link atualizado ao instrutor ou organizador do treinamento.
              </div>
            </div>
          ) : isIndividualLink && turmaClosed ? (
            /* Caso 2 de Link Individual: Turma Encerrada/Não Aberta */
            <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <Lock size={26} />
              </div>

              <span style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#92400e',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                padding: '3px 10px',
                borderRadius: '9999px',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Inscrições Encerradas ({activeTurma?.status || 'Concluída'})
              </span>

              <h2 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem', color: '#0f172a', fontWeight: '700' }}>
                Esta turma não está mais aberta
              </h2>

              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: '0 auto 1.25rem', maxWidth: '400px' }}>
                As inscrições para <strong>{activeTurma?.course_name || activeTurma?.curso || activeTurma?.name || 'este treinamento'}</strong> foram encerradas e não estão mais aceitando novas participações.
              </p>

              {activeTurma && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.825rem',
                  color: '#475569',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Curso: </span>
                    <strong style={{ color: '#0f172a' }}>{activeTurma.course_name || activeTurma.name}</strong>
                  </div>
                  {activeTurma.start_date && (
                    <div>
                      <span style={{ color: '#64748b' }}>Data: </span>
                      <strong style={{ color: '#0f172a' }}>
                        {new Date(activeTurma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </strong>
                    </div>
                  )}
                  {(activeTurma.company || activeTurma.empresa) && (
                    <div>
                      <span style={{ color: '#64748b' }}>Empresa: </span>
                      <strong style={{ color: '#0f172a' }}>{activeTurma.company || activeTurma.empresa}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: '#64748b' }}>Status da Turma: </span>
                    <strong style={{ color: '#d97706' }}>{activeTurma.status || 'Concluída'}</strong>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Caso precise registrar sua presença ou tenha dúvidas, contate o instrutor ou a equipe responsável.
              </p>
            </div>
          ) : !isIndividualLink && openTurmas.length === 0 ? (
            /* Link Geral sem nenhuma turma aberta */
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
                No momento não há turmas com inscrições abertas para seleção geral. Caso precise de assistência, entre em contato com a equipe organizadora.
              </p>
            </div>
          ) : (
            /* Formulário de Inscrição Ativo */
            <div>
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

              <form onSubmit={handleBuscarNome} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                
                {/* 1. SELEÇÃO DE TURMA: EXIBIDA SOMENTE NO LINK GERAL */}
                {!isIndividualLink ? (
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
                          WebkitTextFillColor: selectedTurmaId ? '#0f172a' : '#64748b',
                          colorScheme: 'light',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box',
                          outline: 'none',
                          appearance: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Selecione uma turma aberta ({openTurmas.length} disponíveis) --</option>
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

                    {/* CARTÃO DETALHADO DA TURMA SELECIONADA NO LINK GERAL */}
                    {activeTurma && (
                      <div style={{
                        marginTop: '0.75rem',
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
                  </div>
                ) : (
                  /* 2. LINK INDIVIDUAL: TURMA VINCULADA FIXA (SEM DROPDOWN) */
                  activeTurma && (
                    <div style={{
                      padding: '1rem 1.15rem',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      position: 'relative'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.4rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          color: '#0284c7',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <BookOpen size={14} />
                          Turma Vinculada
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: '#0369a1',
                          backgroundColor: '#e0f2fe',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Lock size={11} />
                          Link exclusivo
                        </span>
                      </div>

                      <div style={{
                        fontSize: '1.05rem',
                        fontWeight: '700',
                        color: '#0f172a',
                        lineHeight: '1.3'
                      }}>
                        {activeTurma.course_name || activeTurma.curso || activeTurma.name || 'Treinamento'}
                      </div>

                      {activeTurma.name && activeTurma.course_name && activeTurma.name !== activeTurma.course_name && (
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px', fontWeight: '500' }}>
                          Identificação: {activeTurma.name}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.65rem',
                        marginTop: '0.55rem',
                        fontSize: '0.78rem',
                        color: '#334155'
                      }}>
                        {activeTurma.start_date && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={13} style={{ color: '#0284c7' }} />
                            {new Date(activeTurma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {(activeTurma.duration || activeTurma.duracao) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={13} style={{ color: '#0284c7' }} />
                            {activeTurma.duration || activeTurma.duracao}
                          </span>
                        )}
                        {(activeTurma.company || activeTurma.empresa) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Building size={13} style={{ color: '#0284c7' }} />
                            {activeTurma.company || activeTurma.empresa}
                          </span>
                        )}
                        {activeTurma.instructor_name && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <User size={13} style={{ color: '#0284c7' }} />
                            {activeTurma.instructor_name}
                          </span>
                        )}
                      </div>
                    </div>
                  )
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
                    disabled={!activeTurma}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem',
                      backgroundColor: !activeTurma ? '#f8fafc' : '#ffffff',
                      border: `1px solid ${searched ? '#16a34a' : '#cbd5e1'}`,
                      borderRadius: '6px',
                      color: '#0f172a',
                      WebkitTextFillColor: '#0f172a',
                      colorScheme: 'light',
                      opacity: 1,
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: !activeTurma ? 'not-allowed' : 'text'
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
                    disabled={!activeTurma}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem',
                      backgroundColor: !activeTurma ? '#f8fafc' : '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      WebkitTextFillColor: '#0f172a',
                      colorScheme: 'light',
                      opacity: 1,
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: !activeTurma ? 'not-allowed' : 'text'
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
                    disabled={!activeTurma}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem',
                      backgroundColor: !activeTurma ? '#f8fafc' : '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      WebkitTextFillColor: '#0f172a',
                      colorScheme: 'light',
                      opacity: 1,
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: !activeTurma ? 'not-allowed' : 'text'
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
                      readOnly={!isManualNome}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem',
                        backgroundColor: isManualNome ? '#ffffff' : '#f0fdf4',
                        border: `1.5px solid ${isManualNome ? '#cbd5e1' : '#16a34a'}`,
                        borderRadius: '6px',
                        color: '#0f172a',
                        WebkitTextFillColor: '#0f172a',
                        opacity: 1,
                        fontSize: '1rem',
                        fontWeight: '700',
                        boxSizing: 'border-box',
                        outline: 'none',
                        colorScheme: 'light',
                        cursor: isManualNome ? 'text' : 'default'
                      }}
                    />
                    {!isManualNome && nome && (
                      <div style={{
                        marginTop: '0.4rem',
                        fontSize: '0.8rem',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: '600'
                      }}>
                        <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>Nome consultado e confirmado na Receita Federal</span>
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
