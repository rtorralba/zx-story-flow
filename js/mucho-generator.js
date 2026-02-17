import { ScreenNode } from './nodes.js';

export function generateMucho(nodes, connections) {
    if (nodes.length === 0) return "";

    let muchoCode = "";

    const getLabel = (id) => "N" + String(id).replace(/[^a-zA-Z0-9]/g, "");
    const sanitizeText = (text) => (text || "").replace(/\r?\n/g, " ");

    nodes.forEach(node => {
        const label = getLabel(node.id);
        let description = node.text || "";
        description = description.trim();

        muchoCode += `$Q ${label}\n${description}\n`;

        // We need to order them by port index to match the visual order (top to bottom) is likely expected
        const nodeConnections = connections
            .filter(c => c.fromNodeId === node.id)
            .sort((a, b) => a.fromPortIndex - b.fromPortIndex);

        // Iterate all options
        node.outputs.forEach((opt, index) => {
            // Find connection for this index
            const conn = nodeConnections.find(c => c.fromPortIndex === index);
            if (conn) {
                const targetLabel = getLabel(conn.toNodeId);
                const choiceText = sanitizeText(opt.label);
                muchoCode += `$A ${targetLabel} ${choiceText}\n`;
            }
        });

        muchoCode += "\n";
    });

    return muchoCode;
}
