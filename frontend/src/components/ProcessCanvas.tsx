import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  BackgroundVariant,
  useViewport,
} from '@xyflow/react';
import type { Node, Edge, OnConnect } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StartNode, EndNode, GatewayNode, TaskNode } from './CustomNodes';
import { EditorToolbar } from './EditorToolbar';

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  exclusiveGateway: GatewayNode,
  parallelGateway: GatewayNode,
  task: TaskNode,
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#64748b', strokeWidth: 2 },
};

const connectionLineStyle = {
  stroke: '#3b82f6',
  strokeWidth: 2,
  strokeDasharray: '5 5',
};

const POOL_COLORS = [
  { bg: 'bg-blue-500/8', border: 'border-blue-500/25', headerBg: 'bg-blue-500/12', text: 'text-blue-400', dot: 'bg-blue-400' },
  { bg: 'bg-purple-500/8', border: 'border-purple-500/25', headerBg: 'bg-purple-500/12', text: 'text-purple-400', dot: 'bg-purple-400' },
  { bg: 'bg-teal-500/8', border: 'border-teal-500/25', headerBg: 'bg-teal-500/12', text: 'text-teal-400', dot: 'bg-teal-400' },
  { bg: 'bg-rose-500/8', border: 'border-rose-500/25', headerBg: 'bg-rose-500/12', text: 'text-rose-400', dot: 'bg-rose-400' },
];

// In-viewport swimlane backgrounds that follow the ReactFlow transform
const InViewportSwimlanes: React.FC<{ swimlanes: any[] }> = ({ swimlanes }) => {
  const { x, y, zoom } = useViewport();
  
  if (!swimlanes || swimlanes.length === 0) return null;
  
  const poolMap: Record<string, any[]> = {};
  for (const lane of swimlanes) {
    const pool = lane.pool || 'Processo';
    if (!poolMap[pool]) poolMap[pool] = [];
    poolMap[pool].push(lane);
  }

  const inlineColors = [
    { border: 'rgba(59,130,246,0.3)', fill: 'rgba(59,130,246,0.04)', fillAlt: 'rgba(59,130,246,0.08)' },
    { border: 'rgba(168,85,247,0.3)', fill: 'rgba(168,85,247,0.04)', fillAlt: 'rgba(168,85,247,0.08)' },
    { border: 'rgba(20,184,166,0.3)', fill: 'rgba(20,184,166,0.04)', fillAlt: 'rgba(20,184,166,0.08)' },
    { border: 'rgba(244,63,94,0.3)', fill: 'rgba(244,63,94,0.04)', fillAlt: 'rgba(244,63,94,0.08)' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 0 }}>
      <div
        style={{
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {Object.entries(poolMap).map(([, lanes], poolIdx) => {
          const colors = inlineColors[poolIdx % inlineColors.length];
          const poolYMin = Math.min(...lanes.map((l: any) => l.yMin));
          const poolYMax = Math.max(...lanes.map((l: any) => l.yMax));
          const poolName = lanes[0]?.pool || 'Pool';

          return (
            <div key={`pool-${poolIdx}`}>
              {/* Pool outer border */}
              <div style={{
                position: 'absolute',
                top: poolYMin - 4,
                left: -60,
                width: 12000,
                height: poolYMax - poolYMin + 8,
                border: `2px solid ${colors.border}`,
                borderRadius: '4px',
              }} />

              {/* Pool Left Header (rotated) */}
              <div style={{
                position: 'absolute',
                top: poolYMin - 4,
                left: -100,
                width: 40,
                height: poolYMax - poolYMin + 8,
                backgroundColor: colors.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderTopLeftRadius: '4px',
                borderBottomLeftRadius: '4px',
              }}>
                <span style={{
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: 'white',
                  letterSpacing: '0.05em'
                }}>{poolName.toUpperCase()}</span>
              </div>

              {/* Lane fills + dividers + Lane Headers */}
              {lanes.map((lane: any, laneIdx: number) => (
                <div key={`lane-${poolIdx}-${laneIdx}`}>
                  <div style={{
                    position: 'absolute',
                    top: lane.yMin,
                    left: -60,
                    width: 12000,
                    height: lane.yMax - lane.yMin,
                    background: laneIdx % 2 === 0 ? colors.fill : colors.fillAlt,
                  }}>
                    {/* Lane Left Header */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 40,
                      borderRight: `1px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                       <span style={{
                        transform: 'rotate(-90deg)',
                        whiteSpace: 'nowrap',
                        fontSize: '12px',
                        color: colors.border,
                        fontWeight: 600
                      }}>{lane.lane}</span>
                    </div>
                  </div>
                  {laneIdx < lanes.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      top: lane.yMax,
                      left: -60,
                      width: 12000,
                      borderBottom: `1px dashed ${colors.border}`,
                    }} />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ProcessCanvasProps {
  nodes: Node[];
  edges: Edge[];
  swimlanes: any[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: OnConnect;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  onAddTask: () => void;
  onAddGatewayXOR: () => void;
  onAddGatewayAND: () => void;
  onAddStart: () => void;
  onAddEnd: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
}

export const ProcessCanvas: React.FC<ProcessCanvasProps> = ({
  nodes,
  edges,
  swimlanes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDoubleClick,
  onAddTask,
  onAddGatewayXOR,
  onAddGatewayAND,
  onAddStart,
  onAddEnd,
  onDeleteSelected,
  hasSelection,
}) => {
  // Group swimlanes by pool for the side panel
  const poolGroups = useMemo(() => {
    if (!swimlanes || swimlanes.length === 0) return [];
    const poolMap: Record<string, any[]> = {};
    for (const sl of swimlanes) {
      const pool = sl.pool || 'Processo';
      if (!poolMap[pool]) poolMap[pool] = [];
      poolMap[pool].push(sl);
    }
    return Object.entries(poolMap);
  }, [swimlanes]);

  return (
    <div className="relative w-full h-full flex">
      {/* ━━━ Fixed Swimlane Panel (always visible on the left) ━━━ */}
      {poolGroups.length > 0 && (
        <div className="flex-shrink-0 w-[160px] border-r border-slate-800 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-950/40">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Piscinas / Raias</span>
          </div>
          {poolGroups.map(([poolName, lanes], poolIdx) => {
            const colors = POOL_COLORS[poolIdx % POOL_COLORS.length];
            return (
              <div key={`panel-pool-${poolIdx}`} className={`border-b border-slate-800/60`}>
                {/* Pool header */}
                <div className={`flex items-center gap-2 px-3 py-2.5 ${colors.headerBg}`}>
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${colors.text}`}>
                    {poolName}
                  </span>
                </div>
                {/* Lanes within pool */}
                {lanes.map((lane: any, laneIdx: number) => (
                  <div
                    key={`panel-lane-${poolIdx}-${laneIdx}`}
                    className={`flex items-center gap-2 px-3 py-2 pl-6 border-t border-slate-800/30 ${
                      laneIdx % 2 === 0 ? colors.bg : ''
                    }`}
                  >
                    <div className={`w-1 h-6 rounded-full ${colors.dot} opacity-40`}></div>
                    <span className={`text-[10px] font-semibold ${colors.text} opacity-80`}>
                      {lane.lane}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━ Canvas Area ━━━ */}
      <div className="relative flex-1 h-full">
        <EditorToolbar
          onAddTask={onAddTask}
          onAddGatewayXOR={onAddGatewayXOR}
          onAddGatewayAND={onAddGatewayAND}
          onAddStart={onAddStart}
          onAddEnd={onAddEnd}
          onDeleteSelected={onDeleteSelected}
          hasSelection={hasSelection}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeDoubleClick={onNodeDoubleClick}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineStyle={connectionLineStyle}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.15}
          maxZoom={1.5}
          deleteKeyCode="Delete"
          selectionOnDrag
          panOnDrag={[1, 2]}
          selectionMode={1}
        >
          <Controls showInteractive={false} className="!bg-slate-900 !border-slate-800" />
          <Background variant={BackgroundVariant.Dots} color="#334155" size={1} gap={20} />
          <InViewportSwimlanes swimlanes={swimlanes} />
        </ReactFlow>
        
        <div className="absolute bottom-4 right-4 z-10 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-semibold flex items-center gap-2 pointer-events-none select-none backdrop-blur-md">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
          <span>Duplo clique para editar · Arraste handles para conectar · Delete para excluir</span>
        </div>
      </div>
    </div>
  );
};
