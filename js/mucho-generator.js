import { ScreenNode } from './nodes.js';

export function generateMucho(nodes) {
    if (nodes.length === 0) return "";

    let muchoCode = "";

    const getLabel = (id) => "N" + String(id).replace(/[^a-zA-Z0-9]/g, "");
    const sanitizeText = (text) => (text || "").replace(/\r?\n/g, " ");

    nodes.forEach(node => {
        const label = getLabel(node.id);
        let description = node.text || "";
        description = description.trim();

        muchoCode += `$Q ${label} ${sanitizeText(description)}\n`;

        // Iterate all options
        node.outputs.forEach((opt) => {
            if (opt.target) {
                const targetLabel = getLabel(opt.target);
                const choiceText = sanitizeText(opt.label);
                muchoCode += `$A ${targetLabel} ${choiceText}\n`;
            }
        });

        muchoCode += "\n";
    });

    return muchoCode;
}
