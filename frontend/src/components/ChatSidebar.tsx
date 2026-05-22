import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSidebarProps {
  messages: Message[];
  status: 'idle' | 'generating' | 'executing' | 'layouting' | 'error';
  errorMessage: string | null;
  onSendMessage: (text: string) => void;
  onRestart: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  messages,
  status,
  errorMessage,
  onSendMessage,
  onRestart
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'idle') return;
    onSendMessage(input);
    setInput('');
  };

  const getStatusText = () => {
    switch (status) {
      case 'generating': return 'Agente Engenheiro: Escrevendo código POWL...';
      case 'executing': return 'Sandbox: Executando código e validando...';
      case 'layouting': return 'Agente Analista: Gerando posições e swimlanes...';
      case 'error': return 'Erro no processamento.';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full w-[380px] bg-slate-900/60 border-r border-slate-800 backdrop-blur-md">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-slate-100">Cresol AI Agent</h2>
            <span className="text-[10px] text-slate-400 font-medium">Mapeamento de Processos</span>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button 
            onClick={onRestart}
            title="Resetar Mapeamento"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Bot size={24} />
            </div>
            <h3 className="font-display font-semibold text-sm text-slate-200">Olá! Como posso ajudar?</h3>
            <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
              Descreva o seu processo corporativo (ex: abertura de conta, concessão de crédito, etc.) para iniciarmos o mapeamento automático.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Bot size={14} />
                </div>
              )}
              
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap select-none">{msg.content}</p>
              </div>
              
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User size={14} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Spinner */}
        {status !== 'idle' && status !== 'error' && (
          <div className="flex gap-2.5 justify-start animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs bg-slate-850/50 border border-slate-800 text-slate-400 rounded-tl-none">
              <p className="font-semibold select-none flex items-center gap-1.5">
                {getStatusText()}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed space-y-1">
            <p className="font-bold">Houve uma falha:</p>
            <p className="text-[11px] font-mono break-words">{errorMessage}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== 'idle'}
            placeholder={
              messages.length === 0 
                ? "Descreva seu processo aqui..." 
                : "Solicite ajustes (ex: 'adicione uma etapa de validação')"
            }
            rows={messages.length === 0 ? 3 : 2}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-4 pr-12 py-3 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || status !== 'idle'}
            className="absolute right-3.5 bottom-3.5 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};
