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
 * Transpiles MuCho code into ZX Basic following the flow3.zx.bas pattern:
 * cursor-based option selection with p() jump table and system subroutines.
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
                currentBlock.options[currentBlock.options.length - 1].text = line.trim() || "Continuar";
            } else {
                currentBlock.content.push(line);
            }
        }
    });

    if (blocks.length === 0) return "10 REM No screens found in MuCho code";

    // Phase 2: Collect all flag names used anywhere
    const allFlags = new Set();
    muchoCode.match(/(?:set:|clear:|clr:|toggle:|has:|not:|!)([a-zA-Z0-9_]+)/g)?.forEach(match => {
        const name = match.split(':')[1] || match.substring(1);
        if (name !== 'border') allFlags.add(name); // Exclude border from normal flags
    });

    // Phase 3: Map labels to line numbers (1000 per block, max ~9 screens before 9988)
    const labelLines = {};
    blocks.forEach((block, idx) => {
        const match = block.header.match(/^\$Q\s+([^\s]+)/);
        const label = match ? match[1] : null;
        if (label) {
            labelLines[label.toLowerCase()] = 1000 + (idx * 1000);
        }
    });

    // Phase 4: Extract default attributes from the first block header
    const firstHeader = blocks[0].header;
    const defaultTattr = parseInt(firstHeader.match(/attr:(\d+)/)?.[1] || "15");
    const defaultDattr = parseInt(firstHeader.match(/dattr:(\d+)/)?.[1] || "11");
    const defaultIattr = parseInt(firstHeader.match(/iattr:(\d+)/)?.[1] || "24");

    const firstMatch = blocks[0].header.match(/^\$Q\s+([^\s]+)/);
    const startLabel = firstMatch ? firstMatch[1].toLowerCase() : "start";

    let basicCode = "";

    // =========================================================
    // GLOBAL INIT  (lines 10 – 120)
    // =========================================================
    basicCode += `10 REM = init global =\n`;
    basicCode += `20 POKE 23693,0:BORDER 0:CLS\n`;
    basicCode += `30 REM p() table of line pointers.\n`;
    basicCode += `40 DIM p(10)\n`;
    basicCode += `50 REM Inicializa variables del juego.\n`;

    // Initialise all flags to 0 on a single line
    if (allFlags.size > 0) {
        basicCode += `60 LET ` + [...allFlags].map(f => `f${f}=0`).join(':LET ') + `:\n`;
    } else {
        basicCode += `60 REM no flags\n`;
    }

    basicCode += `70 REM 23675 for divider and selector.\n`;
    // UDG A = filled arrow (pointer), UDG B = cursor marker
    basicCode += `80 POKE USR("A")+0,BIN 00000000:POKE USR("A")+1,BIN 00010000:POKE USR("A")+2,BIN 00111000:POKE USR("A")+3,BIN 01111100:POKE USR("A")+4,BIN 11111110:POKE USR("A")+5,BIN 11111111:POKE USR("A")+6,BIN 11111111:POKE USR("A")+7,BIN 11111111:POKE USR("B")+0,BIN 00000000:POKE USR("B")+1,BIN 10001000:POKE USR("B")+2,BIN 11001100:POKE USR("B")+3,BIN 11101110:POKE USR("B")+4,BIN 11001100:POKE USR("B")+5,BIN 10001000:POKE USR("B")+6,BIN 00000000:POKE USR("B")+7,BIN 00000000:\n`;
    basicCode += `90 REM Va a primera pantalla\n`;
    basicCode += `100 GO SUB 110:GO TO ${labelLines[startLabel] || 1000}\n`;
    basicCode += `110 REM Set default attributes\n`;
    basicCode += `120 LET tattr=${defaultTattr}:LET dattr=${defaultDattr}:LET iattr=${defaultIattr}:RETURN\n`;

    // =========================================================
    // SCREEN BLOCKS
    // =========================================================
    blocks.forEach((block, idx) => {
        const match = block.header.match(/^\$Q\s+([^\s]+)/);
        const blockLabel = match ? match[1] : "Screen" + idx;
        const baseLineNr = labelLines[blockLabel.toLowerCase()] || (1000 + idx * 1000);
        const header = block.header;

        // Parse attributes for this screen
        const tattr = parseInt(header.match(/attr:(\d+)/)?.[1] || defaultTattr);
        const dattr = parseInt(header.match(/dattr:(\d+)/)?.[1] || defaultDattr);
        const iattr = parseInt(header.match(/iattr:(\d+)/)?.[1] || defaultIattr);
        const hasCustomAttr = (tattr !== defaultTattr || dattr !== defaultDattr || iattr !== defaultIattr);
        const borderMatch = header.match(/border:(\d+)/);

        let lineNr = baseLineNr;

        basicCode += `${lineNr} REM --- ${blockLabel} ---\n`;
        lineNr += 10;

        // Set custom attrs (if diverge from defaults) then call screen-init subroutine
        if (hasCustomAttr) {
            basicCode += `${lineNr} LET tattr=${tattr}:LET dattr=${dattr}:LET iattr=${iattr}:GO SUB 9988:\n`;
        } else {
            basicCode += `${lineNr} GO SUB 9988:\n`;
        }
        lineNr += 10;

        if (borderMatch) {
            basicCode += `${lineNr} BORDER ${borderMatch[1]}\n`;
            lineNr += 10;
        }

        // --- Content lines ---
        // First, group lines into paragraphs for proper block handling
        const paragraphs = [];
        let currentPara = [];
        let pendingCommand = null;

        for (let i = 0; i < block.content.length; i++) {
            const line = block.content[i];
            const trimmed = line.trim();

            if (trimmed === "" || trimmed === "$P") {
                if (currentPara.length > 0) {
                    paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
                    currentPara = [];
                    pendingCommand = null;
                }
                paragraphs.push({ type: 'empty' });
            } else if (trimmed.startsWith('$I ')) {
                // Images skipped for BASIC
            } else if (trimmed.startsWith('$O ')) {
                if (currentPara.length > 0) {
                    paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
                    currentPara = [];
                }
                pendingCommand = trimmed;
            } else if (trimmed.startsWith('$')) {
                // Other commands, flush paragraph if any
                if (currentPara.length > 0) {
                    paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
                    currentPara = [];
                    pendingCommand = null;
                }
            } else {
                currentPara.push(line);
            }
        }
        if (currentPara.length > 0) {
            paragraphs.push({ type: 'text', lines: currentPara, command: pendingCommand });
        }

        // Now generate BASIC for each paragraph
        paragraphs.forEach(para => {
            if (para.type === 'empty') {
                basicCode += `${lineNr} PRINT ""\n`;
                lineNr += 10;
            } else if (para.type === 'text') {
                const fullText = para.lines.join('\n');
                const wrappedLines = wrapText(fullText).filter(wl => wl.trim());

                if (wrappedLines.length > 0) {
                    const combinedPrint = `"${wrappedLines.join(`" '"`)}"`;

                    if (para.command && para.command.startsWith('$O ')) {
                        const condStr = para.command.substring(3);
                        const conditions = condStr.split(' AND ').map(p => {
                            const c = p.trim();
                            if (c.startsWith('has:')) return `f${c.split(':')[1]}=1`;
                            if (c.startsWith('not:') || c.startsWith('!')) {
                                const f = c.includes(':') ? c.split(':')[1] : c.substring(1);
                                return `f${f}=0`;
                            }
                            return c;
                        });
                        basicCode += `${lineNr} IF ${conditions.join(' AND ')} THEN PRINT ${combinedPrint}\n`;
                    } else {
                        basicCode += `${lineNr} PRINT ${combinedPrint}\n`;
                    }
                    lineNr += 10;
                }
            }
        });

        // --- Parse options: separate conditions (has:/not:) from actions (set:/clear:/toggle:) ---
        const effectiveOptions = block.options.length > 0
            ? block.options
            : [{ header: `$A ${startLabel}`, text: "Jugar de nuevo" }];

        // Action blocks will be placed at baseLineNr + 500 onward (safe gap after content)
        const actionBlockBase = baseLineNr + 500;

        const parsedOptions = effectiveOptions.map((opt, optIdx) => {
            const parts = opt.header.split(/\s+/);
            const targetLabelRaw = parts[1] || "";
            const targetLine = labelLines[targetLabelRaw.toLowerCase()] || baseLineNr;
            const tokens = parts.slice(2);

            const conditions = [];
            const actions = [];

            tokens.forEach(tok => {
                const [verb, name] = tok.split(':');
                if (!name) return;

                // Handle border action specifically
                if (verb === 'border') {
                    actions.push(`BORDER ${name}`);
                    return;
                }

                if (verb === 'has') conditions.push(`f${name}=1`);
                else if (verb === 'not') conditions.push(`f${name}=0`);
                else if (verb === 'set') actions.push(`LET f${name}=1`);
                else if (verb === 'clear' || verb === 'clr') actions.push(`LET f${name}=0`);
                else if (verb === 'toggle') actions.push(`LET f${name}=1-f${name}`);
            });

            const needsActionBlock = actions.length > 0;
            const actionLine = needsActionBlock ? actionBlockBase + (optIdx * 20) : null;
            const jumpTarget = needsActionBlock ? actionLine : targetLine;

            return {
                targetLine, conditions, actions, needsActionBlock, actionLine,
                jumpTarget, text: opt.text || "Continuar"
            };
        });

        // --- Option display lines (fill p() table, PRINT #1 for the menu area) ---
        parsedOptions.forEach(opt => {
            const safeText = (opt.text || "Continuar").replace(/"/g, "'").substring(0, 28);
            const condPart = opt.conditions.length > 0
                ? `IF ${opt.conditions.join(' AND ')} THEN ` : '';
            basicCode += `${lineNr} ${condPart}LET n=n+1:LET p(n)=${opt.jumpTarget}:PRINT #1;"   ${safeText}"\n`;
            lineNr += 10;
        });

        // Hand control to the cursor-selection loop
        basicCode += `${lineNr} GO TO 9993\n`;
        lineNr += 10;

        // --- Action blocks: set flags then jump to target ---
        // These live at actionBlockBase + optIdx*20 within this screen's number range
        parsedOptions.forEach((opt, optIdx) => {
            if (opt.needsActionBlock) {
                const ab = opt.actionLine;
                const safeComment = (opt.text || "option").replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30);
                basicCode += `${ab} REM ${safeComment}\n`;
                basicCode += `${ab + 10} ${opt.actions.join(':')}:GO TO ${opt.targetLine}\n`;
            }
        });
    });

    // =========================================================
    // SYSTEM SUBROUTINES  (9988 – 9999)
    // Identical in structure to flow3.zx.bas
    // =========================================================
    basicCode += `9988 REM New screen. Clear and set attributes.\n`;
    basicCode += `9989 POKE 23693,tattr:POKE 23624,dattr:CLS:POKE 23659,1:PRINT #1;AT 0,0;"{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}":POKE 23624,iattr:\n`;
    basicCode += `9990 LET n=0:REM contador opciones.\n`;
    basicCode += `9991 LET i=1\n`;
    basicCode += `9992 RETURN\n`;
    basicCode += `9993 REM choose an option\n`;
    basicCode += `9994 IF NOT n THEN PRINT #1;"  FIN  -  PRESS ANY KEY":PAUSE 1:PAUSE 0:GO TO 0:\n`;
    basicCode += `9995 PRINT #1;AT i,1;"{B}";:PAUSE 1:PAUSE 0:LET k=PEEK 23560:PRINT #1;AT i,1;" ";:\n`;
    basicCode += `9996 IF k=10 THEN LET i=i+1-(n AND i=n)\n`;
    basicCode += `9997 IF k=11 THEN LET i=i-1+(n AND i=1)\n`;
    basicCode += `9998 IF k=13 THEN GO SUB 110:GO TO p(i)\n`;
    basicCode += `9999 GO TO 9993\n`;

    return basicCode;
}

export function generateBasicFromMucho(nodes, globalConfig = null) {
    if (!nodes || nodes.length === 0) return "10 REM No nodes";

    // 1. Convert everything to MuCho intermediate format
    const muchoText = generateMucho(nodes, globalConfig);

    // 2. Transpile MuCho to ZX Basic
    return transpileMuchoToBasic(muchoText);
}
