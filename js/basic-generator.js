// ZX Story Flow - BASIC Code Generator
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

export function generateBasic(nodes, globalConfig = null) {
    if (nodes.length === 0) return "10 REM No nodes defined";

    // Filter out references - only process ScreenNodes
    const screenNodes = nodes.filter(n => n instanceof ScreenNode);
    if (screenNodes.length === 0) return "10 REM No screen nodes defined";

    // Default global config
    if (!globalConfig) {
        globalConfig = {
            page: { ink: 'white', paper: 'black', bright: false, flash: false },
            separator: { ink: 'white', paper: 'black', bright: false, flash: false },
            interface: { ink: 'white', paper: 'black', bright: false, flash: false }
        };
    }

    // Collect all flags used in the project
    const allFlags = new Set();
    screenNodes.forEach(node => {
        // Flags from outputs
        if (node.outputs) {
            node.outputs.forEach(output => {
                if (output.flag && output.flag.trim()) {
                    // Extract flag name (e.g., "set:key" -> "key")
                    const parts = output.flag.split(':');
                    if (parts.length === 2) {
                        allFlags.add(parts[1]);
                    }
                }
            });
        }
        // Flags from conditional paragraphs
        if (node.conditionalParagraphs) {
            node.conditionalParagraphs.forEach(cp => {
                if (cp.conditions && cp.conditions.length > 0) {
                    // New format: array of conditions
                    cp.conditions.forEach(cond => {
                        if (cond.flag && cond.flag.trim()) {
                            allFlags.add(cond.flag);
                        }
                    });
                } else if (cp.flag && cp.flag.trim()) {
                    // Old format: single flag (backward compatibility)
                    const parts = cp.flag.split(':');
                    if (parts.length === 2) {
                        allFlags.add(parts[1]);
                    }
                }
            });
        }
    });

    let basicCode = "";
    let lineNumber = 10;

    // Helper to get next line number
    const nextLine = () => { lineNumber += 10; return lineNumber; };

    // 1. Assign base line numbers to nodes
    // We'll use a map to store the assigned start line for each node
    const nodeLines = new Map();
    let currentNodeLine = 1000;

    screenNodes.forEach(node => {
        nodeLines.set(node.id, currentNodeLine);
        currentNodeLine += 1000; // Leave ample space between nodes
    });

    // 2. Generate Header
    const startNode = screenNodes[0]; // Simplification: First node is start
    
    // Get page configuration for the first node to apply before initial CLS
    const firstPageConfig = (startNode.useCustomConfig && startNode.pageConfig) 
        ? startNode.pageConfig 
        : globalConfig.page;
    
    basicCode += `10 INK ${colorToZX(firstPageConfig.ink)}: PAPER ${colorToZX(firstPageConfig.paper)}: BRIGHT ${firstPageConfig.bright ? 1 : 0}: FLASH ${firstPageConfig.flash ? 1 : 0}\n`;
    basicCode += `20 CLS\n`;
    
    // Initialize flag variables (LET f=0)
    if (allFlags.size > 0) {
        let flagLine = 30;
        const flagArray = Array.from(allFlags);
        flagArray.forEach(flag => {
            // Use single letter variables for flags to avoid long names
            const varName = `f${flag}`;
            basicCode += `${flagLine} LET ${varName}=0\n`;
            flagLine += 10;
        });
        basicCode += `${flagLine} GO TO ${nodeLines.get(startNode.id)}\n`;
    } else {
        basicCode += `30 GO TO ${nodeLines.get(startNode.id)}\n`;
    }

    // 3. Generate Code for each screen node
    screenNodes.forEach(node => {
        let currentLine = nodeLines.get(node.id);

        // Add a comment/REM for readability (optional, but helpful)
        basicCode += `${currentLine} REM --- ${node.title} ---\n`;
        currentLine += 10;

        // Get page configuration (use node config if exists, else global)
        const pageConfig = (node.useCustomConfig && node.pageConfig) 
            ? node.pageConfig 
            : globalConfig.page;
        const pageInk = pageConfig.ink;
        const pagePaper = pageConfig.paper;
        const pageBright = pageConfig.bright;
        const pageFlash = pageConfig.flash;
        
        // Always set colors and clear screen at the start of each node
        // This ensures we have a clean state even if image loading fails
        basicCode += `${currentLine} INK ${colorToZX(pageInk)}: PAPER ${colorToZX(pagePaper)}: BRIGHT ${pageBright ? 1 : 0}: FLASH ${pageFlash ? 1 : 0}\n`;
        currentLine += 10;
        basicCode += `${currentLine} CLS\n`;
        currentLine += 10;
        
        // Check if there are images
        const hasParagraphImages = node.paragraphImages && node.paragraphImages.length > 0;

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
        
        // Split text into paragraphs (separated by double newlines in the original text)
        // When there are images, preserve empty lines; otherwise filter them out
        const rawParagraphs = hasParagraphImages 
            ? (node.text || "").split('\n\n')  // Keep all paragraphs including empty ones
            : (node.text || "").split('\n\n').filter(p => p.trim());  // Filter empty ones when no images
        
        // Check if there are conditional paragraphs
        const hasConditionalParagraphs = node.conditionalParagraphs && node.conditionalParagraphs.length > 0;
        
        // If there's no text at all
        if (!node.text || node.text.trim().length === 0) {
            // Check if there are images to show even without text
            if (hasParagraphImages && node.paragraphImages.length > 0) {
                // Load all images (without clearing after since there's no text to show)
                node.paragraphImages.forEach(imageData => {
                    if (imageData && imageData.imageName) {
                        // Remove .scr extension, convert to uppercase, and replace quotes for LOAD command
                        const imgName = imageData.imageName
                            .replace(/\.scr$/i, '')  // Remove .scr extension
                            .toUpperCase()            // Convert to uppercase to match TAP filename
                            .replace(/"/g, "'");      // Replace quotes
                        basicCode += `${currentLine} LOAD "${imgName}" SCREEN$\n`;
                        currentLine += 10;
                        basicCode += `${currentLine} PAUSE 0\n`;
                        currentLine += 10;
                    }
                });
                // After last image, restore text colors for menu without clearing screen
                basicCode += `${currentLine} INK ${colorToZX(pageInk)}: PAPER ${colorToZX(pagePaper)}: BRIGHT ${pageBright ? 1 : 0}: FLASH ${pageFlash ? 1 : 0}\n`;
                currentLine += 10;
            } else {
                // No text and no images - show node title
                basicCode += `${currentLine} PRINT "[ ${node.title} ]"\n`;
                currentLine += 10;
            }
        } else if (hasConditionalParagraphs || hasParagraphImages) {
            // Print each paragraph, checking if it's conditional or has an image
            rawParagraphs.forEach((paragraph, idx) => {
                const conditional = hasConditionalParagraphs ? node.conditionalParagraphs.find(cp => cp.paragraphIndex === idx) : null;
                
                // Check if there's an image for this paragraph
                const imageData = hasParagraphImages ? node.paragraphImages.find(pi => pi.paragraphIndex === idx) : null;
                
                // If there's an image, load it first
                if (imageData && imageData.imageName) {
                    // Remove .scr extension, convert to uppercase, and replace quotes for LOAD command
                    const imgName = imageData.imageName
                        .replace(/\.scr$/i, '')  // Remove .scr extension
                        .toUpperCase()            // Convert to uppercase to match TAP filename
                        .replace(/"/g, "'");      // Replace quotes
                    basicCode += `${currentLine} LOAD "${imgName}" SCREEN$\n`;
                    currentLine += 10;
                    // Set text colors to print over the image
                    basicCode += `${currentLine} INK ${colorToZX(pageInk)}: PAPER ${colorToZX(pagePaper)}: BRIGHT ${pageBright ? 1 : 0}: FLASH ${pageFlash ? 1 : 0}\n`;
                    currentLine += 10;
                }
                
                // Then print the paragraph text (either over the image or on clean screen)
                // When there's an image, preserve ALL newlines including empty ones
                if (imageData && imageData.imageName && paragraph) {
                    // Split by single newlines to preserve empty lines
                    const lines = paragraph.split('\n');
                    lines.forEach(line => {
                        if (line.trim().length === 0) {
                            // Empty line - just print blank
                            basicCode += `${currentLine} PRINT ""\n`;
                            currentLine += 10;
                        } else {
                            // Line with content - wrap and print
                            const wrappedLine = line.replace(/"/g, "'");
                            basicCode += `${currentLine} PRINT "${wrappedLine}"\n`;
                            currentLine += 10;
                        }
                    });
                } else if (conditional && (conditional.conditions || conditional.flag)) {
                    // This paragraph is conditional
                    const wrappedPara = wrapText(paragraph);
                    let conditionExpression = '';
                    
                    if (conditional.conditions && conditional.conditions.length > 0) {
                        // New format: multiple conditions combined with AND
                        const conditions = conditional.conditions.map(cond => {
                            const varName = `f${cond.flag}`;
                            return cond.type === 'has' ? `${varName}=1` : `${varName}=0`;
                        });
                        conditionExpression = conditions.join(' AND ');
                    } else if (conditional.flag) {
                        // Old format: single condition (backward compatibility)
                        const parts = conditional.flag.split(':');
                        if (parts.length === 2) {
                            const condition = parts[0]; // "has" or "not"
                            const flagName = parts[1];
                            const varName = `f${flagName}`;
                            conditionExpression = condition === 'has' ? `${varName}=1` : `${varName}=0`;
                        }
                    }
                    
                    if (conditionExpression) {
                        // Generate IF statement to print paragraph
                        basicCode += `${currentLine} IF ${conditionExpression} THEN PRINT "${wrappedPara}"\n`;
                        currentLine += 10;
                        
                        // Add blank line separator after conditional paragraph
                        if (idx < rawParagraphs.length - 1) {
                            basicCode += `${currentLine} IF ${conditionExpression} THEN PRINT ""\n`;
                            currentLine += 10;
                        }
                    }
                } else {
                    // Normal paragraph
                    const wrappedPara = wrapText(paragraph);
                    basicCode += `${currentLine} PRINT "${wrappedPara}"\n`;
                    currentLine += 10;
                    
                    // Add blank line separator between paragraphs
                    if (idx < rawParagraphs.length - 1) {
                        basicCode += `${currentLine} PRINT ""\n`;
                        currentLine += 10;
                    }
                }
            });
        } else {
            // No conditional paragraphs or images, print all text at once
            basicCode += `${currentLine} PRINT "${safeText}"\n`;
            currentLine += 10;
        }

        // Always show menu with options
        // If it's a last node (no outputs or no target), create a "Play again" option
        const target = node.outputs[0]?.target;
        const effectiveOutputs = (node.outputs.length === 0 || !target) 
            ? [{ label: "Jugar otro juego", target: startNode.id }]
            : node.outputs;
        
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
        // We need: 1 line for separator + effectiveOutputs.length lines for options
        // Options should end at line 21 maximum
        const totalLines = 1 + effectiveOutputs.length; // separator + options
        const startLine = 21 - totalLines + 1; // Start position for separator
        
        // Apply separator attributes and print separator at calculated position
        basicCode += `${currentLine} INK ${colorToZX(sepInk)}: PAPER ${colorToZX(sepPaper)}: BRIGHT ${sepBright ? 1 : 0}: FLASH ${sepFlash ? 1 : 0}\n`;
        currentLine += 10;
        basicCode += `${currentLine} PRINT AT ${startLine},0;"--------------------------------"\n`;
        currentLine += 10;
        
        // Apply interface attributes
        basicCode += `${currentLine} INK ${colorToZX(intInk)}: PAPER ${colorToZX(intPaper)}: BRIGHT ${intBright ? 1 : 0}: FLASH ${intFlash ? 1 : 0}\n`;
        currentLine += 10;

        effectiveOutputs.forEach((opt, idx) => {
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

        // Generate IFs for option selection
        effectiveOutputs.forEach((opt, idx) => {
            if (opt.target) {
                const resolvedTarget = resolveNodeId(opt.target, nodes);
                if (resolvedTarget) {
                    const targetLine = nodeLines.get(resolvedTarget);
                    
                    // Check if this option has a flag action
                    if (opt.flag && opt.flag.trim()) {
                        const parts = opt.flag.split(':');
                        if (parts.length === 2) {
                            const action = parts[0]; // "set" or "clear"
                            const flagName = parts[1];
                            const varName = `f${flagName}`;
                            
                            // Generate: IF A$="1" THEN LET fkey=1: GO TO 2000
                            const flagValue = action === 'set' ? 1 : 0;
                            basicCode += `${currentLine} IF A$="${idx + 1}" THEN LET ${varName}=${flagValue}: GO TO ${targetLine}\n`;
                            currentLine += 10;
                        } else {
                            // No flag action, just jump
                            basicCode += `${currentLine} IF A$="${idx + 1}" THEN GO TO ${targetLine}\n`;
                            currentLine += 10;
                        }
                    } else {
                        // No flag, just jump
                        basicCode += `${currentLine} IF A$="${idx + 1}" THEN GO TO ${targetLine}\n`;
                        currentLine += 10;
                    }
                }
            }
        });

        // Loop back if invalid input
        basicCode += `${currentLine} GO TO ${nodeLines.get(node.id)}\n`;
    });

    return basicCode;
}
