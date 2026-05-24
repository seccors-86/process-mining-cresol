import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, Database } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSidebarProps {
  messages: Message[];
  status: 'idle' | 'generating' | 'executing' | 'layouting' | 'error';
  errorMessage: string | null;
  onSendMessage: (text: string, mode: 'text'|'interview', isAsIs: boolean, file?: File) => void;
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
  const [creationMode, setCreationMode] = useState<'text' | 'interview'>('text');
  const [isAsIs, setIsAsIs] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'idle') return;
    onSendMessage(input, creationMode, isAsIs);
    setInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSendMessage(`[Arquivo enviado: ${file.name}] Por favor, extraia as etapas deste histórico.`, 'text', isAsIs, file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div className="flex flex-col h-full w-[380px] bg-white border-r border-slate-200 shadow-sm z-10">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shadow-sm">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-slate-800">Cresol AI Agent</h2>
            <span className="text-[10px] text-slate-500 font-medium">Mapeamento de Processos</span>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button 
            onClick={onRestart}
            title="Resetar Mapeamento"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col p-2 space-y-4">
            <div className="flex flex-col items-center text-center space-y-2 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shadow-sm">
                <Bot size={20} />
              </div>
              <h3 className="font-display font-semibold text-sm text-slate-700">Novo Mapeamento</h3>
            </div>

            <div className="space-y-3">
              {/* As-Is vs To-Be */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Contexto do Processo:</p>
                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                  <button onClick={() => setIsAsIs(true)} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${isAsIs ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>AS-IS (Atual)</button>
                  <button onClick={() => setIsAsIs(false)} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${!isAsIs ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>TO-BE (Futuro)</button>
                </div>
              </div>

              {/* Modes */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Como deseja começar?</p>
                <button onClick={() => setCreationMode('text')} className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${creationMode === 'text' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div className={`p-1.5 rounded-md ${creationMode === 'text' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}><Sparkles size={14}/></div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">Descrever Fluxo</p>
                    <p className="text-[10px] text-slate-500">Escreva um resumo e a IA gera o desenho.</p>
                  </div>
                </button>

                <button onClick={() => setCreationMode('interview')} className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${creationMode === 'interview' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div className={`p-1.5 rounded-md ${creationMode === 'interview' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}><User size={14}/></div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">Entrevista Guiada</p>
                    <p className="text-[10px] text-slate-500">A IA fará perguntas até entender tudo.</p>
                  </div>
                </button>

                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2.5 p-3 rounded-xl border bg-white border-slate-200 hover:border-slate-300 transition-all text-left">
                  <div className="p-1.5 rounded-md bg-slate-100 text-slate-500"><Database size={14}/></div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">Enviar Histórico (CSV/XLS)</p>
                    <p className="text-[10px] text-slate-500">A IA extrai etapas de logs e planilhas.</p>
                  </div>
                </button>
                <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0 mt-0.5 shadow-sm">
                  <Bot size={14} />
                </div>
              )}
              
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap select-none">{msg.content}</p>
              </div>
              
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-0.5 shadow-sm">
                  <User size={14} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Spinner */}
        {status !== 'idle' && status !== 'error' && (
          <div className="flex gap-2.5 justify-start animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 text-slate-500 rounded-tl-none shadow-sm">
              <p className="font-semibold select-none flex items-center gap-1.5">
                {getStatusText()}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs leading-relaxed space-y-1 shadow-sm">
            <p className="font-bold">Houve uma falha:</p>
            <p className="text-[11px] font-mono break-words">{errorMessage}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-slate-50/80">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== 'idle'}
            placeholder={
              messages.length === 0 
                ? (creationMode === 'interview' ? "Digite 'Olá' para começar a entrevista..." : "Descreva seu processo aqui...") 
                : "Solicite ajustes (ex: 'adicione uma etapa de validação')"
            }
            rows={messages.length === 0 ? 3 : 2}
            className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none disabled:opacity-50 shadow-inner"
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
            className="absolute right-3.5 bottom-3.5 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all shadow-sm"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};
