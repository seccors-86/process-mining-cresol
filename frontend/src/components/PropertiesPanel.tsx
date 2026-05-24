import React, { useState, useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { Settings, Info, Briefcase, Code, TerminalSquare, AlertCircle } from 'lucide-react';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdateData: (id: string, data: any) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedNode, onClose, onUpdateData }) => {
  const [systemsList, setSystemsList] = useState<any[]>([]);
  const [variablesList, setVariablesList] = useState<any[]>([]);

  useEffect(() => {
    const fetchSelects = async () => {
      try {
        const [resSys, resVars] = await Promise.all([
          fetch('http://localhost:8000/api/systems'),
          fetch('http://localhost:8000/api/variables')
        ]);
        if (resSys.ok) setSystemsList(await resSys.json());
        if (resVars.ok) setVariablesList(await resVars.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchSelects();
  }, []);

  if (!selectedNode) return null;

  const data = selectedNode.data;
  const isTask = selectedNode.type === 'task';

  const handleUpdate = (field: string, value: string | string[]) => {
    onUpdateData(selectedNode.id, { ...data, [field]: value });
  };

  return (
    <div className="w-80 border-l border-slate-200 bg-white h-full flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2 text-slate-700">
          <Settings size={16} />
          <h3 className="font-semibold text-sm">Propriedades da Atividade</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold px-2">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Name / Label */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Info size={12} />
            Nome da Etapa
          </label>
          <input
            type="text"
            className="w-full text-sm p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={(data.label as string) || ''}
            onChange={(e) => handleUpdate('label', e.target.value)}
          />
        </div>

        {/* Pool and Lane */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Briefcase size={12} />
              Área (Pool)
            </label>
            <input
              type="text"
              className="w-full text-sm p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 transition-colors"
              value={(data.pool as string) || ''}
              onChange={(e) => handleUpdate('pool', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Briefcase size={12} />
              Papel (Lane)
            </label>
            <input
              type="text"
              className="w-full text-sm p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 transition-colors"
              value={(data.lane as string) || ''}
              onChange={(e) => handleUpdate('lane', e.target.value)}
            />
          </div>
        </div>

        {/* Only show these fields if it's a Task Node */}
        {isTask && (
          <>
            {/* Execution Type */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Settings size={12} />
                Tipo de Execução
              </label>
              <select
                className="w-full text-sm p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 transition-colors"
                value={(data.executionType as string) || 'Manual'}
                onChange={(e) => handleUpdate('executionType', e.target.value)}
              >
                <option value="Manual">Manual (Humano)</option>
                <option value="Sistema">Automática (Sistema)</option>
              </select>
            </div>

            {/* Linked Systems */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <TerminalSquare size={12} />
                Sistemas Vinculados
              </label>
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
                {systemsList.length === 0 && (!data.systems || (data.systems as string[]).length === 0) && <span className="text-xs text-slate-400">Nenhum sistema.</span>}
                
                {/* Parse current systems (handles both arrays and legacy strings) */}
                {(() => {
                  const currentSys = Array.isArray(data.systems) 
                    ? data.systems 
                    : (typeof data.systems === 'string' ? data.systems.split(',').map(s=>s.trim()).filter(Boolean) : []);
                  
                  // Create a unified list of all systems to show (Database + Legacy text ones)
                  const allSystems = [...systemsList.map(s => s.name)];
                  currentSys.forEach((s: string) => {
                    if (!allSystems.includes(s)) allSystems.push(s);
                  });

                  return allSystems.map(sysName => {
                    const checked = currentSys.includes(sysName);
                    const isRegistered = systemsList.some(s => s.name === sysName);

                    return (
                      <label key={sysName} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={checked}
                          onChange={(e) => {
                            const newSys = e.target.checked 
                              ? [...currentSys, sysName]
                              : currentSys.filter((s: string) => s !== sysName);
                            handleUpdate('systems', newSys);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={isRegistered ? "" : "italic text-slate-500"}>
                          {sysName} {isRegistered ? '' : '(Não cadastrado)'}
                        </span>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Variables / Inputs & Outputs */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Code size={12} />
                Variáveis / Documentos
              </label>
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
                {variablesList.length === 0 && (!data.variables || (data.variables as string[]).length === 0) && <span className="text-xs text-slate-400">Nenhuma variável.</span>}
                
                {(() => {
                  const currentVars = Array.isArray(data.variables) 
                    ? data.variables 
                    : (typeof data.variables === 'string' ? data.variables.split(',').map(s=>s.trim()).filter(Boolean) : []);
                  
                  const allVars = [...variablesList.map(v => v.name)];
                  currentVars.forEach((v: string) => {
                    if (!allVars.includes(v)) allVars.push(v);
                  });

                  return allVars.map(varName => {
                    const checked = currentVars.includes(varName);
                    const isRegistered = variablesList.some(v => v.name === varName);

                    return (
                      <label key={varName} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={checked}
                          onChange={(e) => {
                            const newVars = e.target.checked 
                              ? [...currentVars, varName]
                              : currentVars.filter((v: string) => v !== varName);
                            handleUpdate('variables', newVars);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={isRegistered ? "" : "italic text-slate-500"}>
                          {varName} {isRegistered ? '' : '(Não cadastrada)'}
                        </span>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>
          </>
        )}

        {/* Observations / Rules */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <AlertCircle size={12} />
            Regras / Observações
          </label>
          <textarea
            rows={5}
            className="w-full text-sm p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            placeholder="Descreva aqui as regras de negócio, metadados ou restrições desta etapa..."
            value={(data.annotations as string) || ''}
            onChange={(e) => handleUpdate('annotations', e.target.value)}
          />
        </div>

      </div>
    </div>
  );
};
