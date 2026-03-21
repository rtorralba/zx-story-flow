// ZX Story Flow - MuCho Format Generator
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

import { ScreenNode, NodeReference } from './nodes.js';

// Helper: Resolve a node ID to its actual target (following references)
function resolveNodeId(nodeId, nodes) {
    if (!nodeId) return null;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    // If it's a reference, follow it to the target
    if (node.type === 'Reference' || node.type === 'reference') {
        return resolveNodeId(node.targetNodeId, nodes);
    }

    return nodeId;
}

// Helper: Convert color name to ZX Spectrum color code (0-7)
function colorToZX(colorName) {
    const colors = {
        'black': 0,
        'blue': 1,
        'red': 2,
        'magenta': 3,
        'green': 4,
        'cyan': 5,
        'yellow': 6,
        'white': 7
    };
    return colors[colorName] || 0;
}

// Helper: Calculate ZX Spectrum attribute byte
function calculateAttribute(ink, paper, bright, flash) {
    const inkVal = colorToZX(ink);
    const paperVal = colorToZX(paper);
    const brightVal = bright ? 1 : 0;
    const flashVal = flash ? 1 : 0;
    return flashVal * 128 + brightVal * 64 + paperVal * 8 + inkVal;
}

export function generateMucho(nodes, globalConfig = null, startNodeId = null) {
    if (nodes.length === 0) return "";

    // Filter out references - only process ScreenNodes.
    // The start node (if set) is placed first; remaining nodes keep their original order.
    let screenNodes = nodes.filter(n => n.type === 'Screen' || n.type === 'screen');
    if (screenNodes.length === 0) return "";
    if (startNodeId) {
        const startIdx = screenNodes.findIndex(n => n.id === startNodeId);
        if (startIdx > 0) {
            const [startNode] = screenNodes.splice(startIdx, 1);
            screenNodes = [startNode, ...screenNodes];
        }
    }

    // Default global config
    if (!globalConfig) {
        globalConfig = {
            page: { ink: 'white', paper: 'black', bright: false, flash: false },
            separator: { ink: 'white', paper: 'black', bright: false, flash: false },
            interface: { ink: 'white', paper: 'black', bright: false, flash: false }
        };
    }

    const labelMap = {};
    const slugify = (text) => (text || "").replace(/[^a-zA-Z0-9]/g, "");

    // Create a map of ID -> Slugified Title (only for screen nodes)
    screenNodes.forEach(node => {
        let label = slugify(node.title);
        // Fallback if title is empty or only special chars
        if (!label) label = "Node" + node.id;
        labelMap[node.id] = label;
    });

    let muchoCode = "";

    // Track previous-emitted attributes so we only emit changes
    let prevPageAttr = null;
    let prevSepAttr = null;
    let prevIntAttr = null;
    let prevBorderVal = null;
    let prevClsVal = null;

    screenNodes.forEach((node, nodeIndex) => {
        const label = labelMap[node.id];
        let description = node.text || "";
        // Replace lines that only contain whitespace with $P
        description = description.split(/\r?\n/).map(line => line === "" ? "$P" : line).join("\n");

        // Calculate attributes
        // Page attributes (use node config if exists, else global)
        const pageConfig = (node.useCustomConfig && node.pageConfig)
            ? node.pageConfig
            : globalConfig.page;
        const pageAttr = calculateAttribute(pageConfig.ink, pageConfig.paper, pageConfig.bright, pageConfig.flash);

        // Separator attributes (use node config if exists, else global)
        const sepConfig = (node.useCustomConfig && node.separatorConfig)
            ? node.separatorConfig
            : globalConfig.separator;
        const sepAttr = calculateAttribute(sepConfig.ink, sepConfig.paper, sepConfig.bright, sepConfig.flash);

        // Interface attributes (use node config if exists, else global)
        const intConfig = (node.useCustomConfig && node.interfaceConfig)
            ? node.interfaceConfig
            : globalConfig.interface;
        const intAttr = calculateAttribute(intConfig.ink, intConfig.paper, intConfig.bright, intConfig.flash);

        // Border color
        const borderColor = (node.useCustomConfig && node.borderColor)
            ? node.borderColor
            : (globalConfig.border || 'black');
        const borderVal = colorToZX(borderColor);

        // Clear screen (cls)
        const nodeCls = node.useCustomConfig ? (node.cls !== null && node.cls !== undefined ? node.cls : null) : null;
        const effectiveCls = nodeCls !== null ? nodeCls : (globalConfig.cls !== null && globalConfig.cls !== undefined ? globalConfig.cls : null);

        // Build $Q line, but only include flags that changed since the previous node.
        // Always emit all attribute flags for the first node.
        const parts = [];
        parts.push(label);

        const actionsStr = node.actions && node.actions.trim() ? ' ' + node.actions.trim() : '';

        if (nodeIndex === 0) {
            // First node: include all attributes
            parts.push(`attr:${pageAttr}`);
            parts.push(`dattr:${sepAttr}`);
            parts.push(`iattr:${intAttr}`);
            parts.push(`border:${borderVal}`);
            if (effectiveCls !== null) parts.push(`cls:${effectiveCls}`);
        } else {
            if (prevPageAttr === null || pageAttr !== prevPageAttr) parts.push(`attr:${pageAttr}`);
            if (prevSepAttr === null || sepAttr !== prevSepAttr) parts.push(`dattr:${sepAttr}`);
            if (prevIntAttr === null || intAttr !== prevIntAttr) parts.push(`iattr:${intAttr}`);
            if (prevBorderVal === null || borderVal !== prevBorderVal) parts.push(`border:${borderVal}`);
            if (effectiveCls !== prevClsVal) {
                if (effectiveCls !== null) parts.push(`cls:${effectiveCls}`);
            }
        }

        // Update previous values for next iteration
        prevPageAttr = pageAttr;
        prevSepAttr = sepAttr;
        prevIntAttr = intAttr;
        prevBorderVal = borderVal;
        prevClsVal = effectiveCls;

        muchoCode += `$Q ${parts.join(' ')}${actionsStr}\n`;
        muchoCode += description + '\n';

        // Iterate all options
        node.outputs.forEach((opt) => {
            if (opt.target) {
                const resolvedTarget = resolveNodeId(opt.target, nodes);
                if (resolvedTarget) {
                    // Use the label from the map for the target node
                    const targetLabel = labelMap[resolvedTarget] || ("N" + resolvedTarget);
                    const choiceText = opt.label.replace(/\n/g, " ");

                    // Add flag if present
                    let flagPart = '';
                    if (opt.flag) {
                        const parts = opt.flag.split(':');
                        if (parts.length >= 2 && parts[0] === 'custom') {
                            flagPart = ' ' + parts.slice(1).join(':');
                        } else {
                            flagPart = ' ' + opt.flag;
                        }
                    }
                    muchoCode += `$A ${targetLabel}${flagPart}\n${choiceText}\n`;
                }
            }
        });

        muchoCode += "\n";
    });

    return muchoCode;
}
