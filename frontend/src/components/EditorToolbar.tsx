import React from 'react';
import { 
  Plus, 
  Diamond, 
  Circle, 
  CircleDot,
  Trash2, 
  MousePointer2,
  GitBranch,
  Copy,
  Expand
} from 'lucide-react';

interface EditorToolbarProps {
  onAddTask: () => void;
  onAddGatewayXOR: () => void;
  onAddGatewayAND: () => void;
  onAddStart: () => void;
  onAddEnd: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  hasSelection: boolean;
  spacingMultiplier: number;
  onSpacingChange: (val: number) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddTask,
  onAddGatewayXOR,
  onAddGatewayAND,
  onAddStart,
  onAddEnd,
  onDeleteSelected,
  onDuplicateSelected,
  hasSelection,
  spacingMultiplier,
  onSpacingChange
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white/90 border border-slate-200 backdrop-blur-xl shadow-lg">
      {/* Label */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 mr-1 border-r border-slate-200">
        <MousePointer2 size={12} className="text-slate-400" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">Editor</span>
      </div>

      {/* Add Task */}
      <button
        onClick={onAddTask}
        title="Adicionar Atividade"
        className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
      >
        <Plus size={13} className="text-blue-500 group-hover:text-blue-600" />
        <span>Atividade</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200" />

      {/* Add Start */}
      <button
        onClick={onAddStart}
        title="Adicionar Evento de Início"
        className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
      >
        <Circle size={13} className="text-emerald-500 group-hover:text-emerald-600" />
        <span>Início</span>
      </button>

      {/* Add End */}
      <button
        onClick={onAddEnd}
        title="Adicionar Evento de Fim"
        className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
      >
        <CircleDot size={13} className="text-rose-500 group-hover:text-rose-600" />
        <span>Fim</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200" />

      {/* Add XOR Gateway */}
      <button
        onClick={onAddGatewayXOR}
        title="Adicionar Gateway Exclusivo (XOR)"
        className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all"
      >
        <Diamond size={13} className="text-amber-500 group-hover:text-amber-600" />
        <span>XOR</span>
      </button>

      {/* Add AND Gateway */}
      <button
        onClick={onAddGatewayAND}
        title="Adicionar Gateway Paralelo (AND)"
        className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all"
      >
        <GitBranch size={13} className="text-indigo-500 group-hover:text-indigo-600" />
        <span>AND</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-200" />

      {/* Duplicate Selected */}
      <button
        onClick={onDuplicateSelected}
        disabled={!hasSelection}
        title="Duplicar Selecionados"
        className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-transparent disabled:cursor-not-allowed transition-all"
      >
        <Copy size={13} className="text-slate-500 group-hover:text-blue-500" />
        <span>Duplicar</span>
      </button>

      {/* Delete Selected */}
      <button
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        title="Excluir Selecionados (Delete)"
        className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-transparent disabled:cursor-not-allowed transition-all"
      >
        <Trash2 size={13} className="text-slate-500 group-hover:text-rose-500" />
        <span>Excluir</span>
      </button>
      
      {/* Divider */}
      <div className="w-px h-5 bg-slate-200 mx-1" />
      
      {/* Horizontal Spacing Slider */}
      <div className="flex items-center gap-2 px-2 py-1" title="Ajustar o espaçamento horizontal do modelo automático">
        <Expand size={12} className="text-slate-400" />
        <input 
          type="range" 
          min="100" 
          max="400" 
          value={spacingMultiplier}
          onChange={(e) => onSpacingChange(Number(e.target.value))}
          className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
};
