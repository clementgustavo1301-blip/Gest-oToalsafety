import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, RotateCcw, Check, Smartphone, Maximize2, Minimize2, 
  Trash2, PenTool, CheckCircle2, ShieldCheck, RefreshCw 
} from 'lucide-react';

/**
 * Componente modal de desenho manual de assinatura de alta fidelidade
 * - Otimizado para celular, tablet e desktop.
 * - Resolução Retina / High DPI (sem pixelização, traço suave vetorial).
 * - Máximo de espaço útil para assinatura na tela.
 * - Não apaga o traço durante o desenho (correção do ciclo de re-render).
 */
export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = 'Assinar Manualmente',
  subtitle = 'Desenhe a assinatura com o dedo no celular ou com o mouse',
  signerName = '',
  roleTitle = '',
  initialDataUrl = null
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pointsRef = useRef([]);
  const isDrawingRef = useRef(false);
  const inkColorRef = useRef('#0f172a');
  const canvasInitializedRef = useRef(false);

  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState([]);
  const [inkColor, setInkColor] = useState('#0f172a');
  const [isLandscapeHint, setIsLandscapeHint] = useState(false);

  // No celular/tablet abre em tela cheia por padrão
  const [isFullScreen, setIsFullScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 || ('ontouchstart' in window);
    }
    return false;
  });

  // Atualiza ref da cor da tinta
  useEffect(() => {
    inkColorRef.current = inkColor;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = inkColor;
        ctx.fillStyle = inkColor;
      }
    }
  }, [inkColor]);

  // Trava a rolagem da página quando o modal estiver aberto
  useEffect(() => {
    if (!isOpen) {
      canvasInitializedRef.current = false;
      return;
    }

    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    document.body.style.overflow = 'hidden';

    // Checa se está em portrait em celular para sugerir girar
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsLandscapeHint(isMobile && isPortrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      window.removeEventListener('resize', checkOrientation);
    };
  }, [isOpen]);

  // Configura o canvas preservando sempre o conteúdo se já houver
  const initOrResizeCanvas = useCallback((preserveExisting = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Alta definição: mínimo de 2.5x para garantir traço cristalino em qualquer tela
    const dpr = Math.max(window.devicePixelRatio || 1, 2.5);

    let savedDataUrl = null;
    if (preserveExisting && canvasInitializedRef.current) {
      try {
        savedDataUrl = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('Não foi possível exportar canvas temporário:', err);
      }
    } else if (initialDataUrl && !canvasInitializedRef.current) {
      savedDataUrl = initialDataUrl;
    }

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = inkColorRef.current;
    ctx.fillStyle = inkColorRef.current;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (savedDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = savedDataUrl;
    } else if (!canvasInitializedRef.current) {
      setHistory([canvas.toDataURL('image/png')]);
      setHasDrawn(false);
    }

    canvasInitializedRef.current = true;
  }, [initialDataUrl]);

  // Inicializa quando abre o modal ou altera modo de tela cheia
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      initOrResizeCanvas(!canvasInitializedRef.current ? false : true);
    }, 80);

    const handleWindowResize = () => {
      initOrResizeCanvas(true);
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [isOpen, isFullScreen, initOrResizeCanvas]);

  if (!isOpen) return null;

  // Obter coordenadas precisas relativas ao canvas em CSS pixels
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

    ctx.strokeStyle = inkColorRef.current;
    ctx.fillStyle = inkColorRef.current;

    // Ponto inicial suave
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
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

    // Curvas ultra-suaves (Midpoint Quadratic Bézier)
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

    const canvas = canvasRef.current;
    if (canvas) {
      const snap = canvas.toDataURL('image/png');
      setHistory(prev => [...prev.slice(-15), snap]);
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

  /**
   * Recorta o canvas para remover margens transparentes excessivas mantendo proporção fiel
   */
  const getTrimmedDataUrl = (canvas) => {
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
        if (alpha > 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) return canvas.toDataURL('image/png');

    // Margem de segurança proporcional
    const pad = Math.floor(Math.min(width, height) * 0.03) + 20;
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

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert('Por favor, desenhe sua assinatura no quadro antes de salvar.');
      return;
    }
    const trimmedDataUrl = getTrimmedDataUrl(canvas);
    onSave(trimmedDataUrl);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: isFullScreen ? 'stretch' : 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: isFullScreen ? 0 : '1rem',
        boxSizing: 'border-box'
      }}
    >
      <div 
        ref={containerRef}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: isFullScreen ? 0 : '1.25rem',
          width: '100%',
          maxWidth: isFullScreen ? '100vw' : '820px',
          height: isFullScreen ? '100dvh' : 'auto',
          maxHeight: isFullScreen ? '100dvh' : '92vh',
          boxShadow: isFullScreen ? 'none' : '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* ========================================================================= */}
        {/* CABEÇALHO DO MODAL                                                        */}
        {/* ========================================================================= */}
        <div style={{
          padding: '0.65rem 1rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          flexShrink: 0,
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)'
            }}>
              <PenTool size={17} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                  {title}
                </h3>
                {roleTitle && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    color: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    padding: '2px 7px',
                    borderRadius: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}>
                    {roleTitle}
                  </span>
                )}
              </div>
              <p style={{ 
                fontSize: '0.72rem', 
                color: '#64748b', 
                margin: '1px 0 0 0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {signerName ? `${signerName} • Assinatura Digital` : subtitle}
              </p>
            </div>
          </div>

          {/* Controles do Cabeçalho */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
            {/* Alternar Tela Cheia */}
            <button
              type="button"
              onClick={() => setIsFullScreen(prev => !prev)}
              title={isFullScreen ? 'Reduzir tamanho' : 'Abrir em tela cheia (Mais espaço)'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: isFullScreen ? '#e2e8f0' : '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Fechar Modal */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Cancelar e Fechar"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Dica para celular se estiver em Portrait */}
        {isLandscapeHint && isFullScreen && (
          <div style={{
            backgroundColor: '#fef3c7',
            borderBottom: '1px solid #fde68a',
            padding: '0.4rem 0.85rem',
            fontSize: '0.74rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📱</span>
              <span><strong>Dica:</strong> Gire o celular na <strong>horizontal</strong> para assinar com espaço máximo!</span>
            </div>
            <button 
              type="button" 
              onClick={() => setIsLandscapeHint(false)}
              style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: '800' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÁREA MÁXIMA DO CANVAS                                                     */}
        {/* ========================================================================= */}
        <div style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#fafbfc',
          touchAction: 'none',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          minHeight: isFullScreen ? '0' : '360px',
          overflow: 'hidden'
        }}>
          {/* Marca d'água / Linha de Assinatura Guia */}
          <div style={{
            position: 'absolute',
            bottom: isFullScreen ? '70px' : '55px',
            left: '25px',
            right: '25px',
            borderBottom: '2px dashed #cbd5e1',
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '5px'
          }}>
            <span style={{ 
              fontSize: '0.72rem', 
              color: '#94a3b8', 
              fontStyle: 'italic',
              fontWeight: '500'
            }}>
              ✍️ Assine sobre esta linha
            </span>
            <span style={{ 
              fontSize: '0.72rem', 
              color: '#94a3b8', 
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {signerName || roleTitle || 'Assinatura'}
            </span>
          </div>

          {/* Canvas de Alta Resolução Interativo */}
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              flex: 1,
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

          {/* Mensagem quando ainda não desenhou */}
          {!hasDrawn && (
            <div style={{
              position: 'absolute',
              top: '40%',
              left: 0,
              right: 0,
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.92rem',
              fontWeight: '500',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <span style={{ fontSize: '1.8rem' }}>✍️</span>
              <span>Toque e deslize o dedo para assinar</span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Área de toque livre de alta precisão</span>
            </div>
          )}

          {/* Ferramentas Flutuantes (Desfazer e Limpar) */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            gap: '0.4rem',
            zIndex: 10
          }}>
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length <= 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)',
                color: history.length <= 1 ? '#cbd5e1' : '#334155',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: history.length <= 1 ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
              }}
              title="Desfazer último traço"
            >
              <RotateCcw size={13} />
              Desfazer
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={!hasDrawn}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)',
                color: !hasDrawn ? '#cbd5e1' : '#ef4444',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: !hasDrawn ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
              }}
              title="Limpar quadro"
            >
              <Trash2 size={13} />
              Limpar
            </button>
          </div>

          {/* Seletor de Tinta */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            gap: '0.35rem',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(4px)',
            padding: '3px 7px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            zIndex: 10
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#64748b', marginRight: '2px' }}>
              Cor:
            </span>
            {[
              { color: '#0f172a', label: 'Preto' },
              { color: '#1e40af', label: 'Azul' }
            ].map(item => (
              <button
                key={item.color}
                type="button"
                onClick={() => setInkColor(item.color)}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  border: inkColor === item.color ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  transform: inkColor === item.color ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.15s ease'
                }}
                title={`Tinta ${item.label}`}
              />
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BARRA INFERIOR DE AÇÕES                                                   */}
        {/* ========================================================================= */}
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexShrink: 0
        }}>
          {/* Status à esquerda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: hasDrawn ? '#16a34a' : '#64748b',
              backgroundColor: hasDrawn ? '#f0fdf4' : '#f1f5f9',
              padding: '0.25rem 0.65rem',
              borderRadius: '1rem',
              border: hasDrawn ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
            }}>
              {hasDrawn ? <CheckCircle2 size={13} /> : <span>✍️</span>}
              {hasDrawn ? 'Assinatura Pronta' : 'Aguardando'}
            </span>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '9px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              id="btn-save-drawn-signature"
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.35rem',
                borderRadius: '9px',
                border: 'none',
                background: hasDrawn ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: '800',
                cursor: hasDrawn ? 'pointer' : 'not-allowed',
                boxShadow: hasDrawn ? '0 5px 15px -2px rgba(16, 185, 129, 0.45)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Check size={17} />
              Confirmar Assinatura
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
