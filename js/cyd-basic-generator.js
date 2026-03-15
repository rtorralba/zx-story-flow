// ZX Story Flow - CYD → ZX BASIC transpiler
// Translates CYD intermediate format ([[ ]] blocks) to ZX Spectrum BASIC

// ── Helpers ──────────────────────────────────────────────────────────────────
function colorToZX(name) {
    const m = { black: 0, blue: 1, red: 2, magenta: 3, green: 4, cyan: 5, yellow: 6, white: 7 };
    return m[(name || '').toLowerCase()] !== undefined ? m[(name || '').toLowerCase()] : 7;
}

function wrapText(text, maxWidth = 32) {
    if (!text) return [];
    const clean = text.replace(/"/g, "'");
    const out = [];
    clean.split('\n').forEach(para => {
        if (!para.trim()) { out.push(''); return; }
        let cur = '';
        para.split(' ').forEach(w => {
            const next = cur ? cur + ' ' + w : w;
            if (next.length <= maxWidth) { cur = next; }
            else { if (cur) out.push(cur); cur = w; }
        });
        if (cur) out.push(cur);
    });
    return out;
}

// Convert CYD expression (@var, @var = 1, etc) to BASIC expression
function cydExprToBasic(expr, varMap) {
    return expr.trim()
        // @var → its BASIC variable name
        .replace(/@(\w+)/g, (_, n) => varMap[n] || `v_${n}`)
        // <> stays as-is, = stays as-is
        .replace(/\bAND\b/gi, 'AND')
        .replace(/\bOR\b/gi, 'OR')
        .replace(/\bNOT\b/gi, 'NOT ');
}

// ── Tokeniser ─────────────────────────────────────────────────────────────────
// Splits CYD source into text segments and [[ ... ]] blocks
function tokenize(src) {
    const tokens = [];
    const re = /\[\[([\s\S]*?)\]\]/g;
    let last = 0, m;
    while ((m = re.exec(src)) !== null) {
        if (m.index > last) tokens.push({ type: 'text', raw: src.slice(last, m.index) });
        tokens.push({ type: 'block', raw: m[1].trim() });
        last = m.index + m[0].length;
    }
    if (last < src.length) tokens.push({ type: 'text', raw: src.slice(last) });
    return tokens;
}

// Parse a single CYD command string into { cmd, ...args }
function parseCmd(s) {
    s = s.trim();
    let m;
    if ((m = s.match(/^DECLARE\s+(\d+)\s+AS\s+(\w+)$/i))) return { cmd: 'DECLARE', idx: +m[1], name: m[2] };
    if ((m = s.match(/^INK\s+(\d+)$/i))) return { cmd: 'INK', val: +m[1] };
    if ((m = s.match(/^PAPER\s+(\d+)$/i))) return { cmd: 'PAPER', val: +m[1] };
    if ((m = s.match(/^BRIGHT\s+(\d+)$/i))) return { cmd: 'BRIGHT', val: +m[1] };
    if ((m = s.match(/^FLASH\s+(\d+)$/i))) return { cmd: 'FLASH', val: +m[1] };
    if ((m = s.match(/^LABEL\s+(\w+)$/i))) return { cmd: 'LABEL', name: m[1] };
    if ((m = s.match(/^#(\w+)$/))) return { cmd: 'LABEL', name: m[1] };
    if (s.match(/^CLEAR$/i)) return { cmd: 'CLEAR' };
    if (s.match(/^CLS$/i)) return { cmd: 'CLEAR' };
    if ((m = s.match(/^OPTION\s+GOTO\s+(\w+)$/i))) return { cmd: 'OPTION_GOTO', label: m[1] };
    if ((m = s.match(/^OPTION\s+GOSUB\s+(\w+)$/i))) return { cmd: 'OPTION_GOSUB', label: m[1] };
    if (s.match(/^CHOOSE$/i)) return { cmd: 'CHOOSE' };
    if (s.match(/^WAITKEY$/i)) return { cmd: 'WAITKEY' };
    if (s.match(/^END$/i)) return { cmd: 'END' };
    if ((m = s.match(/^GOTO\s+(\w+)$/i))) return { cmd: 'GOTO', label: m[1] };
    if ((m = s.match(/^GOSUB\s+(\w+)$/i))) return { cmd: 'GOSUB', label: m[1] };
    if (s.match(/^RETURN$/i)) return { cmd: 'RETURN' };
    if ((m = s.match(/^IF\s+(.+?)\s+THEN$/i))) return { cmd: 'IF', expr: m[1] };
    if (s.match(/^ENDIF$/i)) return { cmd: 'ENDIF' };
    if ((m = s.match(/^ELSEIF\s+(.+?)\s+THEN$/i))) return { cmd: 'ELSEIF', expr: m[1] };
    if (s.match(/^ELSE$/i)) return { cmd: 'ELSE' };
    if ((m = s.match(/^SET\s+(\w+)\s+TO\s+(.+)$/i))) return { cmd: 'SET', name: m[1], val: m[2] };
    if ((m = s.match(/^MARGINS\s+(.+)$/i))) return { cmd: 'MARGINS', args: m[1] };
    if ((m = s.match(/^AT\s+(.+)$/i))) return { cmd: 'AT', args: m[1] };
    if ((m = s.match(/^PRINT\s+(.*)$/i))) return { cmd: 'PRINT_CMD', text: m[1] };
    if ((m = s.match(/^PICTURE\s+(\d+)$/i))) return { cmd: 'PICTURE', id: +m[1] };
    if ((m = s.match(/^DISPLAY\s+(\d+)$/i))) return { cmd: 'DISPLAY', id: +m[1] };
    if ((m = s.match(/^BORDER\s+(\d+)$/i))) return { cmd: 'BORDER', val: +m[1] };
    if ((m = s.match(/^BLIT\s+(.+)$/i))) return { cmd: 'BLIT', args: m[1] };
    if ((m = s.match(/^SCROLL\s+(.*)$/i))) return { cmd: 'SCROLL' };
    return { cmd: 'UNKNOWN', raw: s };
}

// Parse a compound block (commands separated by ' : ') into array of commands
function parseBlock(raw) {
    // Split only on ' : ' (spaced) to avoid splitting expressions like @x=1
    return raw.split(/ : /).map(parseCmd);
}

// ── Two-pass transpiler ───────────────────────────────────────────────────────
function transpileCYDToBasic(cydSrc) {
    const tokens = tokenize(cydSrc);

    // Flatten all block commands maintaining their relation to surrounding text tokens
    // Build a linear instruction stream
    const stream = []; // { kind, ... }
    let i = 0;
    while (i < tokens.length) {
        const tok = tokens[i];
        if (tok.type === 'text') {
            const text = tok.raw.replace(/^\n+/, '').replace(/\n+$/, '');
            if (text.trim()) stream.push({ kind: 'TEXT', text });
            i++;
        } else {
            // block
            const cmds = parseBlock(tok.raw);
            // Check if first cmd is OPTION_GOTO — grab option text from next text token
            if (cmds.length === 1 && (cmds[0].cmd === 'OPTION_GOTO' || cmds[0].cmd === 'OPTION_GOSUB')) {
                let optText = '';
                if (i + 1 < tokens.length && tokens[i + 1].type === 'text') {
                    optText = tokens[i + 1].raw.split('\n')[0].trim();
                    // Consume only the first line from the text token; put the rest back
                    const rest = tokens[i + 1].raw.split('\n').slice(1).join('\n');
                    if (rest.trim()) tokens[i + 1] = { type: 'text', raw: rest };
                    else i++;
                }
                stream.push({ kind: 'OPTION', label: cmds[0].label, text: optText, sub: cmds[0].cmd === 'OPTION_GOSUB' });
                i++;
            } else {
                cmds.forEach(c => stream.push({ kind: 'CMD', cmd: c }));
                i++;
            }
        }
    }

    // ── Pass 1: collect labels, build varMap ─────────────────────────────────
    const labels = {}; // name → lineNr (filled in pass 2)
    const varMap = {}; // varName → BASIC varName (e.g. "flag1" → "vFlag1" or just "vN")
    let labelOrder = [];

    stream.forEach(s => {
        if (s.kind === 'CMD') {
            if (s.cmd.cmd === 'DECLARE') {
                varMap[s.cmd.name] = `v${s.cmd.idx}`;
            } else if (s.cmd.cmd === 'LABEL') {
                if (!labels[s.cmd.name]) labelOrder.push(s.cmd.name);
                labels[s.cmd.name] = null; // will be filled in pass 2
            }
        }
    });

    // Assign line numbers: each label gets a block of 1000 lines starting at 1000
    labelOrder.forEach((lbl, idx) => {
        labels[lbl] = (idx + 1) * 1000;
    });

    // ── Pass 2: generate BASIC ────────────────────────────────────────────────
    const lines = []; // { nr, code }
    let lineNr = 10;
    const emit = (code) => { lines.push({ nr: lineNr, code }); lineNr += 10; };

    const ifStack = [];   // stack of { skipGotoIdx } for IF/ELSE/ENDIF backpatching
    let pendingOptions = []; // collected OPTION entries before CHOOSE
    let pendingInk = 7, pendingPaper = 0, pendingBright = 0, pendingFlash = 0;
    let attrPending = false;

    const flushAttr = (andCls = false) => {
        if (attrPending) {
            const cls = andCls ? ': CLS' : '';
            emit(`INK ${pendingInk}: PAPER ${pendingPaper}: BRIGHT ${pendingBright}: FLASH ${pendingFlash}${cls}`);
            attrPending = false;
        } else if (andCls) {
            emit('CLS');
        }
    };

    const getLabelLine = (lbl) => labels[lbl] !== undefined ? labels[lbl] : 9999;

    // ── Init block (flags) ─────────────────────────────────────────────────
    const initIdx = lines.length;
    emit(`INK 7: PAPER 0: BRIGHT 0: FLASH 0: CLS`);

    // Declare all variables
    Object.entries(varMap).forEach(([name, bvar]) => {
        emit(`LET ${bvar}=0: REM ${name}`);
    });

    // Remember where to put GO TO start
    const gotoStartIdx = lines.length;
    emit('GO TO 1000'); // placeholder, will patch after first label

    // Identify the last stream item that will emit a text PRINT
    const lastPrintIdx = stream.map((s, idx) => {
        if (s.kind === 'TEXT' && s.text.trim()) return idx;
        if (s.kind === 'CMD' && s.cmd.cmd === 'PRINT_CMD') return idx;
        return -1;
    }).reduce((max, i) => Math.max(max, i), -1);

    // ── Process stream ────────────────────────────────────────────────────────
    stream.forEach((s, si) => {
        if (s.kind === 'TEXT') {
            const text = s.text;
            // If entirely blank lines, emit PRINT ""
            const textLines = text.split('\n');
            // Filter out trailing empty lines from textLines to correctly identify the last one
            const lastNonEmptyLineIdx = textLines.map((l, i) => l.trim() ? i : -1).reduce((max, i) => Math.max(max, i), -1);

            textLines.forEach((tl, tlIdx) => {
                if (!tl.trim()) {
                    emit('PRINT ""');
                } else {
                    const wrappedLines = wrapText(tl);
                    wrappedLines.forEach((wl, wlIdx) => {
                        if (wl === '') {
                            emit('PRINT ""');
                        } else {
                            const isLastLineOfThisText = (tlIdx === lastNonEmptyLineIdx && wlIdx === wrappedLines.length - 1);
                            const isAbsoluteLastPrint = (si === lastPrintIdx && isLastLineOfThisText);
                            const semicolon = isAbsoluteLastPrint ? ";" : "";
                            emit(`PRINT "${wl}"${semicolon}`);
                        }
                    });
                }
            });
            return;
        }

        if (s.kind === 'OPTION') {
            pendingOptions.push({ label: s.label, text: s.text, sub: s.sub });
            return;
        }

        // CMD
        const c = s.cmd;
        switch (c.cmd) {
            case 'DECLARE':
                // already handled in pass 1
                break;

            case 'INK': pendingInk = c.val; attrPending = true; break;
            case 'PAPER': pendingPaper = c.val; attrPending = true; break;
            case 'BRIGHT': pendingBright = c.val; attrPending = true; break;
            case 'FLASH': pendingFlash = c.val; attrPending = true; break;

            case 'LABEL': {
                // Align lineNr to the label's assigned block
                const targetNr = getLabelLine(c.name);
                lineNr = targetNr;
                emit(`REM --- ${c.name} ---`);
                // If there were pending attrs, emit now (CLEAR usually follows)
                break;
            }

            case 'CLEAR':
                flushAttr(true);
                break;

            case 'BORDER':
                emit(`BORDER ${c.val}`);
                break;

            case 'SET': {
                const bvar = varMap[c.name] || `v_${c.name}`;
                const val = cydExprToBasic(c.val, varMap);
                emit(`LET ${bvar}=${val}`);
                break;
            }

            case 'GOTO':
                emit(`GO TO ${getLabelLine(c.label)}`);
                break;

            case 'GOSUB':
                emit(`GO SUB ${getLabelLine(c.label)}`);
                break;

            case 'RETURN':
                emit('RETURN');
                break;

            case 'WAITKEY':
                emit('PAUSE 0');
                break;

            case 'END':
                emit('STOP');
                break;

            case 'IF': {
                const expr = cydExprToBasic(c.expr, varMap);
                // Emit conditional skip; record index to back-patch with ENDIF line
                ifStack.push({ skipIdx: lines.length, elseIdx: null });
                emit(`IF NOT (${expr}) THEN GO TO ?????`); // backpatch later
                break;
            }

            case 'ELSE': {
                if (ifStack.length) {
                    // Emit unconditional jump past ELSE block; backpatch the IF skip
                    const frame = ifStack[ifStack.length - 1];
                    frame.elseIdx = lines.length;
                    emit(`GO TO ?????`); // skip ELSE block — backpatch at ENDIF
                    // Patch the IF skip to jump here
                    const skipLine = lineNr; // current line nr (next to be emitted)
                    lines[frame.skipIdx].code = lines[frame.skipIdx].code.replace('?????', String(skipLine));
                    frame.skipIdx = frame.elseIdx; // now backpatch this one at ENDIF
                }
                break;
            }

            case 'ELSEIF': {
                // Treat as ELSE + new IF
                if (ifStack.length) {
                    const frame = ifStack[ifStack.length - 1];
                    frame.elseIdx = lines.length;
                    emit(`GO TO ?????`);
                    const skipLine = lineNr;
                    lines[frame.skipIdx].code = lines[frame.skipIdx].code.replace('?????', String(skipLine));
                    frame.skipIdx = frame.elseIdx;
                    // New IF condition
                    const expr = cydExprToBasic(c.expr, varMap);
                    ifStack.push({ skipIdx: lines.length, elseIdx: null });
                    emit(`IF NOT (${expr}) THEN GO TO ?????`);
                }
                break;
            }

            case 'ENDIF': {
                if (ifStack.length) {
                    const frame = ifStack.pop();
                    const endifLine = lineNr;
                    lines[frame.skipIdx].code = lines[frame.skipIdx].code.replace('?????', String(endifLine));
                    emit('REM ENDIF');
                }
                break;
            }

            case 'CHOOSE': {
                const opts = pendingOptions.splice(0);
                if (opts.length === 0) break;

                const startRow = Math.max(0, 22 - opts.length - 1);

                // Print separator
                emit(`PRINT AT ${startRow},0;"${'-'.repeat(32)}"`);

                // Print option text
                opts.forEach((opt, idx) => {
                    const safeText = (opt.text || `Opción ${idx + 1}`).replace(/"/g, "'").substring(0, 28);
                    emit(`PRINT AT ${startRow + 1 + idx},0;"${idx + 1}. ${safeText}"`);
                });

                // Input loop label
                const inputLoopLine = lineNr;
                emit(`INPUT A$`);
                opts.forEach((opt, idx) => {
                    const dest = getLabelLine(opt.label);
                    emit(`IF A$="${idx + 1}" THEN GO TO ${dest}`);
                });
                emit(`GO TO ${inputLoopLine}`);
                break;
            }

            case 'PICTURE':
                // SCREEN$ image — emit LOAD comment (cannot load inside BASIC easily)
                emit(`REM PICTURE ${c.id} (LOAD image ${c.id})`);
                break;

            case 'DISPLAY':
                emit(`REM DISPLAY ${c.id}`);
                break;

            case 'MARGINS':
            case 'AT':
            case 'BLIT':
            case 'SCROLL':
                // Visual commands — skip or approximate
                emit(`REM ${c.cmd} ${c.args || ''}`);
                break;

            case 'PRINT_CMD': {
                const semicolon = (si === lastPrintIdx) ? ";" : "";
                emit(`PRINT "${(c.text || '').replace(/"/g, "'")}"${semicolon}`);
                break;
            }

            case 'UNKNOWN':
                emit(`REM ${c.raw}`);
                break;

            default:
                break;
        }
    });

    // Patch the GO TO start placeholder to point to actual first label
    const startLine = labelOrder.length > 0 ? getLabelLine(labelOrder[0]) : 1000;
    lines[gotoStartIdx].code = `GO TO ${startLine}`;

    // Assemble BASIC text
    return lines.map(l => `${l.nr} ${l.code}`).join('\n');
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Generates ZX BASIC from a CYD-type project.
 * For CYD projects the node graph is assembled into CYD format first,
 * then the CYD code is transpiled to BASIC.
 *
 * @param {Node[]} nodes
 * @param {object} globalConfig
 * @param {string} [cydGeneralCode]  - prepended general code from the global editor
 * @param {string} [cydGeneralCodeEnd]  - appended general code (end) from the global editor
 */
export function generateBasicFromCYD(nodes, globalConfig, cydGeneralCode = '', cydGeneralCodeEnd = '') {
    // Build CYD source from nodes (same logic as export-cyd-btn for CYD projects)
    const screenNodes = (nodes || []).filter(n => n && (n.type === 'Screen' || n.type === 'screen'));
    if (screenNodes.length === 0) return '10 REM No screens';

    function slugify(str) {
        return (str || '').normalize('NFD')
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s-]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/^[^a-zA-Z]+/, '')
            .substring(0, 32) || 'node';
    }

    function getLabel(id) {
        let dest = screenNodes.find(nd => nd.id === id);
        if (!dest && id) {
            const ref = nodes.find(nd => nd.id === id && nd.type === 'Reference');
            if (ref && ref.targetNodeId) dest = screenNodes.find(nd => nd.id === ref.targetNodeId);
        }
        return dest && dest.title ? slugify(dest.title) : slugify(id);
    }

    const parts = screenNodes.map(n => {
        const lines = [];
        lines.push(`[[ LABEL ${slugify(n.title || n.id)} ]]`);
        if (n.text) lines.push(n.text.replace(/\r\n/g, '\n'));
        if (Array.isArray(n.outputs) && n.outputs.length > 0) {
            n.outputs.forEach(opt => {
                if (opt.target && opt.label) {
                    lines.push(`[[ OPTION GOTO ${getLabel(opt.target)} ]]${opt.label}`);
                }
            });
            lines.push('[[ CHOOSE ]]');
        } else {
            lines.push('[[ WAITKEY ]]');
            lines.push('[[ END ]]');
        }
        return lines.join('\n');
    });

    let cydSource = parts.join('\n\n') + '\n\n[[ END ]]';
    if (cydGeneralCode && cydGeneralCode.trim()) {
        cydSource = cydGeneralCode.trim() + '\n\n' + cydSource;
    }
    if (cydGeneralCodeEnd && cydGeneralCodeEnd.trim()) {
        cydSource = cydSource + '\n\n' + cydGeneralCodeEnd.trim();
    }

    return transpileCYDToBasic(cydSource);
}
