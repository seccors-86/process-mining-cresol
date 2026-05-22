import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, User, MessageSquare } from 'lucide-react';

// Start Node component — with optional label and annotation indicator
export const StartNode = memo(({ data }: any) => {
  const hasNote = !!data.annotations;
  const customLabel = data.label && data.label !== 'Início' ? data.label : null;

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-emerald-500 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-emerald-400 font-bold text-xs hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-shadow">
        <Handle 
          type="target" position={Position.Left} id="t" 
          className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Handle 
          type="source" position={Position.Right} id="s" 
          className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <span className="select-none">Início</span>
      </div>
      {/* Custom label below */}
      {customLabel && (
        <span className="text-[9px] font-semibold text-emerald-300/70 max-w-[80px] text-center truncate select-none">
          {customLabel}
        </span>
      )}
      {/* Annotation indicator */}
      {hasNote && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/90 flex items-center justify-center">
          <MessageSquare size={8} className="text-white" />
        </div>
      )}
    </div>
  );
});

// End Node component — with optional label and annotation indicator
export const EndNode = memo(({ data }: any) => {
  const hasNote = !!data.annotations;
  const customLabel = data.label && data.label !== 'Fim' ? data.label : null;

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-rose-500 bg-rose-950/40 shadow-[0_0_15px_rgba(244,63,94,0.2)] text-rose-400 font-bold text-xs hover:shadow-[0_0_25px_rgba(244,63,94,0.35)] transition-shadow">
        <Handle 
          type="target" position={Position.Left} id="t" 
          className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Handle 
          type="source" position={Position.Right} id="s" 
          className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <span className="select-none">Fim</span>
      </div>
      {customLabel && (
        <span className="text-[9px] font-semibold text-rose-300/70 max-w-[80px] text-center truncate select-none">
          {customLabel}
        </span>
      )}
      {hasNote && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/90 flex items-center justify-center">
          <MessageSquare size={8} className="text-white" />
        </div>
      )}
    </div>
  );
});

// Gateway Node component — with label and annotation indicator
export const GatewayNode = memo(({ data, type }: any) => {
  const isParallel = type === 'parallelGateway';
  const symbol = isParallel ? '+' : 'X';
  const colorClass = isParallel ? 'border-indigo-400 bg-indigo-950/30 text-indigo-300' : 'border-amber-400 bg-amber-950/30 text-amber-300';
  const shadowClass = isParallel ? 'shadow-[0_0_12px_rgba(129,140,248,0.25)]' : 'shadow-[0_0_12px_rgba(251,191,36,0.25)]';
  const handleColor = isParallel ? '!bg-indigo-400' : '!bg-amber-400';
  const hasNote = !!data.annotations;
  const customLabel = data.label && data.label !== 'XOR' && data.label !== 'AND' ? data.label : null;

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className={`relative w-12 h-12 flex items-center justify-center rotate-45 border-2 rounded ${colorClass} ${shadowClass} hover:scale-110 transition-transform`}>
        <Handle 
          type="target" position={Position.Left} id="t" 
          className={`!-left-1.5 !w-2.5 !h-2.5 ${handleColor} !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity`}
        />
        <Handle 
          type="source" position={Position.Right} id="s" 
          className={`!-right-1.5 !w-2.5 !h-2.5 ${handleColor} !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity`}
        />
        <div className="-rotate-45 font-extrabold text-base select-none">{symbol}</div>
      </div>
      {customLabel && (
        <span className={`text-[9px] font-semibold max-w-[90px] text-center truncate select-none ${isParallel ? 'text-indigo-300/70' : 'text-amber-300/70'}`}>
          {customLabel}
        </span>
      )}
      {hasNote && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/90 flex items-center justify-center">
          <MessageSquare size={8} className="text-white" />
        </div>
      )}
    </div>
  );
});

// Task Node card with full pool/lane header and annotations
export const TaskNode = memo(({ data, selected }: any) => {
  const hasNote = !!data.annotations;
  
  return (
    <div className={`group w-56 rounded-xl border bg-slate-900/90 text-slate-100 shadow-xl backdrop-blur-md transition-all duration-200 ${
      selected 
        ? 'border-blue-500 ring-2 ring-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]' 
        : 'border-slate-800 hover:border-slate-700'
    }`}>
      <Handle 
        type="target" position={Position.Left} id="t" 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity !-left-1.5"
      />
      <Handle 
        type="source" position={Position.Right} id="s" 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity !-right-1.5"
      />

      {/* Pool : Lane header */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 px-3.5 py-2 text-[10px] font-semibold tracking-wide uppercase text-slate-400">
        <User size={10} className="text-blue-400" />
        <span className="truncate max-w-[170px]" title={`${data.pool} • ${data.lane}`}>
          {data.lane ? `${data.pool} : ${data.lane}` : data.pool || 'Geral'}
        </span>
      </div>

      {/* Task label */}
      <div className="px-4 py-3.5">
        <p className="text-xs font-semibold leading-relaxed text-slate-100 font-display line-clamp-2 select-none">
          {data.label}
        </p>
      </div>

      {/* Annotation indicator */}
      {hasNote && (
        <div className="flex items-center gap-1.5 border-t border-slate-800/40 bg-slate-950/20 px-3.5 py-1.5 rounded-b-xl text-[10px] text-amber-400 font-medium">
          <FileText size={11} />
          <span className="truncate max-w-[170px]">Observações inclusas</span>
        </div>
      )}
    </div>
  );
});
