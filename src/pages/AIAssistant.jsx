import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, Bot, User, ShieldCheck, Paperclip, X, FileText } from 'lucide-react';
import { useAI } from '../context/AIContext';

const AIAssistant = () => {
  const { 
    messages, 
    input, setInput, 
    isTyping, isExtracting, 
    handleSend, 
    markAsRead, 
    setIsActivePage 
  } = useAI();
  
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    setIsActivePage(true);
    markAsRead();
    return () => setIsActivePage(false);
  }, [setIsActivePage, markAsRead]);

  const onSubmit = (e) => {
    e.preventDefault();
    handleSend(input, attachedFile);
    setAttachedFile(null);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--background)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        backgroundColor: 'var(--surface)'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '1rem',
          background: 'linear-gradient(135deg, var(--primary), var(--info))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)'
        }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-h1" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            EcoIA <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '1rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>BETA</span>
          </h1>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            Inteligência Artificial aplicada a Gestão de SST
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex',
            gap: '1rem',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%'
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', flexShrink: 0
              }}>
                <Bot size={20} />
              </div>
            )}
            
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: '1rem',
              backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--surface)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              boxShadow: 'var(--shadow-sm)',
              fontSize: '0.9375rem',
              lineHeight: 1.5,
              borderTopRightRadius: msg.role === 'user' ? '0.25rem' : '1rem',
              borderTopLeftRadius: msg.role === 'assistant' ? '0.25rem' : '1rem',
            }}>
              {msg.text}
            </div>

            {msg.role === 'user' && (
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'var(--secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', flexShrink: 0
              }}>
                <User size={20} />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start', maxWidth: '80%' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)', flexShrink: 0
            }}>
              <Bot size={20} />
            </div>
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: '1rem', borderTopLeftRadius: '0.25rem',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '0.375rem'
            }}>
              <span className="typing-dot" style={{ animationDelay: '0s' }}>•</span>
              <span className="typing-dot" style={{ animationDelay: '0.2s' }}>•</span>
              <span className="typing-dot" style={{ animationDelay: '0.4s' }}>•</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        
        {/* Preview do Anexo */}
        {attachedFile && (
          <div style={{
            maxWidth: '1000px', margin: '0 auto 0.75rem auto',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.5rem 1rem', backgroundColor: 'var(--primary-light)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)',
            color: 'var(--primary)'
          }}>
            <FileText size={16} />
            <span style={{ fontSize: '0.8125rem', fontWeight: '500', flex: 1 }}>{attachedFile.name}</span>
            <button 
              type="button" 
              onClick={() => setAttachedFile(null)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form 
          onSubmit={onSubmit}
          style={{
            display: 'flex',
            gap: '0.5rem',
            maxWidth: '1000px',
            margin: '0 auto',
            backgroundColor: 'var(--background)',
            padding: '0.5rem',
            borderRadius: '100px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            alignItems: 'center'
          }}
        >
          <input 
            type="file" 
            accept=".pdf" 
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files[0]) setAttachedFile(e.target.files[0]);
              e.target.value = null; 
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isTyping || isExtracting}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: 'transparent', color: 'var(--text-secondary)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: (isTyping || isExtracting) ? 'not-allowed' : 'pointer', transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Anexar PDF"
          >
            <Paperclip size={18} />
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isExtracting ? "Lendo PDF anexado, aguarde..." : "Pergunte à IA ou mande um documento (PDF) para análise..."}
            disabled={isExtracting}
            style={{
              flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
              padding: '0.5rem 0.5rem', fontSize: '0.9375rem', color: 'var(--text-primary)'
            }}
          />
          
          <button
            type="submit"
            disabled={(!input.trim() && !attachedFile) || isTyping || isExtracting}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: ((input.trim() || attachedFile) && !isTyping && !isExtracting) ? 'var(--primary)' : 'var(--text-secondary)',
              color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: ((input.trim() || attachedFile) && !isTyping && !isExtracting) ? 'pointer' : 'not-allowed',
              transition: 'var(--transition)'
            }}
          >
            <Send size={18} style={{ marginLeft: '2px' }} />
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <ShieldCheck size={12} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            Assistente de Inteligência Artificial Especializado. Pode cometer erros. Considere verificar informações críticas.
          </div>
          <div style={{ opacity: 0.8 }}>
            🕒 O histórico desta conversa é apagado automaticamente todos os dias às 00:00.
          </div>
        </div>
      </div>
      <style>{`
        .typing-dot {
          font-size: 1.5rem;
          line-height: 0.5;
          color: var(--text-secondary);
          animation: typing 1.4s infinite ease-in-out both;
        }
        @keyframes typing {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default AIAssistant;
