import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, Bot, User, ShieldCheck, Paperclip, X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
      backgroundColor: 'var(--background)',
      position: 'relative'
    }}>
      {/* Chat Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2rem 1rem 10rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem'
      }}>
        {messages.length === 1 && (
          <div style={{ textAlign: 'center', marginTop: '10vh', marginBottom: '2rem' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '1.5rem', margin: '0 auto 1.5rem auto',
              background: 'linear-gradient(135deg, var(--primary), var(--info))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)'
            }}>
              <Sparkles size={32} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Olá! Como posso ajudar?
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
              Sua Inteligência Artificial especialista em Gestão de SST.
            </p>
          </div>
        )}

        {messages.filter((_, i) => !(messages.length === 1 && i === 0)).map((msg) => (
          <div key={msg.id} style={{
            width: '100%',
            maxWidth: '850px',
            display: 'flex',
            gap: '1.25rem',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start'
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--info))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', flexShrink: 0, marginTop: '0.25rem',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
              }}>
                <Sparkles size={18} />
              </div>
            )}
            
            <div style={{
              maxWidth: msg.role === 'user' ? '70%' : '100%',
              backgroundColor: msg.role === 'user' ? 'var(--surface)' : 'transparent',
              color: 'var(--text-primary)',
              border: msg.role === 'user' ? '1px solid var(--border)' : 'none',
              borderRadius: msg.role === 'user' ? '1.5rem' : '0',
              padding: msg.role === 'user' ? '0.875rem 1.25rem' : '0.25rem 0',
              fontSize: '1rem',
              lineHeight: 1.6,
              boxShadow: msg.role === 'user' ? 'var(--shadow-sm)' : 'none'
            }}>
              {msg.role === 'assistant' ? (
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ width: '100%', maxWidth: '850px', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--info))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
            }}>
              <Sparkles size={18} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)' }}>
              <span className="typing-dot" style={{ animationDelay: '0s' }}>•</span>
              <span className="typing-dot" style={{ animationDelay: '0.2s' }}>•</span>
              <span className="typing-dot" style={{ animationDelay: '0.4s' }}>•</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Area */}
      <div style={{ 
        position: 'absolute',
        bottom: 0, left: 0, width: '100%',
        padding: '0 1rem 1.5rem 1rem',
        background: 'linear-gradient(to top, var(--background) 70%, transparent)'
      }}>
        
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          {/* Preview do Anexo */}
          {attachedFile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 1rem', backgroundColor: 'var(--surface)',
              borderRadius: '1rem', border: '1px solid var(--border)',
              color: 'var(--text-primary)', marginBottom: '0.75rem',
              width: 'fit-content', boxShadow: 'var(--shadow-sm)'
            }}>
              <FileText size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>{attachedFile.name}</span>
              <button 
                type="button" 
                onClick={() => setAttachedFile(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
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
              backgroundColor: 'var(--surface)',
              padding: '0.5rem 0.5rem 0.5rem 1rem',
              borderRadius: '2rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
              alignItems: 'center',
              transition: 'var(--transition)'
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
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'var(--background)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: (isTyping || isExtracting) ? 'not-allowed' : 'pointer', transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              title="Anexar PDF"
            >
              <Paperclip size={16} />
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isExtracting ? "Lendo PDF anexado, aguarde..." : "Escreva sua mensagem ou anexe um documento..."}
              disabled={isExtracting}
              style={{
                flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent',
                padding: '0.5rem', fontSize: '1rem', color: 'var(--text-primary)'
              }}
            />
            
            <button
              type="submit"
              disabled={(!input.trim() && !attachedFile) || isTyping || isExtracting}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: ((input.trim() || attachedFile) && !isTyping && !isExtracting) ? 'var(--text-primary)' : 'var(--background)',
                color: ((input.trim() || attachedFile) && !isTyping && !isExtracting) ? 'var(--surface)' : 'var(--text-secondary)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: ((input.trim() || attachedFile) && !isTyping && !isExtracting) ? 'pointer' : 'not-allowed',
                transition: 'var(--transition)'
              }}
            >
              <Send size={18} style={{ marginLeft: ((input.trim() || attachedFile) && !isTyping && !isExtracting) ? '2px' : '0' }} />
            </button>
          </form>
          
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            A EcoIA pode cometer erros. Verifique as informações geradas.
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
        .markdown-content p { margin-top: 0; margin-bottom: 0.75rem; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content ul, .markdown-content ol { margin-top: 0; margin-bottom: 0.75rem; padding-left: 1.5rem; }
        .markdown-content li { margin-bottom: 0.25rem; }
        .markdown-content strong { font-weight: 700; color: inherit; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 700; }
        .markdown-content table { border-collapse: collapse; width: 100%; margin-bottom: 0.75rem; font-size: 0.875rem; }
        .markdown-content th, .markdown-content td { border: 1px solid var(--border); padding: 0.5rem; text-align: left; }
        .markdown-content th { background-color: rgba(0,0,0,0.05); position: static; }
      `}</style>
    </div>
  );
};

export default AIAssistant;
