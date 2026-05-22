import React from 'react';
import { 
  Plus, 
  Diamond, 
  Circle, 
  CircleDot,
  Trash2, 
  MousePointer2,
  GitBranch
} from 'lucide-react';

interface EditorToolbarProps {
  onAddTask: () => void;
  onAddGatewayXOR: () => void;
  onAddGatewayAND: () => void;
  onAddStart: () => void;
  onAddEnd: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddTask,
  onAddGatewayXOR,
  onAddGatewayAND,
  onAddStart,
  onAddEnd,
  onDeleteSelected,
  hasSelection
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-slate-950/85 border border-slate-800 backdrop-blur-xl shadow-2xl shadow-black/30">
      {/* Label */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 mr-1 border-r border-slate-800">
        <MousePointer2 size={12} className="text-slate-500" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">Editor</span>
      </div>

      {/* Add Task */}
      <button
        onClick={onAddTask}
        title="Adicionar Atividade"
        className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-blue-600/20 border border-transparent hover:border-blue-500/30 transition-all"
      >
        <Plus size={13} className="text-blue-400 group-hover:text-blue-300" />
        <span>Atividade</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-800" />

      {/* Add Start */}
      <button
        onClick={onAddStart}
        title="Adicionar Evento de Início"
        className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-emerald-600/15 border border-transparent hover:border-emerald-500/30 transition-all"
      >
        <Circle size={13} className="text-emerald-400 group-hover:text-emerald-300" />
        <span>Início</span>
      </button>

      {/* Add End */}
      <button
        onClick={onAddEnd}
        title="Adicionar Evento de Fim"
        className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-rose-600/15 border border-transparent hover:border-rose-500/30 transition-all"
      >
        <CircleDot size={13} className="text-rose-400 group-hover:text-rose-300" />
        <span>Fim</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-800" />

      {/* Add XOR Gateway */}
      <button
        onClick={onAddGatewayXOR}
        title="Adicionar Gateway Exclusivo (XOR)"
        className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-amber-600/15 border border-transparent hover:border-amber-500/30 transition-all"
      >
        <Diamond size={13} className="text-amber-400 group-hover:text-amber-300" />
        <span>XOR</span>
      </button>

      {/* Add AND Gateway */}
      <button
        onClick={onAddGatewayAND}
        title="Adicionar Gateway Paralelo (AND)"
        className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-indigo-600/15 border border-transparent hover:border-indigo-500/30 transition-all"
      >
        <GitBranch size={13} className="text-indigo-400 group-hover:text-indigo-300" />
        <span>AND</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-800" />

      {/* Delete Selected */}
      <button
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        title="Excluir Selecionados (Delete)"
        className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-600/15 border border-transparent hover:border-rose-500/30 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:hover:border-transparent disabled:cursor-not-allowed transition-all"
      >
        <Trash2 size={13} />
        <span>Excluir</span>
      </button>
    </div>
  );
};
