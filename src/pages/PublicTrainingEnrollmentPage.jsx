import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, Loader2, ArrowRight,
  RefreshCw, Copy, Check, Search, Calendar, Clock,
  Building, User, ChevronDown, Lock, BookOpen, FileX,
  Sun, Moon
} from 'lucide-react';
import { formatCpf, cleanCpf, validateCpf, searchCpfA } from '../services/cpfService';
import { getTrainingClasses, getTrainingClassById, registerStudent } from '../services/trainingClassesService';
import { useTheme } from '../context/ThemeContext';
import './PublicTrainingEnrollmentPage.css';

/**
 * Verifica se a turma está com status "Aberta"
 */
const isTurmaAberta = (t) => {
  if (!t) return false;
  const st = String(t.status || 'Aberta').trim().toLowerCase();
  return st === 'aberta';
};

/**
 * Validação rigorosa de data de nascimento (formato YYYY-MM-DD, ano realista e não futura)
 */
const isValidBirthDate = (val) => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  if (year < 1920 || year > currentYear) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const parsed = new Date(`${trimmed}T00:00:00`);
  return !isNaN(parsed.getTime()) && parsed <= now;
};

export default function PublicTrainingEnrollmentPage() {
  const { turmaId: paramTurmaId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTurmaId = searchParams.get('turma');
  const targetTurmaId = paramTurmaId || queryTurmaId;
  const isIndividualLink = Boolean(targetTurmaId);

  const { isDark, toggleTheme } = useTheme();

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

  // 1. Inicialização e carregamento
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setGeneralError('');
      setTurmaNotFound(false);
      setTurmaClosed(false);

      try {
        if (isIndividualLink) {
          // Link específico de turma
          const turma = await getTrainingClassById(targetTurmaId);
          if (cancelled) return;

          if (!turma) {
            setTurmaNotFound(true);
            setActiveTurma(null);
          } else if (!isTurmaAberta(turma)) {
            setTurmaClosed(true);
            setActiveTurma(turma);
          } else {
            setActiveTurma(turma);
            setSelectedTurmaId(turma.id);
          }
        } else {
          // Link geral: carrega todas as turmas e filtra apenas as abertas
          const allTurmas = await getTrainingClasses();
          if (cancelled) return;

          const openOnly = (allTurmas || []).filter(isTurmaAberta);
          setOpenTurmas(openOnly);

          if (openOnly.length === 1) {
            // Se houver apenas uma turma aberta, auto-seleciona para agilizar
            setSelectedTurmaId(openOnly[0].id);
            setActiveTurma(openOnly[0]);
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Erro ao carregar turmas:', err);
        setGeneralError('Não foi possível carregar os dados do treinamento. Tente recarregar a página.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [targetTurmaId, isIndividualLink]);

  // Manipulador da troca de turma no dropdown (apenas link geral)
  const handleTurmaSelectChange = (e) => {
    const id = e.target.value;
    setSelectedTurmaId(id);
    setErrorMsg('');
    const found = openTurmas.find(t => String(t.id) === String(id));
    setActiveTurma(found || null);

    // Reseta a busca se mudar a turma
    if (searched && !isManualNome) {
      setSearched(false);
      setNome('');
    }
  };

  // Formatação de CPF em tempo real
  const handleCpfChange = (e) => {
    const raw = e.target.value;
    const digits = cleanCpf(raw).slice(0, 11);
    const formatted = formatCpf(digits);
    setCpf(formatted);
    setErrorMsg('');
    if (searched && !isManualNome) {
      setSearched(false);
      setNome('');
    }
  };

  // Manipulador da data de nascimento
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
      setErrorMsg('Informe um CPF completo com 11 dígitos.');
      return;
    }

    if (!validateCpf(digits)) {
      setErrorMsg('CPF inválido. Por favor, verifique os números digitados.');
      return;
    }

    if (!birthDate || !String(birthDate).trim()) {
      setErrorMsg('Informe sua data de nascimento.');
      return;
    }

    if (!isValidBirthDate(birthDate)) {
      setErrorMsg('Data de nascimento inválida. Verifique o ano, mês e dia informados.');
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

  const digits = cleanCpf(cpf);
  const isCpfFilled = digits.length === 11;
  const isCpfValid = isCpfFilled && validateCpf(digits);
  const isBirthDateFilled = Boolean(birthDate && String(birthDate).trim().length > 0);
  const isBirthDateValid = isBirthDateFilled && isValidBirthDate(birthDate);

  // O botão Continuar só fica liberado após colocar o CPF e a Data de Nascimento válidos
  const canSearch = Boolean(activeTurma) &&
    isTurmaAberta(activeTurma) &&
    isCpfFilled &&
    isCpfValid &&
    isBirthDateFilled &&
    isBirthDateValid &&
    !searching;

  return (
    <div className="pte-wrapper">
      <div className="pte-card">
        
        {/* Cabeçalho */}
        <div className="pte-header">
          <div>
            <h1 className="pte-title">
              {isIndividualLink ? 'Inscrição no Treinamento' : 'Formulário de Participação'}
            </h1>
            <p className="pte-subtitle">
              {isIndividualLink 
                ? 'Preencha seus dados para confirmar sua presença nesta turma.'
                : 'Selecione a turma e preencha seus dados para registrar sua presença.'}
            </p>
          </div>
          <button
            type="button"
            className="pte-theme-btn"
            onClick={toggleTheme}
            title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Conteúdo */}
        <div className="pte-content">
          {loading ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: '#0284c7' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                {isIndividualLink ? 'Carregando dados da turma...' : 'Carregando turmas disponíveis...'}
              </p>
            </div>
          ) : successData ? (
            /* Tela de Sucesso */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.15rem'
              }}>
                <CheckCircle2 size={32} />
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: isDark ? '#ffffff' : '#0f172a', marginBottom: '0.35rem' }}>
                {successData.already_registered ? 'Presença já registrada' : 'Participação confirmada!'}
              </h2>
              <p style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '1.5rem', lineHeight: 1.45 }}>
                {successData.already_registered
                  ? 'Seu CPF já constava na lista de presença desta turma.'
                  : 'Seu nome já foi incluído na lista oficial de presença com sucesso.'}
              </p>

              {/* Comprovante */}
              <div className="pte-comprovante">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '0.65rem' }}>
                  <span className="pte-comprovante-label">Protocolo de Confirmação:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: isDark ? '#38bdf8' : '#0284c7' }}>
                      {successData.protocol}
                    </strong>
                    <button
                      type="button"
                      onClick={handleCopyProtocol}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: copiedProtocol ? '#16a34a' : (isDark ? '#cbd5e1' : '#64748b') }}
                      title="Copiar protocolo"
                    >
                      {copiedProtocol ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div className="pte-comprovante-row">
                    <span className="pte-comprovante-label">Turma:</span>
                    <strong className="pte-comprovante-value">{successData.turmaNome}</strong>
                  </div>
                  <div className="pte-comprovante-row">
                    <span className="pte-comprovante-label">Participante:</span>
                    <strong className="pte-comprovante-value">{successData.nome}</strong>
                  </div>
                  <div className="pte-comprovante-row">
                    <span className="pte-comprovante-label">CPF:</span>
                    <strong className="pte-comprovante-value">{successData.cpf}</strong>
                  </div>
                  {successData.matricula && (
                    <div className="pte-comprovante-row">
                      <span className="pte-comprovante-label">Matrícula:</span>
                      <strong className="pte-comprovante-value">{successData.matricula}</strong>
                    </div>
                  )}
                  <div>
                    <span className="pte-comprovante-label">Data de Nascimento: </span>
                    <strong className="pte-comprovante-value">
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
                className="pte-btn"
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  border: isDark ? '1.5px solid #334155' : '1.5px solid #cbd5e1',
                  maxWidth: '220px',
                  margin: '0 auto'
                }}
              >
                <RefreshCw size={15} />
                Nova Inscrição
              </button>
            </div>
          ) : isIndividualLink && turmaNotFound ? (
            /* Caso 1 de Link Individual: Turma Não Encontrada */
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <FileX size={28} />
              </div>

              <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', color: isDark ? '#ffffff' : '#0f172a', fontWeight: '700' }}>
                Turma não encontrada
              </h2>

              <p style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.5, margin: '0 auto 1.25rem', maxWidth: '380px' }}>
                O link informado não corresponde a nenhuma turma ativa no sistema. O endereço pode estar incompleto ou a turma foi removida.
              </p>

              <div style={{
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem',
                fontSize: '0.825rem',
                color: isDark ? '#cbd5e1' : '#64748b'
              }}>
                Solicite o link atualizado ao instrutor ou organizador do treinamento.
              </div>
            </div>
          ) : isIndividualLink && turmaClosed ? (
            /* Caso 2 de Link Individual: Turma Encerrada/Não Aberta */
            <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <Lock size={28} />
              </div>

              <span style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: isDark ? '#fbbf24' : '#92400e',
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #fde68a',
                padding: '3px 12px',
                borderRadius: '9999px',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Inscrições Encerradas ({activeTurma?.status || 'Concluída'})
              </span>

              <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', color: isDark ? '#ffffff' : '#0f172a', fontWeight: '700' }}>
                Esta turma não está mais aberta
              </h2>

              <p style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.5, margin: '0 auto 1.25rem', maxWidth: '400px' }}>
                As inscrições para <strong>{activeTurma?.course_name || activeTurma?.curso || activeTurma?.name || 'este treinamento'}</strong> foram encerradas.
              </p>

              {activeTurma && (
                <div style={{
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  color: isDark ? '#cbd5e1' : '#475569',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Curso: </span>
                    <strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{activeTurma.course_name || activeTurma.name}</strong>
                  </div>
                  {activeTurma.start_date && (
                    <div>
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Data: </span>
                      <strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                        {new Date(activeTurma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </strong>
                    </div>
                  )}
                  {(activeTurma.company || activeTurma.empresa) && (
                    <div>
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Empresa: </span>
                      <strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{activeTurma.company || activeTurma.empresa}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Status da Turma: </span>
                    <strong style={{ color: '#d97706' }}>{activeTurma.status || 'Concluída'}</strong>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.8rem', color: isDark ? '#64748b' : '#94a3b8', margin: 0 }}>
                Caso precise registrar sua presença ou tenha dúvidas, contate o instrutor ou a equipe responsável.
              </p>
            </div>
          ) : !isIndividualLink && openTurmas.length === 0 ? (
            /* Link Geral sem nenhuma turma aberta */
            <div style={{ textAlign: 'center', padding: '2rem 0.5rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                color: isDark ? '#94a3b8' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.15rem'
              }}>
                <Calendar size={26} />
              </div>
              <h2 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem', color: isDark ? '#ffffff' : '#0f172a', fontWeight: '700' }}>
                Nenhuma turma aberta no momento
              </h2>
              <p style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.5, margin: 0 }}>
                No momento não há turmas com inscrições abertas para seleção geral. Caso precise de assistência, entre em contato com a equipe organizadora.
              </p>
            </div>
          ) : (
            /* Formulário de Inscrição Ativo */
            <div>
              {generalError && (
                <div className="pte-error-box" style={{ marginBottom: '1.25rem' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{generalError}</span>
                </div>
              )}

              <form onSubmit={handleBuscarNome} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. SELEÇÃO DE TURMA: EXIBIDA SOMENTE NO LINK GERAL */}
                {!isIndividualLink ? (
                  <div className="pte-field-group">
                    <label htmlFor="turma-select" className="pte-label">
                      <span>Selecione a Turma *</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        id="turma-select"
                        value={selectedTurmaId}
                        onChange={handleTurmaSelectChange}
                        className="pte-input"
                        style={{ paddingRight: '2.5rem', appearance: 'none', cursor: 'pointer' }}
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
                      <ChevronDown size={18} style={{
                        position: 'absolute',
                        right: '0.85rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: isDark ? '#94a3b8' : '#64748b'
                      }} />
                    </div>

                    {/* CARTÃO DETALHADO DA TURMA SELECIONADA NO LINK GERAL */}
                    {activeTurma && (
                      <div className="pte-turma-card" style={{ marginTop: '0.75rem' }}>
                        <div className="pte-turma-tag">
                          Turma Selecionada
                        </div>
                        <div className="pte-course-name">
                          {activeTurma.name ? `${activeTurma.name}: ` : ''}{activeTurma.course_name || activeTurma.curso || activeTurma.name}
                        </div>
                        <div className="pte-meta-row">
                          {activeTurma.start_date && (
                            <span className="pte-meta-item">
                              <Calendar size={13} style={{ color: '#0284c7' }} />
                              {new Date(activeTurma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {(activeTurma.duration || activeTurma.duracao) && (
                            <span className="pte-meta-item">
                              <Clock size={13} style={{ color: '#0284c7' }} />
                              {activeTurma.duration || activeTurma.duracao}
                            </span>
                          )}
                          {activeTurma.company && (
                            <span className="pte-meta-item">
                              <Building size={13} style={{ color: '#0284c7' }} />
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
                    <div className="pte-turma-card">
                      <div className="pte-turma-badge-row">
                        <span className="pte-turma-tag">
                          <BookOpen size={14} />
                          Turma Vinculada
                        </span>
                        <span className="pte-badge-exclusive">
                          <Lock size={11} />
                          Link exclusivo
                        </span>
                      </div>

                      <div className="pte-course-name">
                        {activeTurma.course_name || activeTurma.curso || activeTurma.name || 'Treinamento'}
                      </div>

                      {activeTurma.name && activeTurma.course_name && activeTurma.name !== activeTurma.course_name && (
                        <div className="pte-identificacao">
                          Identificação: {activeTurma.name}
                        </div>
                      )}

                      <div className="pte-meta-row">
                        {activeTurma.start_date && (
                          <span className="pte-meta-item">
                            <Calendar size={14} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                            {new Date(activeTurma.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {(activeTurma.duration || activeTurma.duracao) && (
                          <span className="pte-meta-item">
                            <Clock size={14} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                            {activeTurma.duration || activeTurma.duracao}
                          </span>
                        )}
                        {(activeTurma.company || activeTurma.empresa) && (
                          <span className="pte-meta-item">
                            <Building size={14} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                            {activeTurma.company || activeTurma.empresa}
                          </span>
                        )}
                        {activeTurma.instructor_name && (
                          <span className="pte-meta-item">
                            <User size={14} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                            {activeTurma.instructor_name}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}

                {/* CAMPO 1: CPF */}
                <div className="pte-field-group">
                  <label htmlFor="cpf-input" className="pte-label">
                    <span>CPF *</span>
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
                    className="pte-input pte-input-mono"
                  />
                  {isCpfFilled && !isCpfValid && (
                    <span style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      CPF com dígitos verificadores inválidos.
                    </span>
                  )}
                </div>

                {/* CAMPO 2: DATA DE NASCIMENTO */}
                <div className="pte-field-group">
                  <label htmlFor="birthdate-input" className="pte-label">
                    <span>Data de Nascimento *</span>
                  </label>
                  <input
                    id="birthdate-input"
                    type="date"
                    value={birthDate}
                    onChange={handleBirthDateChange}
                    required
                    disabled={!activeTurma}
                    className="pte-input"
                  />
                  {birthDate && !isBirthDateValid && (
                    <span style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      Data de nascimento inválida. Verifique o ano, mês e dia.
                    </span>
                  )}
                </div>

                {/* CAMPO 3: MATRÍCULA (OPCIONAL) */}
                <div className="pte-field-group">
                  <label htmlFor="matricula-input" className="pte-label">
                    <span>Matrícula</span>
                    <span className="pte-label-hint">Opcional</span>
                  </label>
                  <input
                    id="matricula-input"
                    type="text"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Número de matrícula na empresa (opcional)"
                    disabled={!activeTurma}
                    className="pte-input"
                  />
                </div>

                {/* ALERTA DE ERRO */}
                {errorMsg && (
                  <div className="pte-error-box">
                    <AlertCircle size={17} style={{ flexShrink: 0 }} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* NOME ENCONTRADO OU DIGITADO */}
                {searched && (
                  <div className="pte-field-group">
                    <label htmlFor="nome-input" className="pte-label">
                      <span>Nome Completo do Participante *</span>
                      {nome && !isManualNome && (
                        <button
                          type="button"
                          onClick={() => setIsManualNome(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isDark ? '#38bdf8' : '#0284c7',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                            fontWeight: 600
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
                      className={`pte-input ${!isManualNome ? 'pte-input-verified' : ''}`}
                    />
                    {!isManualNome && nome && (
                      <div className="pte-verified-badge">
                        <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                        <span>Nome localizado e verificado na Receita Federal</span>
                      </div>
                    )}
                  </div>
                )}

                {/* BOTÕES DE AÇÃO */}
                {!searched ? (
                  <>
                    <button
                      type="submit"
                      disabled={!canSearch}
                      className={`pte-btn ${canSearch ? 'pte-btn-primary' : 'pte-btn-disabled'}`}
                      title={!canSearch ? 'Preencha o CPF e a data de nascimento para liberar o botão Continuar' : 'Continuar com a inscrição'}
                    >
                      {searching ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Consultando CPF...
                        </>
                      ) : (
                        <>
                          <Search size={18} />
                          Continuar
                        </>
                      )}
                    </button>
                    {!canSearch && !searching && (
                      <p style={{
                        margin: '0.45rem 0 0',
                        fontSize: '0.8rem',
                        color: isDark ? '#94a3b8' : '#64748b',
                        textAlign: 'center'
                      }}>
                        Preencha o CPF e a data de nascimento para liberar o botão Continuar.
                      </p>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmarEnvio}
                    disabled={submitting || !nome.trim()}
                    className={`pte-btn ${submitting || !nome.trim() ? 'pte-btn-disabled' : 'pte-btn-confirm'}`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Confirmando inscrição...
                      </>
                    ) : (
                      <>
                        Confirmar Presença no Treinamento
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                )}

              </form>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="pte-footer">
          Registro de Presença • TotalSafety & EcoClinic
        </div>

      </div>
    </div>
  );
}
