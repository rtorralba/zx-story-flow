import { ScreenNode, DecisionNode } from './nodes.js';

export function generateMucho(nodes, connections) {
    if (nodes.length === 0) return "";

    let muchoCode = "";

    // Helper to sanitize node IDs for Mucho labels (must be single word)
    // We'll use a prefix 'N' just to be safe and ensure it starts with a letter
    const getLabel = (id) => "N" + String(id).replace(/[^a-zA-Z0-9]/g, "");

    // Helper to sanitize text (remove newlines in $A descriptions if strictly needed, 
    // but $Q text can have them if spaced correctly. $P is used for paragraph breaks.
    // For now, we'll replace actual newlines with spaces for $A, and keep them for $Q 
    // but maybe format them?)
    const sanitizeText = (text) => (text || "").replace(/\r?\n/g, " ");

    nodes.forEach(node => {
        const label = getLabel(node.id);

        // $Q <label> <text>
        let description = "";

        if (node instanceof ScreenNode) {
            description = node.text || "";
        } else if (node instanceof DecisionNode) {
            description = node.question || "";
        }

        // Handle paragraphs: Replace double newlines with $P?
        // Mucho docs say: "To start a new paragraph, add an empty line in your text."
        // "To output an empty line, use the $P statement."
        // Let's just keep the text as is, assuming user formats it reasonably, 
        // but ensure it starts on the same line as $Q? 
        // Actually, "The text in the page descriptions is automatically formatted... 
        // To start a new paragraph, add an empty line in your text."
        // So we can just dump the text.
        // However, the first line MUST follow $Q immediately.

        // Let's normalize newlines to single spaces for the first line? 
        // Or just print it.
        // $Q label Text...

        // Let's strip the first newline if it exists to keep it clean
        description = description.trim();

        muchoCode += `$Q ${label}\n${description}\n`;

        // $A <target> <text>
        // Find connections originating from this node

        // We need to order them by port index to match the visual order (top to bottom) is likely expected
        const nodeConnections = connections
            .filter(c => c.fromNodeId === node.id)
            .sort((a, b) => a.fromPortIndex - b.fromPortIndex);

        if (node instanceof ScreenNode) {
            // Should have 1 connection usually
            if (nodeConnections.length > 0) {
                const conn = nodeConnections[0];
                const targetLabel = getLabel(conn.toNodeId);
                // Screen nodes usually say "Next" or similar, or just continue. 
                // Mucho always needs a choice text unless it's a "forced" goto? 
                // Actually Mucho choices are just options. 
                // If it's a screen node, usually we want a "Continue" option.
                muchoCode += `$A ${targetLabel} Continue\n`;
            }
            // If no connections, it's an end node.
        } else if (node instanceof DecisionNode) {
            // For each output option defined in the node
            node.outputs.forEach((opt, index) => {
                // Find connection for this index
                const conn = nodeConnections.find(c => c.fromPortIndex === index);

                if (conn) {
                    const targetLabel = getLabel(conn.toNodeId);
                    const choiceText = sanitizeText(opt.label);
                    muchoCode += `$A ${targetLabel} ${choiceText}\n`;
                }
                // If an option has no connection, it's a dead end option in Mucho? 
                // Or just don't generate it. 
                // In Mucho, you can't have an option that goes nowhere unless it's an end node (which requires checking flags etc, but we are basic here).
                // So we only generate connected options.
            });
        }

        muchoCode += "\n"; // readable separator
    });

    return muchoCode;
}
