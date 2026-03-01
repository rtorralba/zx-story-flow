import { generateMucho } from './mucho-generator.js';

// Helper: Convert color name to ZX Spectrum color code (0-7)
function colorToZX(colorName) {
    const colors = {
        'black': 0, 'blue': 1, 'red': 2, 'magenta': 3,
        'green': 4, 'cyan': 5, 'yellow': 6, 'white': 7
    };
    return (colors[colorName] !== undefined) ? colors[colorName] : 0;
}

// Word-wrapping for ZX Spectrum 32-char screen
// Returns an array of lines to avoid exceeding Sinclair Basic 255-char line limit
function wrapText(text, maxWidth = 32) {
    if (!text) return [];
    const cleanText = text.replace(/"/g, "'");
    const paragraphs = cleanText.split('\n');
    const wrappedLines = [];

    paragraphs.forEach(para => {
        if (para.length === 0) {
            wrappedLines.push('');
            return;
        }
        let words = para.split(' ');
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + word).length <= maxWidth) {
                currentLine += (currentLine === '' ? '' : ' ') + word;
            } else {
                wrappedLines.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine) wrappedLines.push(currentLine);
    });

    return wrappedLines;
}

/**
 * Transpiles MuCho code into ZX Basic.
 */
function transpileMuchoToBasic(muchoCode) {
    if (!muchoCode) return "10 REM Project is empty";

    const lines = muchoCode.split(/\r?\n/);
    const blocks = [];
    let currentBlock = null;

    // Phase 1: Split into screen blocks
    lines.forEach(line => {
        if (line.startsWith('$Q ')) {
            currentBlock = { header: line, content: [], options: [] };
            blocks.push(currentBlock);
        } else if (currentBlock) {
            if (line.startsWith('$A ')) {
                currentBlock.options.push({ header: line, text: null });
            } else if (currentBlock.options.length > 0 && currentBlock.options[currentBlock.options.length - 1].text === null) {
                // First non-$A line after a $A is the option text
                currentBlock.options[currentBlock.options.length - 1].text = line.trim() || "Continuar";
            } else {
                // Everything else is content (including empty lines and $P)
                currentBlock.content.push(line);
            }
        }
    });

    if (blocks.length === 0) return "10 REM No screens found in MuCho code";

    // Phase 2: Identify all flags to initialize them
    const allFlags = new Set();
    muchoCode.match(/(?:set:|clear:|clr:|toggle:|has:|not:|!)([a-zA-Z0-9_]+)/g)?.forEach(match => {
        const name = match.split(':')[1] || match.substring(1);
        allFlags.add(name);
    });

    // Phase 3: Identify unique images for caching
    const images = [];
    muchoCode.match(/\$I\s+([^\s\n\r]+)/g)?.forEach(match => {
        const name = match.substring(3).trim().replace(/\.scr$/i, '').toUpperCase();
        if (!images.includes(name)) images.push(name);
    });

    const imageMap = {};
    let currentAddr = 65536;
    images.forEach(img => {
        currentAddr -= 6912;
        imageMap[img] = currentAddr;
    });

    // Phase 4: Map labels to line numbers (1000 per block) - Case Insensitive
    const labelLines = {};
    blocks.forEach((block, idx) => {
        const match = block.header.match(/^\$Q\s+([^\s]+)/);
        const label = match ? match[1] : null;
        if (label) {
            labelLines[label.toLowerCase()] = 1000 + (idx * 1000);
        }
    });

    let basicCode = "";

    // Header
    const firstBlockMatch = blocks[0].header.match(/^\$Q\s+([^\s]+)/);
    const startLabel = firstBlockMatch ? firstBlockMatch[1].toLowerCase() : "start";

    // Extract initial attributes for global state
    const attrMatch = blocks[0].header.match(/attr:(\d+)/);
    const initialAttr = attrMatch ? parseInt(attrMatch[1]) : 7;

    const paper = (initialAttr >> 3) & 7;
    const ink = initialAttr & 7;
    const bright = (initialAttr >> 6) & 1;
    const flash = (initialAttr >> 7) & 1;

    basicCode += `10 INK ${ink}: PAPER ${paper}: BRIGHT ${bright}: FLASH ${flash}\n`;
    basicCode += `20 CLS\n`;

    let currentLine = 30;
    allFlags.forEach(flag => {
        basicCode += `${currentLine} LET f${flag}=0\n`;
        currentLine += 10;
    });

    basicCode += `${currentLine} GO TO ${labelLines[startLabel] || 1000}\n`;

    // Phase 5: Generate code for each block
    blocks.forEach(block => {
        const match = block.header.match(/^\$Q\s+([^\s]+)/);
        const blockLabel = match ? match[1] : "Unknown";
        let lineNr = labelLines[blockLabel.toLowerCase()] || 9999;
        const header = block.header;

        // Parse attributes
        const attr = parseInt(header.match(/attr:(\d+)/)?.[1] || "7");
        const dattr = parseInt(header.match(/dattr:(\d+)/)?.[1] || "7");
        const iattr = parseInt(header.match(/iattr:(\d+)/)?.[1] || "7");

        basicCode += `${lineNr} REM --- ${blockLabel} ---\n`;
        lineNr += 10;

        // Apply page attributes
        basicCode += `${lineNr} INK ${attr & 7}: PAPER ${(attr >> 3) & 7}: BRIGHT ${(attr >> 6) & 1}: FLASH ${(attr >> 7) & 1}: CLS\n`;
        lineNr += 10;

        // Process block actions (borders, etc)
        const borderMatch = header.match(/border:(\d+)/);
        if (borderMatch) {
            basicCode += `${lineNr} BORDER ${borderMatch[1]}\n`;
            lineNr += 10;
        }

        // Content
        for (let i = 0; i < block.content.length; i++) {
            const line = block.content[i];
            const trimmed = line.trim();

            if (trimmed === "" || trimmed === "$P") {
                basicCode += `${lineNr} PRINT ""\n`;
                lineNr += 10;
            } else if (trimmed.startsWith('$I ')) {
                // Skiping images for now to avoid tape loading issues
                lineNr += 0;
            } else if (trimmed.startsWith('$O ')) {
                const condStr = trimmed.substring(3);
                const condParts = condStr.split(' AND ');
                const conditions = condParts.map(p => {
                    const c = p.trim();
                    if (c.startsWith('has:') || c.startsWith('set:')) return `f${c.split(':')[1]}=1`;
                    if (c.startsWith('not:') || c.startsWith('clr:') || c.startsWith('!')) {
                        const f = c.includes(':') ? c.split(':')[1] : c.substring(1);
                        return `f${f}=0`;
                    }
                    return c;
                });

                const nextLineText = block.content[i + 1] || "";
                if (nextLineText && !nextLineText.startsWith('$')) {
                    const wLines = wrapText(nextLineText);
                    wLines.forEach(wl => {
                        if (wl.trim() !== "") {
                            basicCode += `${lineNr} IF ${conditions.join(' AND ')} THEN PRINT "${wl}"\n`;
                            lineNr += 10;
                        }
                    });
                    i++; // Skip next line
                }
            } else if (!trimmed.startsWith('$')) {
                const wLines = wrapText(line);
                wLines.forEach(wl => {
                    basicCode += `${lineNr} PRINT "${wl}"\n`;
                    lineNr += 10;
                });
            }
        }

        // Options / Menu
        const effectiveOptions = block.options.length > 0
            ? block.options
            : [{ header: "$A " + startLabel, text: "Jugar de nuevo" }];

        const totalLines = 1 + effectiveOptions.length;
        const startPosLine = 21 - totalLines + 1;

        // Separator
        basicCode += `${lineNr} INK ${dattr & 7}: PAPER ${(dattr >> 3) & 7}: BRIGHT ${(dattr >> 6) & 1}: FLASH ${(dattr >> 7) & 1}\n`;
        lineNr += 10;
        basicCode += `${lineNr} PRINT AT ${startPosLine},0;"--------------------------------"\n`;
        lineNr += 10;

        // Options
        basicCode += `${lineNr} INK ${iattr & 7}: PAPER ${(iattr >> 3) & 7}: BRIGHT ${(iattr >> 6) & 1}: FLASH ${(iattr >> 7) & 1}\n`;
        lineNr += 10;

        effectiveOptions.forEach((opt, idx) => {
            const optText = opt.text || "Continuar";
            const safeLabel = optText.replace(/"/g, "'").substring(0, 28);
            basicCode += `${lineNr} PRINT AT ${startPosLine + 1 + idx},0;"${idx + 1}. ${safeLabel}"\n`;
            lineNr += 10;
        });

        // Use interface colors for INPUT prompt too
        basicCode += `${lineNr} INK ${iattr & 7}: PAPER ${(iattr >> 3) & 7}: BRIGHT ${(iattr >> 6) & 1}: FLASH ${(iattr >> 7) & 1}: INPUT A$\n`;
        lineNr += 10;

        effectiveOptions.forEach((opt, idx) => {
            const matchA = opt.header.match(/^\$A\s+([^\s]+)/);
            const target = matchA ? matchA[1].toLowerCase() : startLabel;
            const targetLine = labelLines[target] || 1000;

            const flagActions = opt.header.split(/\s+/).slice(2).map(f => {
                const parts = f.split(':');
                const action = parts[0];
                const name = parts[1];
                if (action === 'set') return `LET f${name}=1`;
                if (action === 'clear' || action === 'clr') return `LET f${name}=0`;
                if (action === 'toggle') return `LET f${name}=1-f${name}`;
                return "";
            }).filter(a => a !== "").join(': ');

            basicCode += `${lineNr} IF A$="${idx + 1}" THEN ${flagActions ? flagActions + ': ' : ''}GO TO ${targetLine}\n`;
            lineNr += 10;
        });

        // Loop back to current node
        basicCode += `${lineNr} GO TO ${labelLines[blockLabel.toLowerCase()] || 1000}\n`;
    });

    return basicCode;
}

export function generateBasicFromMucho(nodes, globalConfig = null) {
    if (!nodes || nodes.length === 0) return "10 REM No nodes";

    // 1. Convert everything to MuCho intermediate format
    const muchoText = generateMucho(nodes, globalConfig);

    // 2. Transpile MuCho to ZX Basic
    return transpileMuchoToBasic(muchoText);
}
