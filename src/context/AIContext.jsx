import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { sendMessageToAI } from '../services/aiService';
import { extractTextFromPDF } from '../utils/pdfParser';

const AIContext = createContext({});

export const useAI = () => useContext(AIContext);

export const AIProvider = ({ children }) => {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ecoia_chat_messages');
      const savedTime = localStorage.getItem('ecoia_chat_timestamp');
      if (saved && savedTime) {
        const savedDate = new Date(parseInt(savedTime, 10));
        const today = new Date();
        if (
          savedDate.getDate() === today.getDate() &&
          savedDate.getMonth() === today.getMonth() &&
          savedDate.getFullYear() === today.getFullYear()
        ) {
          return JSON.parse(saved);
        }
      }
    } catch (e) {
      console.error('Erro ao ler chat salvo:', e);
    }
    return [
      {
        id: 1,
        role: 'assistant',
        text: 'Olá! Sou a EcoIA, sua especialista em Segurança do Trabalho. Como posso te ajudar hoje com a gestão da sua clínica ou empresas?'
      }
    ];
  });

  const [input, setInput] = useState(() => {
    try {
      return localStorage.getItem('ecoia_chat_input') || '';
    } catch (e) {
      return '';
    }
  });

  const [isTyping, setIsTyping] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isActivePage, setIsActivePageState] = useState(false);
  const isActivePageRef = useRef(false);

  const setIsActivePage = (value) => {
    setIsActivePageState(value);
    isActivePageRef.current = value;
  };

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('ecoia_chat_messages', JSON.stringify(messages));
        localStorage.setItem('ecoia_chat_timestamp', Date.now().toString());
      }
    } catch (e) {
      console.error('Erro ao salvar chat:', e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('ecoia_chat_input', input);
    } catch (e) {
      console.error('Erro ao salvar input:', e);
    }
  }, [input]);

  const handleSend = async (userMessageText, attachedFile) => {
    if (!userMessageText.trim() && !attachedFile) return;

    setIsExtracting(true);
    let extractedText = '';
    
    if (attachedFile) {
      try {
        extractedText = await extractTextFromPDF(attachedFile);
      } catch (err) {
        alert(err.message);
        setIsExtracting(false);
        return;
      }
    }

    const finalMessageText = attachedFile 
      ? `(Arquivo anexado: ${attachedFile.name})\n\n${userMessageText}\n\n[CONTEÚDO DO DOCUMENTO]:\n${extractedText}`
      : userMessageText;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: userMessageText || `Analise o documento anexado: ${attachedFile.name}`,
      internalText: finalMessageText 
    };

    let newMessages = [...messages, userMessage];
    
    if (newMessages.length > 20) {
      newMessages = [newMessages[0], ...newMessages.slice(-19)];
    }
    
    setMessages(newMessages);
    setInput('');
    localStorage.removeItem('ecoia_chat_input');
    setIsExtracting(false);
    setIsTyping(true);

    try {
      const messagesToSend = newMessages.map(m => ({
        role: m.role,
        text: m.internalText || m.text
      }));

      const responseText = await sendMessageToAI(messagesToSend);
      
      const aiResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        text: responseText
      };

      setMessages(prev => {
        let updated = [...prev, aiResponse];
        if (updated.length > 20) {
          updated = [updated[0], ...updated.slice(-19)];
        }
        return updated;
      });

      // Se a resposta chegou e o usuário não está na aba da IA, incremente as não lidas
      if (!isActivePageRef.current) {
        setUnreadCount(prev => prev + 1);
      }
      
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        role: 'assistant',
        text: `⚠️ **Erro:** ${error.message}`
      };
      setMessages(prev => {
        let updated = [...prev, errorResponse];
        if (updated.length > 20) {
          updated = [updated[0], ...updated.slice(-19)];
        }
        return updated;
      });
      if (!isActivePageRef.current) setUnreadCount(prev => prev + 1);
    } finally {
      setIsTyping(false);
    }
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <AIContext.Provider value={{
      messages,
      input, setInput,
      isTyping, isExtracting,
      handleSend,
      unreadCount, markAsRead,
      setIsActivePage
    }}>
      {children}
    </AIContext.Provider>
  );
};
