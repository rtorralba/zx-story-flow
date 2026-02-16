import { ScreenNode, DecisionNode } from './nodes.js';

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

        if (node instanceof ScreenNode) {
            // CLS if needed, but maybe just print? Let's CLS for every screen for now.
            basicCode += `${currentLine} CLS\n`;
            currentLine += 10;

            // Print text, handling rudimentary wrapping or just let Spectrum handle it (it wraps automatically)
            // Sanitize quotes
            const safeText = (node.text || "").replace(/"/g, "'");
            basicCode += `${currentLine} PRINT "${safeText}"\n`;
            currentLine += 10;

            basicCode += `${currentLine} PRINT "Press any key to continue..."\n`;
            currentLine += 10;

            basicCode += `${currentLine} PAUSE 0\n`;
            currentLine += 10;

            // Find connection
            const conn = connections.find(c => c.fromNodeId === node.id);
            if (conn) {
                const targetLine = nodeLines.get(conn.toNodeId);
                basicCode += `${currentLine} GOTO ${targetLine}\n`;
            } else {
                basicCode += `${currentLine} REM End of branch\n`;
                basicCode += `${currentLine + 10} STOP\n`;
            }

        } else if (node instanceof DecisionNode) {
            basicCode += `${currentLine} CLS\n`;
            currentLine += 10;

            const safeQuestion = (node.question || "").replace(/"/g, "'");
            basicCode += `${currentLine} PRINT "${safeQuestion}"\n`;
            currentLine += 10;

            basicCode += `${currentLine} INPUT A$\n`;
            currentLine += 10;

            // Find connections
            const yesConn = connections.find(c => c.fromNodeId === node.id && c.fromPortIndex === 0);
            const noConn = connections.find(c => c.fromNodeId === node.id && c.fromPortIndex === 1);

            // Handle Yes
            if (yesConn) {
                const targetLine = nodeLines.get(yesConn.toNodeId);
                basicCode += `${currentLine} IF A$="y" OR A$="Y" THEN GOTO ${targetLine}\n`;
                currentLine += 10;
            }

            // Handle No
            if (noConn) {
                const targetLine = nodeLines.get(noConn.toNodeId);
                basicCode += `${currentLine} IF A$="n" OR A$="N" THEN GOTO ${targetLine}\n`;
                currentLine += 10;
            }

            // Loop back if invalid input
            basicCode += `${currentLine} GOTO ${nodeLines.get(node.id)}\n`;
        }
    });

    return basicCode;
}
