import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, User, MessageSquare, Monitor, Database } from 'lucide-react';

// Start Node component — Light Theme
export const StartNode = memo(({ data }: any) => {
  const hasNote = !!data.annotations;
  const customLabel = data.label && data.label !== 'Início' ? data.label : null;

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-emerald-500 bg-emerald-50 shadow-md text-emerald-600 font-bold text-xs hover:shadow-lg transition-shadow">
        <Handle 
          type="target" position={Position.Left} id="t" 
          className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Handle 
          type="source" position={Position.Right} id="s" 
          className="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <span className="select-none">Início</span>
      </div>
      {/* Custom label below */}
      {customLabel && (
        <span className="text-[10px] font-medium text-slate-600 max-w-[80px] text-center truncate select-none">
          {customLabel}
        </span>
      )}
      {/* Annotation indicator */}
      {hasNote && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
          <MessageSquare size={8} className="text-white" />
        </div>
      )}
    </div>
  );
});

// End Node component — Light Theme
export const EndNode = memo(({ data }: any) => {
  const hasNote = !!data.annotations;
  const customLabel = data.label && data.label !== 'Fim' ? data.label : null;

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-4 border-rose-500 bg-rose-50 shadow-md text-rose-600 font-bold text-xs hover:shadow-lg transition-shadow">
        <Handle 
          type="target" position={Position.Left} id="t" 
          className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Handle 
          type="source" position={Position.Right} id="s" 
          className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <span className="select-none">Fim</span>
      </div>
      {customLabel && (
        <span className="text-[10px] font-medium text-slate-600 max-w-[80px] text-center truncate select-none">
          {customLabel}
        </span>
      )}
      {hasNote && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
          <MessageSquare size={8} className="text-white" />
        </div>
      )}
    </div>
  );
});

// Gateway Node component — Light Theme
export const GatewayNode = memo(({ data, type }: any) => {
  const isParallel = type === 'parallelGateway';
  const symbol = isParallel ? '+' : 'X';
  const colorClass = isParallel ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-amber-500 bg-amber-50 text-amber-600';
  const handleColor = isParallel ? '!bg-indigo-500' : '!bg-amber-500';
  const hasNote = !!data.annotations;
  const customLabel = data.label && data.label !== 'XOR' && data.label !== 'AND' ? data.label : null;

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className={`relative w-12 h-12 flex items-center justify-center rotate-45 border-2 rounded-md shadow-md ${colorClass} hover:scale-110 transition-transform`}>
        <Handle 
          type="target" position={Position.Left} id="t" 
          className={`!-left-1.5 !w-2.5 !h-2.5 ${handleColor} !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity`}
        />
        <Handle 
          type="source" position={Position.Right} id="s" 
          className={`!-right-1.5 !w-2.5 !h-2.5 ${handleColor} !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity`}
        />
        <div className="-rotate-45 font-extrabold text-lg select-none">{symbol}</div>
      </div>
      {customLabel && (
        <span className="text-[10px] font-medium max-w-[100px] text-center text-slate-600 select-none mt-1">
          {customLabel}
        </span>
      )}
      {hasNote && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
          <MessageSquare size={8} className="text-white" />
        </div>
      )}
    </div>
  );
});

// Task Node card — Light Theme with Metadata
export const TaskNode = memo(({ data, selected }: any) => {
  const hasNote = !!data.annotations;
  const hasSystem = !!data.systems;
  const isAutomated = data.executionType === 'Sistema' || data.executionType === 'System';
  
  return (
    <div className={`group w-56 rounded-xl border bg-white text-slate-800 shadow-sm transition-all duration-200 ${
      selected 
        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md scale-[1.02]' 
        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
    }`}>
      <Handle 
        type="target" position={Position.Left} id="t" 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !-left-1.5"
      />
      <Handle 
        type="source" position={Position.Right} id="s" 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity !-right-1.5"
      />

      {/* Header: Execution Type Icon & Pool/Lane */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 bg-slate-50/50 rounded-t-xl">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-500">
          {isAutomated ? <Monitor size={10} className="text-indigo-500" /> : <User size={10} className="text-emerald-500" />}
          <span className="truncate max-w-[140px]" title={`${data.pool} • ${data.lane}`}>
            {data.lane ? `${data.lane}` : 'Geral'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {hasSystem && <span title={`Sistemas: ${data.systems}`}><Database size={10} className="text-blue-400" /></span>}
          {hasNote && <span title="Possui observações"><FileText size={10} className="text-amber-400" /></span>}
        </div>
      </div>

      {/* Task label */}
      <div className="px-4 py-3.5 flex items-center justify-center min-h-[50px]">
        <p className="text-xs font-semibold leading-relaxed text-slate-700 text-center select-none break-words">
          {data.label}
        </p>
      </div>

      {/* Footer tags (if variables or systems exist) */}
      {(hasSystem || data.variables?.length > 0) && (
        <div className="flex items-center gap-1.5 border-t border-slate-100 px-3 py-1.5 bg-slate-50 rounded-b-xl text-[9px] text-slate-500 truncate">
          <span className="truncate">
            {data.systems?.length > 0 ? `💻 ${Array.isArray(data.systems) ? data.systems.join(', ') : data.systems}` : ''}
            {data.systems?.length > 0 && data.variables?.length > 0 ? ' | ' : ''}
            {data.variables?.length > 0 ? `📝 ${Array.isArray(data.variables) ? data.variables.join(', ') : data.variables}` : ''}
          </span>
        </div>
      )}
    </div>
  );
});
