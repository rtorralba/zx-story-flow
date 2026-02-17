import { ScreenNode } from './nodes.js';

export function generateBasic(nodes, connections) {
    if (nodes.length === 0) return "10 REM No nodes defined";

    let basicCode = "";
    let lineNumber = 10;

    // Helper to get next line number
    const nextLine = () => { lineNumber += 10; return lineNumber; };

    // 1. Assign base line numbers to nodes
    // We'll use a map to store the assigned start line for each node
    const nodeLines = new Map();
    let currentNodeLine = 1000;

    nodes.forEach(node => {
        nodeLines.set(node.id, currentNodeLine);
        currentNodeLine += 1000; // Leave ample space between nodes
    });

    // 2. Generate Header
    const startNode = nodes[0]; // Simplification: First node is start
    basicCode += `10 CLS\n`;
    basicCode += `20 GOTO ${nodeLines.get(startNode.id)}\n`;

    // 3. Generate Code for each node
    nodes.forEach(node => {
        let currentLine = nodeLines.get(node.id);

        // Add a comment/REM for readability (optional, but helpful)
        basicCode += `${currentLine} REM --- ${node.title} ---\n`;
        currentLine += 10;

        // Common Screen Logic
        basicCode += `${currentLine} CLS\n`;
        currentLine += 10;

        // Print text
        // Sanitization:
        // 1. Replace double quotes with single quotes to avoid breaking the string literal.
        // 2. Replace newlines with ZX Spectrum PRINT separation: " ' " (quote, apostrophe for newline, quote)
        // Note: We need to be careful not to create empty strings like "" ' "" if not needed, but BASIC usually tolerates it or we can trim.

        let safeText = (node.text || "").replace(/"/g, "'");
        // Replace newlines with Quote-Apostrophe-Quote to break lines in BASIC
        safeText = safeText.replace(/\n/g, "\" ' \"");

        basicCode += `${currentLine} PRINT "${safeText}"\n`;
        currentLine += 10;

        // Check if options exist
        if (node.outputs.length <= 1) {
            // Simple flow: Press any key to continue
            basicCode += `${currentLine} PRINT "Press any key to continue..."\n`;
            currentLine += 10;

            basicCode += `${currentLine} PAUSE 0\n`;
            currentLine += 10;

            const conn = connections.find(c => c.fromNodeId === node.id);
            if (conn) {
                const targetLine = nodeLines.get(conn.toNodeId);
                basicCode += `${currentLine} GOTO ${targetLine}\n`;
            } else {
                basicCode += `${currentLine} STOP\n`;
            }
        } else {
            // Multiple options: Show menu and Input
            node.outputs.forEach((opt, idx) => {
                // Remove newlines from labels entirely, they are single line inputs
                const safeLabel = opt.label.replace(/"/g, "'").replace(/\n/g, " ");
                basicCode += `${currentLine} PRINT "${idx + 1}. ${safeLabel}"\n`;
                currentLine += 10;
            });

            basicCode += `${currentLine} INPUT A$\n`;
            currentLine += 10;

            // Generate IFs
            node.outputs.forEach((opt, idx) => {
                const conn = connections.find(c => c.fromNodeId === node.id && c.fromPortIndex === idx);
                if (conn) {
                    const targetLine = nodeLines.get(conn.toNodeId);
                    const safeLabel = opt.label.replace(/"/g, "'").replace(/\n/g, " ");
                    basicCode += `${currentLine} IF A$="${idx + 1}" OR A$="${safeLabel}" THEN GOTO ${targetLine}\n`;
                    currentLine += 10;
                }
            });

            // Loop back if invalid input
            basicCode += `${currentLine} GOTO ${nodeLines.get(node.id)}\n`;
        }
    });

    return basicCode;
}
