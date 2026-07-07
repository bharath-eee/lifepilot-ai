import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, MessageSquare, Loader2, Trash2, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actionTaken?: string;
}

export const Chat: React.FC = () => {
  const { token, user } = useAuth();
  const [chatAttachments, setChatAttachments] = useState<{ filename: string, content: string, mime_type: string }[]>([]);

  const handleChatFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Attachment size should be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64Content = reader.result.split(',')[1];
        setChatAttachments(prev => [
          ...prev,
          {
            filename: file.name,
            content: base64Content,
            mime_type: file.type || 'application/octet-stream'
          }
        ]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveChatAttachment = (index: number) => {
    setChatAttachments(prev => prev.filter((_, i) => i !== index));
  };
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem('lifepilot_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved chat history", e);
      }
    }
    return [
      { sender: 'ai', text: `Hello ${user?.name || 'there'}! I am your LifePilot AI Assistant. I can:\n\n• **Send emails** — e.g. "send mail hello to friend@email.com"\n• **Summarize your inbox** — e.g. "summarize today's important emails"\n• **Answer questions** about your schedule, bills, and tasks\n\nHow can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem('lifepilot_chat_history', JSON.stringify(messages));
  }, [messages]);

  const getTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input, timestamp: getTimestamp() };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    const chatHistory = messages.map(m => ({
      sender: m.sender,
      text: m.text
    })).slice(-10);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: currentInput,
          history: chatHistory,
          attachments: chatAttachments
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setChatAttachments([]);
      
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: data.reply,
        timestamp: getTimestamp(),
        actionTaken: data.action_taken
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: `⚠️ I couldn't process that request. Error: ${err.message || 'Connection failed'}. Please make sure the backend is running.`,
        timestamp: getTimestamp()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    const confirmClear = window.confirm("Are you sure you want to clear the chat conversation?");
    if (confirmClear) {
      const initialMsg: Message = { 
        sender: 'ai', 
        text: `Hello ${user?.name || 'there'}! I am your LifePilot AI Assistant. I can:\n\n• **Send emails** — e.g. "send mail hello to friend@email.com"\n• **Summarize your inbox** — e.g. "summarize today's important emails"\n• **Answer questions** about your schedule, bills, and tasks\n\nHow can I help you today?`, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      };
      setMessages([initialMsg]);
      sessionStorage.removeItem('lifepilot_chat_history');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto glass-panel rounded-3xl border-glassBorder overflow-hidden shadow-glass">
      {/* Chat header */}
      <div className="px-6 py-4 border-b border-glassBorder bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-neonBlue/10 text-neonBlue flex items-center justify-center border border-neonBlue/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">LifePilot AI Orchestrator</h2>
            <p className="text-xs text-slate-500 font-mono">
              {isLoading ? (
                <span className="text-neonBlue">Processing...</span>
              ) : (
                'Agent Status: Ready'
              )}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleClearChat}
          className="text-xs font-semibold text-slate-500 hover:text-critical border border-glassBorder hover:border-critical/30 bg-white hover:bg-critical/5 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex items-start space-x-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.sender === 'user' ? 'bg-neonPurple/10 text-neonPurple border border-neonPurple/20' : 'bg-neonBlue/10 text-neonBlue border border-neonBlue/20'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              </div>
              
              <div className={`p-4 rounded-2xl border ${
                msg.sender === 'user' 
                  ? 'bg-neonPurple/10 border-neonPurple/20 text-slate-800 rounded-tr-none' 
                  : 'bg-slate-50 border-glassBorder text-slate-700 rounded-tl-none'
              }`}>
                <div className="text-sm leading-relaxed whitespace-pre-line text-slate-800 font-medium" dangerouslySetInnerHTML={{ 
                  __html: msg.text
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-950 font-bold">$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} />
                {msg.actionTaken === 'email_sent' && (
                  <div className="mt-2 flex items-center space-x-1 text-neonGreen text-[10px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-neonGreen animate-pulse" />
                    <span>Email delivered</span>
                  </div>
                )}
                <span className="text-[10px] text-slate-500 font-mono block mt-1.5 text-right">{msg.timestamp}</span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-start space-x-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-neonBlue/10 text-neonBlue border border-neonBlue/20">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl border bg-slate-50 border-glassBorder text-slate-500 rounded-tl-none">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neonBlue animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-neonBlue animate-pulse delay-150" />
                  <span className="w-1.5 h-1.5 rounded-full bg-neonBlue animate-pulse delay-300" />
                  <span className="text-xs font-mono ml-2">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      <div className="px-6 py-3 bg-slate-50/50 border-t border-glassBorder/80 flex items-center space-x-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button onClick={() => setInput("Summarize today's important emails.")} className="text-xs font-medium text-slate-600 bg-slate-100 border border-glassBorder py-1.5 px-3 rounded-full hover:text-neonBlue hover:border-neonBlue/30 transition-all">
          Summarize emails
        </button>
        <button onClick={() => setInput("Send mail hello to bharath.eee.engineer@gmail.com")} className="text-xs font-medium text-slate-600 bg-slate-100 border border-glassBorder py-1.5 px-3 rounded-full hover:text-neonPurple hover:border-neonPurple/30 transition-all">
          Send test email
        </button>
        <button onClick={() => setInput("Are there any pending bills due?")} className="text-xs font-medium text-slate-600 bg-slate-100 border border-glassBorder py-1.5 px-3 rounded-full hover:text-neonGreen hover:border-neonGreen/30 transition-all">
          Check pending bills
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-glassBorder bg-slate-50 flex flex-col space-y-3">
        {chatAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chatAttachments.map((att, idx) => (
              <div key={idx} className="flex items-center space-x-2 bg-white border border-glassBorder p-2 rounded-xl self-start max-w-[200px] animate-fade-in shadow-sm">
                <span className="text-xs truncate text-slate-700 font-medium">{att.filename}</span>
                <button 
                  onClick={() => handleRemoveChatAttachment(idx)}
                  className="text-slate-400 hover:text-critical font-bold text-xs flex-shrink-0"
                  type="button"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center space-x-3 w-full">
          <label className="cursor-pointer p-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-glassBorder text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center flex-shrink-0">
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              className="hidden"
              onChange={handleChatFileAttach}
              disabled={isLoading}
            />
          </label>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask LifePilot to send emails, summarize inbox, track bills..."
            className="flex-1 glass-input py-3 px-4 text-sm"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="p-3 bg-neonBlue hover:bg-neonBlue/90 text-white rounded-xl shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
};
