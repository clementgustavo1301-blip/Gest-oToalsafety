import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, AlertCircle, Loader2, Sparkles, 
  Calendar, User, CreditCard, Award, ArrowRight, 
  Building2, Phone, ShieldCheck, RefreshCw, Copy, Check
} from 'lucide-react';
import { formatCpf, cleanCpf, searchCpfA } from '../services/cpfService';
import { getTrainingClasses, registerStudent } from '../services/trainingClassesService';

export default function PublicTrainingEnrollmentPage() {
  const { turmaId: paramTurmaId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTurmaId = searchParams.get('turma');
  const targetTurmaId = paramTurmaId || queryTurmaId;

  // Estados do formulário
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nome, setNome] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState(targetTurmaId || '');

  // Dados auxiliares
  const [turmas, setTurmas] = useState([]);
  const [activeTurma, setActiveTurma] = useState(null);

  // Estados de controle e feedback
  const [searchingCpf, setSearchingCpf] = useState(false);
  const [cpfVerified, setCpfVerified] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [copiedProtocol, setCopiedProtocol] = useState(false);

  // Carrega turmas disponíveis
  useEffect(() => {
    async function loadTurmas() {
      const list = await getTrainingClasses();
      const openTurmas = list.filter(t => t.status !== 'Concluída');
      setTurmas(openTurmas);

      if (targetTurmaId) {
        const found = list.find(t => String(t.id) === String(targetTurmaId));
        if (found) {
          setActiveTurma(found);
          setSelectedTurmaId(found.id);
        }
      }
    }
    loadTurmas();
  }, [targetTurmaId]);

  // Atualização da turma ativa quando o usuário seleciona
  useEffect(() => {
    if (selectedTurmaId && turmas.length > 0) {
      const found = turmas.find(t => String(t.id) === String(selectedTurmaId));
      setActiveTurma(found || null);
    }
  }, [selectedTurmaId, turmas]);

  // Manipulação e consulta automática de CPF
  const handleCpfChange = (e) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
    setCpfError('');

    const digits = cleanCpf(formatted);
    if (digits.length === 11) {
      triggerCpfSearch(digits);
    } else {
      setCpfVerified(false);
      setNome('');
    }
  };

  const triggerCpfSearch = async (digits) => {
    setSearchingCpf(true);
    setCpfError('');
    try {
      const res = await searchCpfA(digits);
      if (res.success && res.nome) {
        setNome(res.nome);
        setCpfVerified(true);
      } else {
        setCpfError(res.error || 'CPF não encontrado. Você pode digitar o nome manualmente se preferir.');
        setCpfVerified(false);
      }
    } catch (err) {
      console.error('Erro na busca de CPF:', err);
      setCpfError('Não foi possível consultar o CPF automaticamente.');
      setCpfVerified(false);
    } finally {
      setSearchingCpf(false);
    }
  };

  // Envio da inscrição
  const handleSubmit = async (e) => {
    e.preventDefault();

    const clean = cleanCpf(cpf);
    if (clean.length !== 11) {
      alert('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!birthDate) {
      alert('Por favor, preencha sua data de nascimento.');
      return;
    }

    if (!nome.trim()) {
      alert('Por favor, preencha seu nome completo.');
      return;
    }

    setSubmitting(true);
    try {
      const protocolNumber = `TRN-${Date.now().toString().slice(-6)}`;
      const result = await registerStudent({
        turma_id: selectedTurmaId || null,
        nome: nome.trim(),
        cpf: formatCpf(clean),
        data_nascimento: birthDate,
        telefone: phone.trim() || null,
        empresa: company.trim() || (activeTurma?.company || null),
        status: 'Inscrito'
      });

      setSuccessData({
        ...result,
        protocol: protocolNumber,
        turmaNome: activeTurma?.course_name || activeTurma?.name || 'Treinamento Geral'
      });
    } catch (err) {
      console.error('Erro ao salvar inscrição:', err);
      alert('Erro ao realizar inscrição. Tente novamente.');
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.35) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(13, 148, 136, 0.25) 0px, transparent 50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#f8fafc'
    }}>
      {/* Container Principal */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '1.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        overflow: 'hidden'
      }}>
        
        {/* Cabeçalho do Card */}
        <div style={{
          padding: '2rem 2rem 1.5rem',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderBottom: '1px solid #334155',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <img 
              src="/logo-totalsafety.png" 
              alt="TotalSafety" 
              style={{ maxHeight: '38px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
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
              Portal de Treinamentos
            </span>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Inscrição de Participante
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem', marginBottom: 0 }}>
            Preencha seus dados para registro na lista de presença e emissão oficial do seu certificado.
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
                <div style={{ fontSize: '0.75rem', color: '#7dd3fc', fontWeight: '600', textTransform: 'uppercase' }}>
                  Turma Selecionada
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

        {/* Corpo: Formulário ou Tela de Sucesso */}
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

              <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>
                Inscrição Confirmada!
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                Seus dados foram validados e inseridos com sucesso na lista de chamada do treinamento.
              </p>

              {/* Card de Comprovante */}
              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '0.85rem',
                padding: '1.25rem',
                textAlign: 'left',
                marginBottom: '1.75rem'
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Participante: </span>
                    <strong style={{ color: '#f8fafc' }}>{successData.nome}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>CPF: </span>
                    <strong style={{ color: '#f8fafc' }}>{successData.cpf}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Nascimento: </span>
                    <strong style={{ color: '#f8fafc' }}>
                      {successData.data_nascimento ? new Date(successData.data_nascimento).toLocaleDateString('pt-BR') : 'Não informada'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Curso / Turma: </span>
                    <strong style={{ color: '#38bdf8' }}>{successData.turmaNome}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setCpf('');
                    setNome('');
                    setBirthDate('');
                    setPhone('');
                    setCompany('');
                    setCpfVerified(false);
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                >
                  <RefreshCw size={15} />
                  Fazer Nova Inscrição
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Campo 1: CPF */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label htmlFor="cpf-input" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CreditCard size={15} style={{ color: '#38bdf8' }} />
                    CPF do Participante *
                  </label>
                  {searchingCpf && (
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Loader2 size={13} className="animate-spin" />
                      Consultando Receita Federal...
                    </span>
                  )}
                  {cpfVerified && !searchingCpf && (
                    <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}>
                      <CheckCircle2 size={13} />
                      CPF Identificado
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
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
                      padding: '0.8rem 1rem',
                      backgroundColor: '#0f172a',
                      border: `1.5px solid ${cpfError ? '#ef4444' : cpfVerified ? '#10b981' : '#334155'}`,
                      borderRadius: '0.65rem',
                      color: '#f8fafc',
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      if (!cpfError && !cpfVerified) e.target.style.borderColor = '#38bdf8';
                    }}
                    onBlur={(e) => {
                      if (!cpfError && !cpfVerified) e.target.style.borderColor = '#334155';
                    }}
                  />
                </div>
                {cpfError && (
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={13} />
                    {cpfError}
                  </div>
                )}
              </div>

              {/* Campo 2: Nome Completo (Autopreenchido pelo CPF A) */}
              <div>
                <label htmlFor="nome-input" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <User size={15} style={{ color: '#38bdf8' }} />
                  Nome Completo *
                  {cpfVerified && (
                    <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      Oficial CPF A
                    </span>
                  )}
                </label>
                <input
                  id="nome-input"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do participante"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    backgroundColor: '#0f172a',
                    border: '1.5px solid #334155',
                    borderRadius: '0.65rem',
                    color: '#f8fafc',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Campo 3: Data de Nascimento */}
              <div>
                <label htmlFor="birthdate-input" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <Calendar size={15} style={{ color: '#38bdf8' }} />
                  Data de Nascimento *
                </label>
                <input
                  id="birthdate-input"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    backgroundColor: '#0f172a',
                    border: '1.5px solid #334155',
                    borderRadius: '0.65rem',
                    color: '#f8fafc',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Campo 4: Seleção de Turma (se não pré-selecionada) */}
              {!activeTurma && turmas.length > 0 && (
                <div>
                  <label htmlFor="turma-select" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <Award size={15} style={{ color: '#38bdf8' }} />
                    Selecione a Turma / Curso
                  </label>
                  <select
                    id="turma-select"
                    value={selectedTurmaId}
                    onChange={(e) => setSelectedTurmaId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      backgroundColor: '#0f172a',
                      border: '1.5px solid #334155',
                      borderRadius: '0.65rem',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  >
                    <option value="">Inscrição Geral (Sem turma específica)</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.course_name || t.name} {t.company ? `(${t.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campos adicionais opcionais (Telefone e Empresa) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="phone-input" style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                    <Phone size={13} />
                    WhatsApp / Telefone
                  </label>
                  <input
                    id="phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(84) 99999-9999"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '0.55rem',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="company-input" style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                    <Building2 size={13} />
                    Empresa
                  </label>
                  <input
                    id="company-input"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Empresa atual"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '0.55rem',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Botão de Submissão */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.9rem 1.5rem',
                  backgroundColor: submitting ? '#64748b' : '#0284c7',
                  backgroundImage: submitting ? 'none' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.65rem',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.4)',
                  transition: 'transform 0.15s, opacity 0.15s'
                }}
                onMouseOver={(e) => {
                  if (!submitting) e.currentTarget.style.opacity = '0.95';
                }}
                onMouseOut={(e) => {
                  if (!submitting) e.currentTarget.style.opacity = '1';
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enviando Inscrição...
                  </>
                ) : (
                  <>
                    Confirmar Minha Inscrição
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

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
                Validação oficial de dados protegida por criptografia TLS 1.3
              </div>

            </form>
          )}
        </div>

        {/* Rodapé institucional */}
        <div style={{
          padding: '1rem 2rem',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          TotalSafety Treinamentos & Capacitação Profissional © {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
}
