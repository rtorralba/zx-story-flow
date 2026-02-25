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
    if (node instanceof NodeReference) {
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

export function generateMucho(nodes, globalConfig = null) {
    if (nodes.length === 0) return "";

    // Filter out references - only process ScreenNodes
    const screenNodes = nodes.filter(n => n instanceof ScreenNode);
    if (screenNodes.length === 0) return "";

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

    screenNodes.forEach(node => {
        const label = labelMap[node.id];
        let description = node.text || "";
        description = description.trim();

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

        // Build $Q line, appending any node-level actions
        const actionsStr = node.actions && node.actions.trim() ? ' ' + node.actions.trim() : '';
        muchoCode += `$Q ${label} attr:${pageAttr} dattr:${sepAttr} iattr:${intAttr}${actionsStr}\n`;
        muchoCode += description + '\n';

        // Iterate all options
        node.outputs.forEach((opt) => {
            if (opt.target) {
                const resolvedTarget = resolveNodeId(opt.target, nodes);
                if (resolvedTarget) {
                    // Use the label from the map for the target node
                    const targetLabel = labelMap[resolvedTarget] || ("N" + resolvedTarget);
                    const choiceText = opt.label.replace(/\n/g, " ").trim();

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
