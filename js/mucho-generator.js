// ZX Story Flow - MuCho Format Generator
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

import { ScreenNode } from './nodes.js';

export function generateMucho(nodes) {
    if (nodes.length === 0) return "";

    const labelMap = {};
    const slugify = (text) => (text || "").replace(/[^a-zA-Z0-9]/g, "");

    // Create a map of ID -> Slugified Title
    nodes.forEach(node => {
        let label = slugify(node.title);
        // Fallback if title is empty or only special chars
        if (!label) label = "Node" + node.id;
        labelMap[node.id] = label;
    });

    let muchoCode = "";
    const sanitizeText = (text) => (text || "").replace(/\r?\n/g, " ");

    nodes.forEach(node => {
        const label = labelMap[node.id];
        let description = node.text || "";
        description = description.trim();

        muchoCode += `$Q ${label}\n${sanitizeText(description)}\n`;

        // Iterate all options
        node.outputs.forEach((opt) => {
            if (opt.target) {
                // Use the label from the map for the target node
                const targetLabel = labelMap[opt.target] || ("N" + opt.target);
                const choiceText = sanitizeText(opt.label);
                muchoCode += `$A ${targetLabel}\n${choiceText}\n`;
            }
        });

        muchoCode += "\n";
    });

    return muchoCode;
}
