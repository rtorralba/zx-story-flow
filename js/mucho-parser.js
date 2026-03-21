// ZX Story Flow - MuCho Format Parser
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

import { ScreenNode, NodeReference } from './nodes.js';

/**
 * Parse a MuCho text file into an array of ScreenNode/NodeReference POJOs.
 * @param {string} text - Raw MuCho source text
 * @returns {Array} Array of node plain objects
 */
export function parseMuchoToNodes(text) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let currentBlock = null;
    let lastOptionIdx = -1;

    lines.forEach(line => {
        if (line.startsWith('$Q ')) {
            if (currentBlock) blocks.push(currentBlock);
            const rest = line.substring(3).trim();
            // label is the first token; rest may contain attr:N dattr:N iattr:N ...
            const firstSpace = rest.search(/\s/);
            const label = firstSpace > 0 ? rest.substring(0, firstSpace) : rest;
            currentBlock = { label, descLines: [], options: [], inOptions: false };
            lastOptionIdx = -1;
        } else if (currentBlock) {
            if (line.startsWith('$A ')) {
                currentBlock.inOptions = true;
                const afterA = line.substring(3).trim();
                const spaceIdx = afterA.search(/\s/);
                const targetLabel = spaceIdx > 0 ? afterA.substring(0, spaceIdx) : afterA;
                const flag = spaceIdx > 0 ? afterA.substring(spaceIdx + 1).trim() : '';
                currentBlock.options.push({ targetLabel, flag, text: '' });
                lastOptionIdx = currentBlock.options.length - 1;
            } else if (currentBlock.inOptions && lastOptionIdx >= 0 &&
                currentBlock.options[lastOptionIdx].text === '') {
                currentBlock.options[lastOptionIdx].text = line.trim();
            } else if (!currentBlock.inOptions) {
                currentBlock.descLines.push(line);
            }
        }
    });
    if (currentBlock) blocks.push(currentBlock);

    if (blocks.length === 0) return [];

    // Build label -> nodeId map first
    const labelToId = {};
    blocks.forEach((block, idx) => {
        const nodeId = 'n' + (idx + 1);
        labelToId[block.label.toLowerCase()] = nodeId;
    });

    // Create ScreenNode instances (positions assigned by tree layout below)
    const nodes = blocks.map((block, idx) => {
        const nodeId = 'n' + (idx + 1);
        const node = ScreenNode.create(nodeId, 0, 0); // Use static factory for POJO
        node.title = block.label;
        node.text = block.descLines.join('\n').replace(/^\n+|\n+$/g, '');

        if (block.options.length > 0) {
            node.outputs = block.options.map(opt => ({
                label: opt.text || opt.targetLabel,
                target: labelToId[opt.targetLabel.toLowerCase()] || null,
                eligible: true,
                prefix: '',
                suffix: '',
                flag: opt.flag || ''
            }));
        } else {
            node.outputs = [{ label: 'Next', target: null, eligible: true, prefix: '', suffix: '' }];
        }
        // Recalculate height based on actual number of outputs
        node.height = ScreenNode.BASE_HEIGHT + node.outputs.length * ScreenNode.OPTION_HEIGHT + ScreenNode.FOOTER_HEIGHT;
        return node;
    });

    // Tree layout: BFS from root nodes, group by depth, x = depth, y = position within depth
    const idToIdx = {};
    nodes.forEach((n, i) => { idToIdx[n.id] = i; });

    // Find roots (nodes with no incoming connections)
    const indeg = new Array(nodes.length).fill(0);
    nodes.forEach(n => {
        (n.outputs || []).forEach(o => {
            if (o.target && idToIdx[o.target] !== undefined) indeg[idToIdx[o.target]]++;
        });
    });
    const roots = nodes.filter((_, i) => indeg[i] === 0);
    const startNodes = roots.length > 0 ? roots : [nodes[0]];

    // BFS to assign minimum depth to each node
    const depth = {};
    const queue = [];
    startNodes.forEach(n => { depth[n.id] = 0; queue.push(n.id); });
    while (queue.length > 0) {
        const curId = queue.shift();
        const cur = nodes[idToIdx[curId]];
        (cur.outputs || []).forEach(o => {
            if (!o.target || idToIdx[o.target] === undefined) return;
            const nd = depth[curId] + 1;
            if (depth[o.target] === undefined || nd < depth[o.target]) {
                depth[o.target] = nd;
                queue.push(o.target);
            }
        });
    }
    // Any node not reached by BFS gets its index as depth
    nodes.forEach((n, i) => { if (depth[n.id] === undefined) depth[n.id] = i; });

    // Second BFS: assign a visit-order to each node following outputs in order.
    // This ensures that within each depth column nodes appear top-to-bottom in
    // the same order as they are referenced as options by their parents.
    const visitOrder = {};
    let visitCounter = 0;
    const visitQueue = [...startNodes.map(n => n.id)];
    // seed roots in their original order
    startNodes.forEach(n => { if (visitOrder[n.id] === undefined) visitOrder[n.id] = visitCounter++; });
    while (visitQueue.length > 0) {
        const curId = visitQueue.shift();
        const cur = nodes[idToIdx[curId]];
        (cur.outputs || []).forEach(o => {
            if (!o.target || idToIdx[o.target] === undefined) return;
            if (visitOrder[o.target] === undefined) {
                visitOrder[o.target] = visitCounter++;
                visitQueue.push(o.target);
            }
        });
    }
    // Any node still without a visit order gets one now
    nodes.forEach(n => { if (visitOrder[n.id] === undefined) visitOrder[n.id] = visitCounter++; });

    // Replace back-edges (target depth <= source depth) with NodeReferences.
    // A back-edge means the link goes to an earlier or same-level node — a cycle.
    // We create a NodeReference that points to the target and connect the output to it instead.
    let refCounter = 0;
    const allNodes = [...nodes]; // will grow as we add references
    nodes.forEach(fromNode => {
        fromNode.outputs.forEach(opt => {
            if (!opt.target) return;
            const srcDepth = depth[fromNode.id] ?? 0;
            const tgtDepth = depth[opt.target] ?? 0;
            if (tgtDepth <= srcDepth) {
                // Back-edge: replace target with a new NodeReference
                const refId = 'ref_import_' + (++refCounter);
                const ref = NodeReference.create(refId, 0, 0, opt.target);
                // Auto-size width: arrow area (35px) + ~7px per char + 20px right padding
                const targetNode = nodes[idToIdx[opt.target]];
                const titleLen = (targetNode ? targetNode.title : opt.target).length;
                ref.width = Math.max(120, 35 + titleLen * 7 + 20);
                allNodes.push(ref);
                opt.target = refId; // output now points to the reference
            }
        });
    });

    // Group ScreenNodes by depth, sorted within each column by BFS visit order
    const byDepth = {};
    nodes.forEach(n => {
        const d = depth[n.id];
        if (!byDepth[d]) byDepth[d] = [];
        byDepth[d].push(n);
    });
    // Sort each column so nodes appear in the order they were first reached as options
    Object.values(byDepth).forEach(col => col.sort((a, b) => (visitOrder[a.id] ?? 0) - (visitOrder[b.id] ?? 0)));

    const NODE_W = 350;  // node width + horizontal gap
    const GAP_Y = 20;   // vertical gap between nodes
    const START_X = 80;
    const START_Y = 80;

    Object.keys(byDepth).map(Number).sort((a, b) => a - b).forEach(d => {
        let curY = START_Y;
        byDepth[d].forEach(n => {
            n.x = START_X + d * NODE_W;
            n.y = curY;
            curY += n.height + GAP_Y;
        });
    });

    // Position each NodeReference next to its source node, stacking them vertically
    // so multiple back-edge refs from the same node don't overlap.
    const refOffsetBySource = {}; // sourceNodeId -> accumulated y offset
    allNodes.forEach(n => {
        if (n.type !== 'Reference' && n.type !== 'reference') return;
        const sourceNode = nodes.find(sn => sn.outputs.some(o => o.target === n.id));
        if (sourceNode) {
            if (refOffsetBySource[sourceNode.id] === undefined) {
                refOffsetBySource[sourceNode.id] = 0;
            }
            n.x = sourceNode.x + sourceNode.width + 20;
            n.y = sourceNode.y + refOffsetBySource[sourceNode.id];
            refOffsetBySource[sourceNode.id] += n.height + 10;
        }
    });

    return allNodes;
}
