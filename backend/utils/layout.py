import os
import sys
from typing import Dict, List, Tuple, Any

# Ensure Graphviz path is included if on Windows
if os.name == 'nt':
    os.environ["PATH"] += os.pathsep + r"C:\Program Files\Graphviz\bin"

from powl import convert_to_bpmn
from pm4py.objects.bpmn.layout import layouter
from pm4py.objects.bpmn.obj import BPMN
from agents.code_extraction import extract_resources_from_code


def layout_powl_model(powl_model, python_code: str) -> Dict[str, Any]:
    """
    Converts a POWL model to BPMN, runs layouter, and converts to React Flow JSON.
    Aligns Y coordinates strictly to Swimlanes (pools and lanes) parsed from the code AST.
    """
    # 1. Convert to BPMN and apply layouter
    bpmn_model = convert_to_bpmn(powl_model)
    layouted = layouter.apply(bpmn_model)

    # 2. Extract pools/lanes from the code
    resources = {}
    try:
        resources = extract_resources_from_code(python_code)
    except Exception as e:
        print("Error extracting resources from code AST:", e)

    # 3. Build a graph of nodes and their connections for propagation
    bpmn_nodes = list(layouted.get_nodes())
    bpmn_flows = list(layouted.get_flows())

    node_by_id = {}
    node_to_id = {}
    for i, node in enumerate(bpmn_nodes):
        node_id = f"node_{i}"
        node_by_id[node_id] = node
        node_to_id[node] = node_id

    # 4. Map task nodes to pools and lanes
    # Key: node_id, Value: (pool, lane)
    node_swimlanes = {}
    
    for node_id, node in node_by_id.items():
        if isinstance(node, BPMN.Task):
            task_name = node.get_name()
            # Clean name for matching
            matched = False
            for act_name, res in resources.items():
                if act_name == task_name or act_name.strip() == task_name.strip():
                    pool, lane = res
                    node_swimlanes[node_id] = (pool or "Cresol", lane or "Geral")
                    matched = True
                    break
            if not matched:
                # Default pool/lane
                node_swimlanes[node_id] = ("Cresol", "Geral")

    # 5. Propagate pool/lane to gateways and start/end events using BFS
    # Build adjacency list
    adj = {nid: [] for nid in node_by_id}
    for flow in bpmn_flows:
        src = flow.get_source()
        tgt = flow.get_target()
        if src in node_to_id and tgt in node_to_id:
            src_id = node_to_id[src]
            tgt_id = node_to_id[tgt]
            adj[src_id].append(tgt_id)
            adj[tgt_id].append(src_id)

    # Queue of nodes that already have a swimlane assigned
    queue = list(node_swimlanes.keys())
    visited = set(queue)

    while queue:
        curr = queue.pop(0)
        curr_pool, curr_lane = node_swimlanes[curr]
        for neighbor in adj[curr]:
            if neighbor not in visited:
                node_swimlanes[neighbor] = (curr_pool, curr_lane)
                visited.add(neighbor)
                queue.append(neighbor)

    # If any nodes are still unassigned, set to default
    for nid in node_by_id:
        if nid not in node_swimlanes:
            node_swimlanes[nid] = ("Cresol", "Geral")

    # 6. Organize pools and lanes to establish Y coordinates
    # Gather all unique (pool, lane) pairs
    swimlanes_set = set(node_swimlanes.values())
    
    # We want a stable order: pool first, then lanes
    # Sort pools and lanes
    pools = sorted(list(set(p for p, _ in swimlanes_set)))
    pool_lanes = {p: [] for p in pools}
    for p, l in sorted(list(swimlanes_set)):
        pool_lanes[p].append(l)

    # Assign vertical positions
    # Horizontal lane rows: each lane has a Y center and height.
    lane_height = 160
    lane_positions = {} # Key: (pool, lane), Value: { 'y_center': float, 'y_min': float, 'y_max': float }
    
    current_y = 50
    swimlane_layout = [] # Info to send to frontend to draw lanes
    
    for pool in pools:
        pool_start_y = current_y
        for lane in pool_lanes[pool]:
            lane_positions[(pool, lane)] = {
                'y_center': current_y + (lane_height / 2),
                'y_min': current_y,
                'y_max': current_y + lane_height
            }
            swimlane_layout.append({
                'pool': pool,
                'lane': lane,
                'yMin': current_y,
                'yMax': current_y + lane_height,
                'height': lane_height
            })
            current_y += lane_height
        # We can add space between pools if needed
        current_y += 40

    # 7. Convert nodes to React Flow format
    # Offset coordinates so that everything starts from x=100
    min_x = min([node.get_x() for node in bpmn_nodes]) if bpmn_nodes else 0
    
    react_flow_nodes = []
    
    # Track node positions to resolve overlapping Y coordinates in same lane
    lane_nodes_by_x = {} # Key: (pool, lane), Value: list of (x, node_id)

    for node_id, node in node_by_id.items():
        pool, lane = node_swimlanes[node_id]
        
        # Calculate React Flow type
        if isinstance(node, BPMN.StartEvent):
            rf_type = "start"
            label = "Início"
        elif isinstance(node, BPMN.EndEvent):
            rf_type = "end"
            label = "Fim"
        elif isinstance(node, BPMN.ExclusiveGateway):
            rf_type = "exclusiveGateway"
            label = "XOR"
        elif isinstance(node, BPMN.ParallelGateway):
            rf_type = "parallelGateway"
            label = "AND"
        elif isinstance(node, BPMN.Task):
            rf_type = "task"
            label = node.get_name()
        else:
            rf_type = "task"
            label = getattr(node, "get_name", lambda: "Activity")() or "Activity"

        # Baseline position
        x = (node.get_x() - min_x) * 1.5 + 100 # scale horizontally a bit for readability
        y = lane_positions[(pool, lane)]['y_center']

        # Add to collision tracking
        key = (pool, lane)
        if key not in lane_nodes_by_x:
            lane_nodes_by_x[key] = []
        lane_nodes_by_x[key].append((x, node_id, rf_type, label))

    # Note: collision resolution is done after building react_flow_nodes (below)

    # Actually build the React Flow nodes array
    for node_id, node in node_by_id.items():
        pool, lane = node_swimlanes[node_id]
        
        # Calculate React Flow type
        if isinstance(node, BPMN.StartEvent):
            rf_type = "start"
            label = "Início"
        elif isinstance(node, BPMN.EndEvent):
            rf_type = "end"
            label = "Fim"
        elif isinstance(node, BPMN.ExclusiveGateway):
            rf_type = "exclusiveGateway"
            label = "XOR"
        elif isinstance(node, BPMN.ParallelGateway):
            rf_type = "parallelGateway"
            label = "AND"
        elif isinstance(node, BPMN.Task):
            rf_type = "task"
            label = node.get_name()
        else:
            rf_type = "task"
            label = getattr(node, "get_name", lambda: "Activity")() or "Activity"

        x = (node.get_x() - min_x) * 1.5 + 100
        y = lane_positions[(pool, lane)]['y_center']

        react_flow_nodes.append({
            'id': node_id,
            'type': rf_type,
            'position': {'x': x, 'y': y},
            'data': {
                'label': label,
                'pool': pool,
                'lane': lane,
                'annotations': ''
            }
        })

    # Adjust Y coordinates for collision groups we computed above
    # Let's recreate node lists with correct coordinates
    node_positions = {n['id']: n['position'] for n in react_flow_nodes}
    
    # We apply the spacing to react_flow_nodes list
    for key, nodes_info in lane_nodes_by_x.items():
        nodes_info.sort(key=lambda item: item[0])
        groups = []
        for x, nid, rft, lbl in nodes_info:
            placed = False
            for group in groups:
                avg_x = sum([item[0] for item in group]) / len(group)
                if abs(x - avg_x) < 90:
                    group.append((x, nid, rft, lbl))
                    placed = True
                    break
            if not placed:
                groups.append([(x, nid, rft, lbl)])

        for group in groups:
            if len(group) > 1:
                center_y = lane_positions[key]['y_center']
                for idx, (x, nid, rft, lbl) in enumerate(group):
                    offset = (idx - (len(group) - 1) / 2) * 55
                    for n in react_flow_nodes:
                        if n['id'] == nid:
                            n['position']['y'] = center_y + offset
                            node_positions[nid] = n['position']

    # 8. Convert edges/flows to React Flow format
    react_flow_edges = []
    for i, flow in enumerate(bpmn_flows):
        src = flow.get_source()
        tgt = flow.get_target()
        if src in node_to_id and tgt in node_to_id:
            src_id = node_to_id[src]
            tgt_id = node_to_id[tgt]
            
            # Simple unique ID for the edge
            edge_id = f"edge_{i}"
            
            # Apply BPMN 2.0 rule: Sequence flow cannot cross pools. Use messageFlow.
            src_pool = node_swimlanes[src_id][0]
            tgt_pool = node_swimlanes[tgt_id][0]
            
            is_message_flow = src_pool != tgt_pool
            edge_type = 'messageFlow' if is_message_flow else 'smoothstep'
            stroke_color = '#94a3b8' if is_message_flow else '#64748b'
            stroke_dash = '5 5' if is_message_flow else 'none'
            
            react_flow_edges.append({
                'id': edge_id,
                'source': src_id,
                'target': tgt_id,
                'type': edge_type,
                'animated': not is_message_flow, # Message flows typically aren't animated like sequence flows
                'style': {'stroke': stroke_color, 'strokeWidth': 2, 'strokeDasharray': stroke_dash}
            })

    return {
        'nodes': react_flow_nodes,
        'edges': react_flow_edges,
        'swimlanes': swimlane_layout
    }
