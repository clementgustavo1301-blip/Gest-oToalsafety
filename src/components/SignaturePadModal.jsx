import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';

/**
 * Componente modal de desenho manual de assinatura para celular e desktop.
 * Suporta toque no smartphone com alta resolução (Retina/DPI) e recorte automático.
 */
export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = 'Assinar Manualmente',
  subtitle = 'Desenhe a assinatura com o dedo no celular ou mouse',
  signerName = '',
  roleTitle = ''
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState([]);

  // Inicializar Canvas com alta resolução DPI
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Configurar dimensões físicas vs CSS
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#0f172a'; // Tinta escura nítida

      // Salva estado inicial em branco
      setHistory([canvas.toDataURL()]);
      setHasDrawn(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

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

  /**
   * Recorta o canvas para remover margens transparentes excessivas
   */
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

    // Margem de segurança de 15px
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

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert('Por favor, faça o desenho da assinatura antes de salvar.');
      return;
    }
    const trimmedDataUrl = getTrimmedDataUrl(canvas);
    onSave(trimmedDataUrl);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '1.25rem',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'scaleUp 0.2s ease-out'
      }}>
        {/* Cabeçalho */}
        <div style={{
          padding: '1.2rem 1.4rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>✍️</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {title}
              </h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#e2e8f0',
              color: '#475569',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Informações do Assinante */}
        {(signerName || roleTitle) && (
          <div style={{
            padding: '0.65rem 1.4rem',
            backgroundColor: '#eff6ff',
            borderBottom: '1px solid #dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem'
          }}>
            <div>
              <span style={{ fontWeight: '800', color: '#1e40af', textTransform: 'uppercase' }}>
                {roleTitle || 'Papel na Turma'}:
              </span>{' '}
              <strong style={{ color: '#1e3a8a' }}>{signerName}</strong>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: '600' }}>
              Em Lote p/ Turma Toda
            </span>
          </div>
        )}

        {/* Área do Canvas de Assinatura */}
        <div style={{ padding: '1.2rem 1.4rem' }}>
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
            {/* Linha de Base da Assinatura */}
            <div style={{
              position: 'absolute',
              bottom: '50px',
              left: '30px',
              right: '30px',
              borderBottom: '1px dashed #94a3b8',
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '2px'
            }}>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Assine sobre esta linha
              </span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '600' }}>
                {signerName || 'Assinatura Manual'}
              </span>
            </div>

            {/* Canvas Interativo */}
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
                Toque e deslize o dedo para desenhar a assinatura
              </div>
            )}
          </div>

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

            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {hasDrawn ? '✅ Assinatura capturada' : 'Aguardando traço...'}
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div style={{
          padding: '1rem 1.4rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.8rem'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '0.65rem',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.35rem',
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
            Salvar e Aplicar na Turma Toda
          </button>
        </div>
      </div>
    </div>
  );
}
