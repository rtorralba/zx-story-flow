import { ScreenNode } from './nodes.js';

export function generateBasic(nodes) {
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
    basicCode += `20 GO TO ${nodeLines.get(startNode.id)}\n`;

    // 3. Generate Code for each node
    nodes.forEach(node => {
        let currentLine = nodeLines.get(node.id);

        // Add a comment/REM for readability (optional, but helpful)
        basicCode += `${currentLine} REM --- ${node.title} ---\n`;
        currentLine += 10;

        // Common Screen Logic
        basicCode += `${currentLine} CLS\n`;
        currentLine += 10;

        // Print text with word-aware wrapping for ZX Spectrum 32-char screen
        // 1. Replace quotes
        // 2. Word-wrap at 32 characters
        // 3. Use BASIC newline separator (' in PRINT)

        const wrapText = (text, maxWidth = 32) => {
            // First replace quotes
            text = text.replace(/"/g, "'");

            // Split by explicit newlines first
            const paragraphs = text.split('\n');
            const wrappedLines = [];

            paragraphs.forEach(para => {
                if (para.length === 0) {
                    wrappedLines.push(''); // Preserve empty lines
                    return;
                }

                // Preservar todos los espacios, incluyendo los del principio
                let idx = 0;
                while (idx < para.length) {
                    let line = '';
                    while (idx < para.length && line.length < maxWidth) {
                        line += para[idx];
                        idx++;
                    }
                    wrappedLines.push(line);
                }
            });

            // Join with BASIC newline separator
            return wrappedLines.join('" \' "');
        };

        const safeText = wrapText(node.text || "");
        basicCode += `${currentLine} PRINT "${safeText}"\n`;
        currentLine += 10;

        // Check if options exist
        if (node.outputs.length <= 1) {
            // Simple flow: Add blank line before continue message
            basicCode += `${currentLine} PRINT\n`;
            currentLine += 10;
            basicCode += `${currentLine} FLASH 1: PRINT "Pulsa una tecla...": FLASH 0\n`;
            currentLine += 10;

            basicCode += `${currentLine} PAUSE 0\n`;
            currentLine += 10;

            // Get target from first output
            const target = node.outputs[0]?.target;
            if (target) {
                const targetLine = nodeLines.get(target);
                basicCode += `${currentLine} GO TO ${targetLine}\n`;
            } else {
                basicCode += `${currentLine} STOP\n`;
            }
        } else {
            // Multiple options: Show menu and Input
            // Add blank line before options
            basicCode += `${currentLine} PRINT\n`;
            currentLine += 10;

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
                if (opt.target) {
                    const targetLine = nodeLines.get(opt.target);
                    basicCode += `${currentLine} IF A$="${idx + 1}" THEN GO TO ${targetLine}\n`;
                    currentLine += 10;
                }
            });

            // Loop back if invalid input
            basicCode += `${currentLine} GO TO ${nodeLines.get(node.id)}\n`;
        }
    });

    return basicCode;
}
