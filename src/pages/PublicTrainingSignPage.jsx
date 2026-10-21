import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Award, CheckCircle2, RotateCcw, Check, Sparkles, 
  AlertCircle, ShieldCheck, UserCheck, Smartphone, Layers, ArrowLeft, Maximize2,
  Lock, Calendar, Building, MapPin, Clock, User
} from 'lucide-react';
import { getTrainingClasses } from '../services/trainingClassesService';
import { 
  getTurmaSignatures, saveRoleSignature, clearTurmaSignature,
  getSigningToken, completeSigningToken, subscribeToTurmaSignatures
} from '../services/turmaSignatureService';
import SignaturePadModal from '../components/SignaturePadModal';

export default function PublicTrainingSignPage() {
  const { turmaId: paramTurmaId } = useParams();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const queryTurmaId = searchParams.get('turma');
  const activeTurmaId = paramTurmaId || queryTurmaId;

  const [tokenData, setTokenData] = useState(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [turmas, setTurmas] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [loading, setLoading] = useState(true);

  // Papel selecionado para assinar
  const [selectedRole, setSelectedRole] = useState('instructor');

  // Assinaturas já coletadas para esta turma
  const [signatures, setSignatures] = useState({});

  // 1. Carregamento inicial de turmas e validação do token
  useEffect(() => {
    async function load() {
      try {
        const list = await getTrainingClasses();
        setTurmas(list || []);

        // Se houver token na URL, valida prioritariamente o token
        if (tokenParam) {
          const foundToken = getSigningToken(tokenParam);
          if (foundToken) {
            setTokenData(foundToken);
            setSelectedRole(foundToken.roleKey);
            const foundTurma = (list || []).find(t => String(t.id) === String(foundToken.turmaId));
            if (foundTurma) {
              setSelectedTurma(foundTurma);
              const sigs = getTurmaSignatures(foundTurma.id);
              setSignatures(sigs || {});
            }
          } else {
            setTokenInvalid(true);
          }
        } else if (activeTurmaId) {
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
        console.error('Erro ao carregar dados para assinatura:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tokenParam, activeTurmaId]);

  // Sincronização em tempo real das assinaturas e tokens
  useEffect(() => {
    const unsubscribe = subscribeToTurmaSignatures((event) => {
      if (tokenParam) {
        const updatedToken = getSigningToken(tokenParam);
        if (updatedToken) {
          setTokenData({ ...updatedToken });
        }
      }
      if (selectedTurma) {
        const sigs = getTurmaSignatures(selectedTurma.id);
        setSignatures(sigs || {});
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [tokenParam, selectedTurma]);

  // Recarregar assinaturas quando a turma mudar (modo sem token)
  useEffect(() => {
    if (selectedTurma && !tokenParam) {
      const sigs = getTurmaSignatures(selectedTurma.id);
      setSignatures(sigs || {});
    }
  }, [selectedTurma, tokenParam]);

  // Canvas Refs & Estado
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const isDrawingRef = useRef(false);
  const canvasInitializedRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showFullScreenModal, setShowFullScreenModal] = useState(false);

  // Inicializar Canvas com alta resolução ao trocar de papel ou turma
  const initCanvas = (preserve = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
    let saved = null;
    if (preserve && canvasInitializedRef.current) {
      try {
        saved = canvas.toDataURL('image/png');
      } catch (e) {
        console.warn(e);
      }
    }

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (saved) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = saved;
    } else {
      setHistory([canvas.toDataURL('image/png')]);
      setHasDrawn(false);
      setSavedSuccess(false);
    }

    canvasInitializedRef.current = true;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      initCanvas(false);
    }, 100);

    const handleResize = () => {
      initCanvas(true);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [selectedRole, selectedTurma?.id, tokenData?.token]);

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

    pointsRef.current = [{ x, y }];
    isDrawingRef.current = true;
    setIsDrawing(true);

    // Ponto inicial suave
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    pointsRef.current.push({ x, y });

    // Curvas ultra-suaves Midpoint Quadratic Bézier
    if (pointsRef.current.length > 2) {
      const p1 = pointsRef.current[pointsRef.current.length - 2];
      const p2 = pointsRef.current[pointsRef.current.length - 1];
      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };
      ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      ctx.stroke();
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawingRef.current) return;
    if (e) e.preventDefault();
    isDrawingRef.current = false;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev.slice(-15), canvas.toDataURL('image/png')]);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    pointsRef.current = [];
    setHistory([canvas.toDataURL('image/png')]);
  };

  const handleUndo = () => {
    if (history.length <= 1) {
      handleClear();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const newHistory = history.slice(0, -1);
    const lastState = newHistory[newHistory.length - 1];

    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
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

  // Informações do Signatário
  const getSignerInfo = () => {
    if (tokenData) {
      return {
        name: tokenData.signerName,
        role: tokenData.roleTitle
      };
    }
    if (!selectedTurma) return { name: '', role: '' };

    if (selectedRole.startsWith('instructor_')) {
      const idx = parseInt(selectedRole.replace('instructor_', ''), 10);
      const inst = selectedTurma.instructors?.[idx];
      return {
        name: inst?.name || selectedTurma.instructor_name || 'Instrutor Oficial',
        role: inst?.role || selectedTurma.instructor_role || 'Instrutor'
      };
    }

    if (selectedRole === 'instructor') {
      const inst = selectedTurma.instructors?.[0];
      return {
        name: inst?.name || selectedTurma.instructor_name || 'Instrutor Oficial',
        role: inst?.role || selectedTurma.instructor_role || 'Instrutor'
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

  // Ação de Salvar Assinatura
  const handleSaveSignature = (canvasOrDataUrl = null) => {
    let dataUrl = null;

    if (typeof canvasOrDataUrl === 'string') {
      dataUrl = canvasOrDataUrl;
    } else {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert('Por favor, desenhe sua assinatura antes de confirmar.');
        return;
      }
      dataUrl = getTrimmedDataUrl(canvas);
    }

    if (!dataUrl) return;

    // Se estiver usando token exclusivo de uso único
    if (tokenData && tokenParam) {
      const result = completeSigningToken(tokenParam, dataUrl);
      if (result.success) {
        setTokenData({ ...result.token });
        setSavedSuccess(true);
        if (selectedTurma) {
          setSignatures(getTurmaSignatures(selectedTurma.id));
        }
      } else {
        alert(result.error || 'Erro ao concluir a assinatura pelo link.');
      }
      return;
    }

    // Modo direto sem token
    if (!selectedTurma) {
      alert('Turma não identificada.');
      return;
    }

    const updatedSigs = saveRoleSignature(selectedTurma.id, selectedRole, dataUrl, {
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
          <p style={{ fontSize: '1rem', color: '#94a3b8' }}>Carregando dados da assinatura...</p>
        </div>
      </div>
    );
  }

  // Se o token fornecido for inválido
  if (tokenInvalid) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        padding: '1.5rem'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
            Link de Assinatura Inválido ou Expirado
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            Este link não foi encontrado ou foi cancelado. Por favor, solicite um novo link de assinatura ao responsável do treinamento.
          </p>
          <Link
            to="/training-certificates"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '0.875rem'
            }}
          >
            <ArrowLeft size={16} /> Acessar Painel TotalSafety
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // CASO 1: LINK EXCLUSIVO JÁ FOI UTILIZADO E FINALIZADO (NÃO ACONTECE MAIS NADA)
  // -------------------------------------------------------------------------
  if (tokenData && tokenData.status === 'signed') {
    const formattedDate = tokenData.signedAt 
      ? new Date(tokenData.signedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : 'Concluído';

    const sigImage = tokenData.signatureDataUrl || signatures[tokenData.roleKey]?.dataUrl;

    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#0f172a',
        padding: '2rem 1rem'
      }}>
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          
          {/* Card Principal de Conclusão e Encerramento */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            padding: '2rem 1.75rem',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              border: '2px solid #a7f3d0'
            }}>
              <ShieldCheck size={36} />
            </div>

            <div style={{
              display: 'inline-block',
              backgroundColor: 'rgba(5, 150, 105, 0.1)',
              color: '#059669',
              fontSize: '0.75rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '0.25rem 0.75rem',
              borderRadius: '1rem',
              marginBottom: '0.75rem'
            }}>
              Assinatura Concluída com Sucesso
            </div>

            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Link Finalizado
            </h1>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.55', margin: '0 0 1.5rem 0' }}>
              Olá, <strong>{tokenData.signerName}</strong>! Sua assinatura foi vinculada com sucesso a todos os certificados da turma <strong>{tokenData.turmaName || selectedTurma?.name}</strong>.
            </p>

            {/* Imagem da Assinatura Registrada */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '0.85rem',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Assinatura Registrada no Documento
              </div>
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sigImage ? (
                  <img src={sigImage} alt="Assinatura Coletada" style={{ maxHeight: '65px', maxWidth: '85%', objectFit: 'contain' }} />
                ) : (
                  <CheckCircle2 size={32} color="#059669" />
                )}
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.65rem', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#334155', fontWeight: '700' }}>
                {tokenData.signerName} — {tokenData.roleTitle}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Assinado em {formattedDate}
              </div>
            </div>

            {/* Mensagem Clara de Link Encerrado */}
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '0.75rem',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textAlign: 'left',
              fontSize: '0.78rem',
              color: '#1e40af',
              lineHeight: '1.45',
              marginBottom: '1.25rem'
            }}>
              <Lock size={20} style={{ flexShrink: 0, color: '#2563eb' }} />
              <div>
                <strong>Link de Uso Único Encerrado:</strong> Por segurança, integridade e conformidade regulamentadora, este link não aceita novas modificações.
              </div>
            </div>

            {/* Dados do Treinamento */}
            <div style={{
              textAlign: 'left',
              backgroundColor: '#fafafa',
              borderRadius: '0.75rem',
              padding: '1rem',
              border: '1px solid #f1f5f9',
              fontSize: '0.76rem',
              color: '#475569',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div><strong>Turma:</strong> {tokenData.turmaName || selectedTurma?.name}</div>
              <div><strong>Curso:</strong> {tokenData.courseName || selectedTurma?.course_name || 'Treinamento de Segurança'}</div>
              <div><strong>Empresa:</strong> {selectedTurma?.company || 'TotalSafety'}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            TotalSafety • Gestão de Treinamentos e Certificados
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // CASO 2: TELA DE ASSINATURA ATIVA (COM OU SEM TOKEN PENDENTE)
  // -------------------------------------------------------------------------
  const instructorsList = selectedTurma?.instructors && selectedTurma.instructors.length > 0
    ? selectedTurma.instructors
    : [
        {
          id: 'inst-1',
          name: selectedTurma?.instructor_name || 'Instrutor Oficial',
          role: selectedTurma?.instructor_role || 'Instrutor',
          registration: selectedTurma?.instructor_registration || ''
        }
      ];

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
              {tokenData ? 'Link exclusivo para assinatura' : 'Portal de Assinatura Digital Touch'}
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
        
        {/* Banner do Signatário Convidado (Se acessou via token exclusivo) */}
        {tokenData ? (
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            borderRadius: '1rem',
            padding: '1.25rem',
            color: '#ffffff',
            marginBottom: '1rem',
            boxShadow: '0 8px 24px -4px rgba(124, 58, 237, 0.35)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.2rem' }}>👋</span>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>
                Assinatura Pendente
              </span>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.35rem 0' }}>
              Olá, {tokenData.signerName}!
            </h2>
            <p style={{ fontSize: '0.82rem', margin: 0, opacity: 0.95, lineHeight: '1.45' }}>
              Você foi convidado para assinar digitalmente os certificados da turma como <strong>{tokenData.roleTitle}</strong>. 
              Ao confirmar sua assinatura, este link será finalizado automaticamente.
            </p>
          </div>
        ) : null}

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
                Turma Vinculada
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
                <strong>Carga Horária:</strong> {selectedTurma.duration || '8 horas'}
              </div>
              <div>
                <strong>Local:</strong> {selectedTurma.location || 'Mossoró - RN'}
              </div>
              <div>
                <strong>Instrutores:</strong> {instructorsList.map(i => i.name).join(' • ')}
              </div>
            </div>
          </div>
        )}

        {/* Seleção de Papel (APENAS se NÃO acessou via token exclusivo) */}
        {!tokenData && (
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

            <div style={{ display: 'grid', gridTemplateColumns: instructorsList.length > 1 ? 'repeat(auto-fill, minmax(200px, 1fr))' : '1fr 1fr', gap: '0.6rem' }}>
              {/* Múltiplos Instrutores */}
              {instructorsList.map((inst, idx) => {
                const roleKey = idx === 0 ? 'instructor' : `instructor_${idx}`;
                const isSelected = selectedRole === roleKey || (selectedRole === 'instructor' && idx === 0);
                const hasSigned = !!(signatures[roleKey]?.dataUrl || (idx === 0 && signatures.instructor?.dataUrl));

                return (
                  <button
                    key={inst.id || idx}
                    type="button"
                    onClick={() => setSelectedRole(roleKey)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.85rem',
                      borderRadius: '0.75rem',
                      border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? 'rgba(124, 58, 237, 0.06)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isSelected ? '#7c3aed' : '#0f172a' }}>
                        👨‍🏫 {instructorsList.length > 1 ? `Instrutor #${idx + 1}` : 'Instrutor(a)'}
                      </span>
                      {hasSigned && <CheckCircle2 size={14} color="#10b981" />}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
                      {inst.name || 'Instrutor'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: hasSigned ? '#10b981' : '#f59e0b', marginTop: '0.2rem', fontWeight: '700' }}>
                      {hasSigned ? '✅ Já Assinado' : '⚠️ Pendente'}
                    </span>
                  </button>
                );
              })}

              {/* Responsável Técnico */}
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
                  {signatures.tech_lead?.dataUrl && <CheckCircle2 size={14} color="#10b981" />}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '600' }}>
                  Eider Gomes / Raimundo
                </span>
                <span style={{ fontSize: '0.65rem', color: signatures.tech_lead?.dataUrl ? '#10b981' : '#f59e0b', marginTop: '0.2rem', fontWeight: '700' }}>
                  {signatures.tech_lead?.dataUrl ? '✅ Já Assinado' : '⚠️ Pendente'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Botão de Destaque para Abrir em Tela Cheia no Celular */}
        <button
          id="btn-open-fullscreen-sign"
          type="button"
          onClick={() => setShowFullScreenModal(true)}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            borderRadius: '0.85rem',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: '800',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            boxShadow: '0 8px 22px -4px rgba(124, 58, 237, 0.45)',
            marginBottom: '1rem'
          }}
        >
          <Maximize2 size={20} />
          📱 Abrir em Tela Cheia no Celular para Assinar Melhor
        </button>

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

          {/* Área do Canvas com amplo espaço para assinatura */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '350px',
            backgroundColor: '#ffffff',
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
              onClick={() => handleSaveSignature()}
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
              Confirmar e Concluir Assinatura
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
              fontWeight: '600'
            }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Assinatura de {currentSigner.name} confirmada com sucesso!</span>
            </div>
          )}
        </div>

        {/* Modal de Tela Cheia para Celular e Desktop */}
        {showFullScreenModal && (
          <SignaturePadModal
            isOpen={showFullScreenModal}
            onClose={() => setShowFullScreenModal(false)}
            onSave={(dataUrl) => {
              handleSaveSignature(dataUrl);
              setShowFullScreenModal(false);
            }}
            title={`Assinatura: ${currentSigner.role}`}
            subtitle={`Turma: ${selectedTurma?.name || ''}`}
            signerName={currentSigner.name}
            roleTitle={currentSigner.role}
            initialDataUrl={signatures[selectedRole]?.dataUrl}
          />
        )}
      </main>
    </div>
  );
}
