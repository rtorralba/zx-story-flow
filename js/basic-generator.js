// ZX Story Flow - BASIC Code Generator
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

import { ScreenNode } from './nodes.js';

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

export function generateBasic(nodes, globalConfig = null) {
    if (nodes.length === 0) return "10 REM No nodes defined";

    // Default global config
    if (!globalConfig) {
        globalConfig = {
            page: { ink: 'white', paper: 'black', bright: false, flash: false },
            separator: { ink: 'white', paper: 'black', bright: false, flash: false },
            interface: { ink: 'white', paper: 'black', bright: false, flash: false }
        };
    }

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
    
    // Get page configuration for the first node to apply before initial CLS
    const firstPageConfig = (startNode.useCustomConfig && startNode.pageConfig) 
        ? startNode.pageConfig 
        : globalConfig.page;
    
    basicCode += `10 INK ${colorToZX(firstPageConfig.ink)}: PAPER ${colorToZX(firstPageConfig.paper)}: BRIGHT ${firstPageConfig.bright ? 1 : 0}: FLASH ${firstPageConfig.flash ? 1 : 0}\n`;
    basicCode += `20 CLS\n`;
    basicCode += `30 GO TO ${nodeLines.get(startNode.id)}\n`;

    // 3. Generate Code for each node
    nodes.forEach(node => {
        let currentLine = nodeLines.get(node.id);

        // Add a comment/REM for readability (optional, but helpful)
        basicCode += `${currentLine} REM --- ${node.title} ---\n`;
        currentLine += 10;

        // Common Screen Logic
        basicCode += `${currentLine} CLS\n`;
        currentLine += 10;
        
        // Get page configuration (use node config if exists, else global)
        const pageConfig = (node.useCustomConfig && node.pageConfig) 
            ? node.pageConfig 
            : globalConfig.page;
        const pageInk = pageConfig.ink;
        const pagePaper = pageConfig.paper;
        const pageBright = pageConfig.bright;
        const pageFlash = pageConfig.flash;
        
        // Apply page attributes
        basicCode += `${currentLine} INK ${colorToZX(pageInk)}: PAPER ${colorToZX(pagePaper)}: BRIGHT ${pageBright ? 1 : 0}: FLASH ${pageFlash ? 1 : 0}\n`;
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
            // Multiple options: Show menu with separator and interface attributes
            
            // Get separator configuration (use node config if exists, else global)
            const sepConfig = (node.useCustomConfig && node.separatorConfig) 
                ? node.separatorConfig 
                : globalConfig.separator;
            const sepInk = sepConfig.ink;
            const sepPaper = sepConfig.paper;
            const sepBright = sepConfig.bright;
            const sepFlash = sepConfig.flash;
            
            // Get interface configuration (use node config if exists, else global)
            const intConfig = (node.useCustomConfig && node.interfaceConfig) 
                ? node.interfaceConfig 
                : globalConfig.interface;
            const intInk = intConfig.ink;
            const intPaper = intConfig.paper;
            const intBright = intConfig.bright;
            const intFlash = intConfig.flash;
            
            // Calculate screen position: separator + options should be at bottom
            // ZX Spectrum has 24 lines (0-23), but lines 22-23 are INPUT area
            // We need: 1 line for separator + node.outputs.length lines for options
            // Options should end at line 21 maximum
            const totalLines = 1 + node.outputs.length; // separator + options
            const startLine = 21 - totalLines + 1; // Start position for separator
            
            // Apply separator attributes and print separator at calculated position
            basicCode += `${currentLine} INK ${colorToZX(sepInk)}: PAPER ${colorToZX(sepPaper)}: BRIGHT ${sepBright ? 1 : 0}: FLASH ${sepFlash ? 1 : 0}\n`;
            currentLine += 10;
            basicCode += `${currentLine} PRINT AT ${startLine},0;"--------------------------------"\n`;
            currentLine += 10;
            
            // Apply interface attributes
            basicCode += `${currentLine} INK ${colorToZX(intInk)}: PAPER ${colorToZX(intPaper)}: BRIGHT ${intBright ? 1 : 0}: FLASH ${intFlash ? 1 : 0}\n`;
            currentLine += 10;

            node.outputs.forEach((opt, idx) => {
                // Remove newlines from labels entirely, they are single line inputs
                const safeLabel = opt.label.replace(/"/g, "'").replace(/\n/g, " ");
                const optionLine = startLine + 1 + idx; // Position each option below separator
                basicCode += `${currentLine} PRINT AT ${optionLine},0;"${idx + 1}. ${safeLabel}"\n`;
                currentLine += 10;
            });

            // Restore default attributes (white on black)
            basicCode += `${currentLine} INK 7: PAPER 0: BRIGHT 0: FLASH 0\n`;
            currentLine += 10;

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
