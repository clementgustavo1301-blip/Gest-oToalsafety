import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Award, CheckCircle2, RotateCcw, Check, Sparkles, 
  AlertCircle, ShieldCheck, UserCheck, Smartphone, Layers, ArrowLeft
} from 'lucide-react';
import { getTrainingClasses } from '../services/trainingClassesService';
import { getTurmaSignatures, saveRoleSignature, clearTurmaSignature } from '../services/turmaSignatureService';

export default function PublicTrainingSignPage() {
  const { turmaId: paramTurmaId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTurmaId = searchParams.get('turma');
  const activeTurmaId = paramTurmaId || queryTurmaId;

  const [turmas, setTurmas] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [loading, setLoading] = useState(true);

  // Papel selecionado para assinar: 'instructor' | 'tech_lead' | 'coordinator'
  const [selectedRole, setSelectedRole] = useState('instructor');

  // Assinaturas já coletadas para esta turma
  const [signatures, setSignatures] = useState({});

  // Canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Carregar turmas
  useEffect(() => {
    async function load() {
      try {
        const list = await getTrainingClasses();
        setTurmas(list || []);

        if (activeTurmaId) {
          const found = (list || []).find(t => String(t.id) === String(activeTurmaId));
          if (found) {
            setSelectedTurma(found);
            const sigs = getTurmaSignatures(found.id);
            setSignatures(sigs || {});
          }
        } else if (list && list.length > 0) {
          setSelectedTurma(list[0]);
          const sigs = getTurmaSignatures(list[0].id);
          setSignatures(sigs || {});
        }
      } catch (e) {
        console.error('Erro ao carregar turma para assinatura:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeTurmaId]);

  // Recarregar assinaturas quando a turma mudar
  useEffect(() => {
    if (selectedTurma) {
      const sigs = getTurmaSignatures(selectedTurma.id);
      setSignatures(sigs || {});
    }
  }, [selectedTurma]);

  // Inicializar Canvas ao trocar de papel ou abrir
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const timer = setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0f172a';

      setHistory([canvas.toDataURL()]);
      setHasDrawn(false);
      setSavedSuccess(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedRole, selectedTurma]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    if (e) e.preventDefault();
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev.slice(-15), canvas.toDataURL()]);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    setHistory([canvas.toDataURL()]);
  };

  const handleUndo = () => {
    if (history.length <= 1) {
      handleClear();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const newHistory = history.slice(0, -1);
    const lastState = newHistory[newHistory.length - 1];

    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
      setHistory(newHistory);
      setHasDrawn(newHistory.length > 1);
    };
  };

  const getTrimmedDataUrl = (canvas) => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) return canvas.toDataURL('image/png');

    const pad = 15 * dpr;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width, maxX + pad);
    maxY = Math.min(height, maxY + pad);

    const trimW = maxX - minX;
    const trimH = maxY - minY;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimW;
    trimmedCanvas.height = trimH;
    const tCtx = trimmedCanvas.getContext('2d');
    tCtx.drawImage(canvas, minX, minY, trimW, trimH, 0, 0, trimW, trimH);

    return trimmedCanvas.toDataURL('image/png');
  };

  // Nomes correspondentes por papel
  const getSignerInfo = () => {
    if (!selectedTurma) return { name: '', role: '' };
    if (selectedRole === 'instructor') {
      return {
        name: selectedTurma.instructor_name || 'Instrutor Oficial',
        role: selectedTurma.instructor_role || 'Instrutor'
      };
    }
    if (selectedRole === 'tech_lead') {
      return {
        name: 'Eider Gomes do Nascimento / Raimundo Fernandes Jr.',
        role: 'Responsável Técnico'
      };
    }
    return {
      name: 'Coordenação Técnica / Co-Instrutor',
      role: 'Coordenador Técnico'
    };
  };

  const currentSigner = getSignerInfo();

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn || !selectedTurma) {
      alert('Por favor, faça o desenho da assinatura antes de salvar.');
      return;
    }

    const trimmed = getTrimmedDataUrl(canvas);
    const updatedSigs = saveRoleSignature(selectedTurma.id, selectedRole, trimmed, {
      signerName: currentSigner.name,
      roleTitle: currentSigner.role
    });

    if (updatedSigs) {
      setSignatures(updatedSigs);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontFamily: "'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ fontSize: '1rem', color: '#94a3b8' }}>Carregando dados da turma...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: '#0f172a',
      paddingBottom: '3rem'
    }}>
      {/* Barra de Topo */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '1rem 1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '0.65rem',
            background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, letterSpacing: '0.3px' }}>
              TotalSafety • Assinatura de Turma
            </h1>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
              Assinatura manual desenhada pelo celular (Em Lote)
            </p>
          </div>
        </div>

        <Link
          to="/training-certificates"
          style={{
            color: '#94a3b8',
            fontSize: '0.78rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.4rem 0.8rem',
            borderRadius: '0.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <ArrowLeft size={14} /> Painel
        </Link>
      </header>

      {/* Conteúdo Central */}
      <main style={{ maxWidth: '680px', margin: '1.2rem auto', padding: '0 1rem' }}>
        {/* Seletor de Turma se houver mais de uma */}
        {turmas.length > 1 && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
              Selecione a Turma para Assinar:
            </label>
            <select
              value={selectedTurma?.id || ''}
              onChange={(e) => {
                const found = turmas.find(t => String(t.id) === e.target.value);
                if (found) setSelectedTurma(found);
              }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.6rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                fontWeight: '600'
              }}
            >
              {turmas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.course_name || 'Curso'} ({t.company || 'Geral'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Card de Identificação da Turma */}
        {selectedTurma && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1rem',
            padding: '1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                color: '#7c3aed',
                padding: '0.2rem 0.6rem',
                borderRadius: '1rem'
              }}>
                Turma Selecionada
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {selectedTurma.start_date ? new Date(selectedTurma.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data não definida'}
              </span>
            </div>

            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              {selectedTurma.name}
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: '600', marginBottom: '0.6rem' }}>
              {selectedTurma.course_name || 'Norma Regulamentadora'}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.6rem',
              fontSize: '0.74rem',
              color: '#64748b',
              backgroundColor: '#f8fafc',
              padding: '0.75rem',
              borderRadius: '0.65rem'
            }}>
              <div>
                <strong>Empresa:</strong> {selectedTurma.company || 'TotalSafety'}
              </div>
              <div>
                <strong>Local:</strong> {selectedTurma.location || 'Mossoró - RN'}
              </div>
            </div>

            <div style={{
              marginTop: '0.8rem',
              padding: '0.65rem 0.85rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '0.6rem',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.74rem',
              color: '#166534'
            }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>
                <strong>Assinatura em Lote:</strong> A assinatura desenhada aqui será impressa em <strong>todos</strong> os certificados emitidos para esta turma.
              </span>
            </div>
          </div>
        )}

        {/* Seleção do Papel a Assinar */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          padding: '1.2rem',
          marginBottom: '1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.8rem 0' }}>
            Quem está assinando agora?
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {/* Opção Instrutor */}
            <button
              type="button"
              onClick={() => setSelectedRole('instructor')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.85rem',
                borderRadius: '0.75rem',
                border: selectedRole === 'instructor' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                backgroundColor: selectedRole === 'instructor' ? 'rgba(124, 58, 237, 0.06)' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: selectedRole === 'instructor' ? '#7c3aed' : '#0f172a' }}>
                  👨‍🏫 Instrutor(a)
                </span>
                {signatures.instructor?.dataUrl && (
                  <CheckCircle2 size={14} color="#10b981" />
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
                {selectedTurma?.instructor_name || 'Adeylton da Silva'}
              </span>
              <span style={{ fontSize: '0.65rem', color: signatures.instructor?.dataUrl ? '#10b981' : '#f59e0b', marginTop: '0.2rem', fontWeight: '700' }}>
                {signatures.instructor?.dataUrl ? '✅ Já Assinado' : '⚠️ Pendente'}
              </span>
            </button>

            {/* Opção Responsável Técnico */}
            <button
              type="button"
              onClick={() => setSelectedRole('tech_lead')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.85rem',
                borderRadius: '0.75rem',
                border: selectedRole === 'tech_lead' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                backgroundColor: selectedRole === 'tech_lead' ? 'rgba(124, 58, 237, 0.06)' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: selectedRole === 'tech_lead' ? '#7c3aed' : '#0f172a' }}>
                  🛡️ Resp. Técnico
                </span>
                {signatures.tech_lead?.dataUrl && (
                  <CheckCircle2 size={14} color="#10b981" />
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
                Eider Gomes / Raimundo
              </span>
              <span style={{ fontSize: '0.65rem', color: signatures.tech_lead?.dataUrl ? '#10b981' : '#f59e0b', marginTop: '0.2rem', fontWeight: '700' }}>
                {signatures.tech_lead?.dataUrl ? '✅ Já Assinado' : '⚠️ Pendente'}
              </span>
            </button>
          </div>

          {/* Aviso sobre a Assinatura do Aluno */}
          <div style={{
            marginTop: '0.85rem',
            padding: '0.6rem 0.8rem',
            backgroundColor: '#eff6ff',
            borderRadius: '0.6rem',
            border: '1px solid #dbeafe',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.72rem',
            color: '#1e40af'
          }}>
            <span>🔒</span>
            <span>
              <strong>Assinatura do Aluno:</strong> Permanece sempre <strong>pendente</strong> em branco, para o aluno assinar individualmente na entrega do certificado.
            </span>
          </div>
        </div>

        {/* Quadro de Assinatura Digital Touch */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          padding: '1.25rem',
          marginBottom: '1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Smartphone size={17} color="#7c3aed" />
              <span style={{ fontSize: '0.86rem', fontWeight: '800', color: '#0f172a' }}>
                Desenhe a Assinatura de: {currentSigner.name}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {currentSigner.role}
            </span>
          </div>

          {/* Área do Canvas */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            backgroundColor: '#fafafa',
            borderRadius: '0.85rem',
            border: '2px dashed #cbd5e1',
            boxSizing: 'border-box',
            touchAction: 'none',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '50px',
              left: '25px',
              right: '25px',
              borderBottom: '1px dashed #94a3b8',
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '2px'
            }}>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Assine sobre a linha com o dedo
              </span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '600' }}>
                {currentSigner.name}
              </span>
            </div>

            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                cursor: 'crosshair',
                touchAction: 'none'
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {!hasDrawn && (
              <div style={{
                position: 'absolute',
                top: '40%',
                left: 0,
                right: 0,
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.82rem',
                pointerEvents: 'none',
                fontStyle: 'italic'
              }}>
                Toque e deslize o dedo para assinar
              </div>
            )}
          </div>

          {/* Botões do Canvas */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '0.8rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length <= 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: history.length <= 1 ? '#94a3b8' : '#334155',
                  fontSize: '0.76rem',
                  fontWeight: '600',
                  cursor: history.length <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <RotateCcw size={13} />
                Desfazer
              </button>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.55rem',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Limpar
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveSignature}
              disabled={!hasDrawn}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.3rem',
                borderRadius: '0.65rem',
                border: 'none',
                background: hasDrawn ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: hasDrawn ? 'pointer' : 'not-allowed',
                boxShadow: hasDrawn ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
              }}
            >
              <Check size={16} />
              Salvar e Vincular à Turma
            </button>
          </div>

          {savedSuccess && (
            <div style={{
              marginTop: '0.8rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#065f46',
              fontSize: '0.8rem',
              fontWeight: '600',
              animation: 'fadeIn 0.2s ease-in'
            }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Assinatura de {currentSigner.name} vinculada com sucesso a toda a turma!</span>
            </div>
          )}
        </div>

        {/* Galeria de Assinaturas da Turma Já Coletadas */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          padding: '1.25rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.8rem 0' }}>
            Assinaturas Manuais Ativas Nesta Turma:
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Instrutor */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              backgroundColor: '#f8fafc',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64268a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                INSTRUTOR(A)
              </div>
              <div style={{
                height: '55px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                marginBottom: '0.35rem'
              }}>
                {signatures.instructor?.dataUrl ? (
                  <img src={signatures.instructor.dataUrl} alt="Assinatura Manual" style={{ maxHeight: '48px', maxWidth: '90%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>Pendente</span>
                )}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#0f172a' }}>
                {signatures.instructor?.signerName || selectedTurma?.instructor_name || 'Adeylton da Silva'}
              </div>
              {signatures.instructor?.dataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    clearTurmaSignature(selectedTurma.id, 'instructor');
                    setSignatures(getTurmaSignatures(selectedTurma.id));
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    marginTop: '0.2rem'
                  }}
                >
                  Remover / Refazer
                </button>
              )}
            </div>

            {/* Responsável Técnico */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              backgroundColor: '#f8fafc',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64268a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                RESP. TÉCNICO
              </div>
              <div style={{
                height: '55px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                marginBottom: '0.35rem'
              }}>
                {signatures.tech_lead?.dataUrl ? (
                  <img src={signatures.tech_lead.dataUrl} alt="Assinatura Manual" style={{ maxHeight: '48px', maxWidth: '90%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>Pendente</span>
                )}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#0f172a' }}>
                {signatures.tech_lead?.signerName || 'Eider Gomes / Raimundo'}
              </div>
              {signatures.tech_lead?.dataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    clearTurmaSignature(selectedTurma.id, 'tech_lead');
                    setSignatures(getTurmaSignatures(selectedTurma.id));
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    marginTop: '0.2rem'
                  }}
                >
                  Remover / Refazer
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
