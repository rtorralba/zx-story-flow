// CYD generator - Traduce la estructura de nodos directamente al formato ChooseYourDestiny
// Añadido por ayuda del asistente.

// Helper: convert color name to spectrum number (0-7)
function colorToZX(colorName) {
    const colors = {
        'black': 0, 'blue': 1, 'red': 2, 'magenta': 3,
        'green': 4, 'cyan': 5, 'yellow': 6, 'white': 7
    };
    return (colors[colorName] !== undefined) ? colors[colorName] : 7;
}

function slugify(text) {
    return (text || '').toString().replace(/[^a-zA-Z0-9_]/g, '') || null;
}

function parseFlagToCmds(flagStr) {
    if (!flagStr) return [];
    // Support multiple actions separated by commas or semicolons or spaces
    const parts = flagStr.split(/[,;]+|\s+/).map(s => s.trim()).filter(Boolean);
    const cmds = [];
    parts.forEach(p => {
        const seg = p.split(':');
        const action = seg[0];
        const name = seg[1];
        if ((action === 'set' || action === 'SET') && name) cmds.push(`SET ${name} TO 1`);
        else if ((action === 'clear' || action === 'clr' || action === 'CLEAR') && name) cmds.push(`SET ${name} TO 0`);
        else if ((action === 'toggle' || action === 'TOGGLE') && name) cmds.push(`SET ${name} TO 1-@${name}`);
        else if (action === 'custom' && seg.length > 1) cmds.push(seg.slice(1).join(':'));
        else cmds.push(p); // pass-through unknown
    });
    return cmds;
}

export function generateCYD(nodes, globalConfig = null) {
    if (!nodes || nodes.length === 0) return '';

    const screenNodes = nodes.filter(n => n && (n.type === 'Screen' || (n.constructor && n.constructor.name === 'ScreenNode')));
    if (screenNodes.length === 0) return '';

    if (!globalConfig) globalConfig = { page: { ink: 'white', paper: 'black', bright: false, flash: false } };

    // Helper: resolve NodeReference-like targets
    function resolveNodeId(nodeId) {
        if (!nodeId) return null;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;
        // NodeReference stores targetNodeId
        if (node.targetNodeId !== undefined && node.targetNodeId !== null) {
            return resolveNodeId(node.targetNodeId);
        }
        return nodeId;
    }

    // Build label map for screen nodes
    const labelMap = {};
    screenNodes.forEach(node => {
        const lbl = slugify(node.title) || `Node${node.id}`;
        labelMap[node.id] = lbl;
    });

    // Collect all flags used across nodes (outputs flags, actions, conditionalParagraphs)
    const flagSet = new Set();
    const flagPattern = /(?:set:|clear:|clr:|toggle:|has:|not:|!)([a-zA-Z0-9_]+)/g;

    // Collect all images used in paragraphImages and map to numeric ids (1-based)
    const imageSet = [];
    nodes.forEach(n => {
        if (n.paragraphImages) {
            n.paragraphImages.forEach(pi => {
                if (pi && pi.imageName) {
                    const name = pi.imageName;
                    if (!imageSet.includes(name)) imageSet.push(name);
                }
            });
        }
    });
    const imageMap = {};
    imageSet.forEach((name, idx) => { imageMap[name] = idx + 1; });

    nodes.forEach(n => {
        // actions on node header
        if (n.actions) {
            let m;
            while ((m = flagPattern.exec(n.actions)) !== null) flagSet.add(m[1]);
        }
        // outputs flags
        if (n.outputs) n.outputs.forEach(o => { if (o.flag) { const parts = o.flag.split(/[:,;]/); const name = parts.length === 2 ? parts[1] : parts[0]; flagSet.add(name); } });
        // conditional paragraphs
        if (n.conditionalParagraphs) {
            n.conditionalParagraphs.forEach(cp => {
                if (cp.conditions) cp.conditions.forEach(c => { if (c.flag) flagSet.add(c.flag); });
            });
        }
    });

    // Map flags to numeric variable indices
    const flagList = Array.from(flagSet);
    const flagIndex = {};
    flagList.forEach((f, i) => flagIndex[f] = i);

    const out = [];

    // Emit declarations for named flags
    flagList.forEach((f, i) => {
        out.push(`[[ DECLARE ${i} AS ${f} ]]`);
    });

    // Emit image mapping as comments (optional) -- user may need to place images in IMAGES folder
    if (imageSet.length > 0) {
        out.push(`/* Images used: ${imageSet.map((n,i) => `${i+1}=${n}`).join(', ')} */`);
    }

    // Iterate screens
    screenNodes.forEach(node => {
        const label = labelMap[node.id];

        // page attributes
        const pageCfg = (node.useCustomConfig && node.pageConfig) ? node.pageConfig : globalConfig.page;
        const ink = colorToZX(pageCfg?.ink || 'white');
        const paper = colorToZX(pageCfg?.paper || 'black');
        const bright = pageCfg?.bright ? 1 : 0;
        const flash = pageCfg?.flash ? 1 : 0;

        // Header command block: include LABEL so a GOTO will execute the CLEAR
        const headerParts = [`INK ${ink}`, `PAPER ${paper}`, `BRIGHT ${bright}`, `FLASH ${flash}`];
        if (node.actions && node.actions.trim()) headerParts.push(node.actions.trim());
        headerParts.push(`LABEL ${label}`);
        headerParts.push('CLEAR');
        out.push(`[[ ${headerParts.join(' : ')} ]]`);

        // Text content handled per-paragraph to support conditionalParagraphs
        const rawText = (node.text || '').replace(/\r\n/g, '\n');
        // Preserve empty paragraphs so we can count blank lines between image and text
        const paragraphs = rawText.length > 0 ? rawText.split(/\n\n/) : [];

        // Helper to build expression from conditions array
        function buildExpr(conds) {
            if (!conds || conds.length === 0) return null;
            const parts = conds.map(c => {
                const t = (c.type || '').toLowerCase();
                const name = c.flag;
                if (!name) return null;
                if (t === 'has' || t === 'set') return `@${name} = 1`;
                if (t === 'not' || t === 'clr' || t === 'clear' || t === '!') return `@${name} <> 1`;
                // custom or unknown => try using raw
                return c.type && c.flag ? `${c.type}:${c.flag}` : `@${name}`;
            }).filter(Boolean);
            return parts.join(' AND ');
        }

        // For each paragraph, check if there's a conditionalParagraph mapping
        for (let pi = 0; pi < paragraphs.length; pi++) {
            const para = paragraphs[pi];
            // If paragraph has associated image, prepare image commands and compute blank lines following
            const imgEntry = (node.paragraphImages || []).find(pii => pii.paragraphIndex === pi);
            const hasImage = imgEntry && imgEntry.imageName && imageMap[imgEntry.imageName];
            const imageCmds = hasImage ? [`[[ PICTURE ${imageMap[imgEntry.imageName]} ]]`, `[[ DISPLAY 1 ]]`] : null;

            // If there's an image, count how many immediately following empty paragraphs (blank lines)
            let blankAfter = 0;
            if (hasImage) {
                let j = pi + 1;
                while (j < paragraphs.length && (!paragraphs[j] || paragraphs[j].trim() === '')) {
                    blankAfter++; j++;
                }
            }

            const condEntry = (node.conditionalParagraphs || []).find(cp => cp.paragraphIndex === pi);

            if (condEntry && condEntry.conditions && condEntry.conditions.length > 0) {
                const expr = buildExpr(condEntry.conditions);
                if (expr) {
                    out.push(`[[ IF ${expr} THEN ]]`);
                    if (hasImage) {
                        imageCmds.forEach(c => out.push(c));
                        // set margins so following text starts below the image according to blankAfter
                        if (blankAfter > 0) {
                            const top = blankAfter;
                            const height = Math.max(1, 24 - top);
                            out.push(`[[ MARGINS 0, ${top}, 32, ${height} ]]`);
                            out.push(`[[ CLEAR ]]`);
                        }
                    } else if (para && para.length > 0) {
                        out.push(para);
                    }
                    out.push(`[[ ENDIF ]]`);

                    // if we consumed blank paragraphs after image, skip them
                    if (hasImage && blankAfter > 0) pi += blankAfter;
                    continue;
                }
            }

            // No condition: emit paragraph or image commands
            if (hasImage) {
                imageCmds.forEach(c => out.push(c));
                if (blankAfter > 0) {
                    const top = blankAfter;
                    const height = Math.max(1, 24 - top);
                    out.push(`[[ MARGINS 0, ${top}, 32, ${height} ]]`);
                    out.push(`[[ CLEAR ]]`);
                }
                // skip the blank paragraphs we've consumed
                if (blankAfter > 0) pi += blankAfter;
            } else if (para && para.length > 0) {
                out.push(para);
            }
        }

        // If there were no paragraphs but rawText exists (single paragraph), output it
        if (paragraphs.length === 0 && rawText.length > 0) out.push(rawText);

        // Options
        const intermediateLabels = [];
        if (node.outputs && node.outputs.length > 0) {
            node.outputs.forEach((opt, idx) => {
                const choiceText = (opt.label || (`Option ${idx+1}`)).replace(/\r?\n/g, ' ').trim();
                if (opt.target) {
                    const resolved = resolveNodeId(opt.target);
                    const targetLabel = (resolved && labelMap[resolved]) ? labelMap[resolved] : (slugify(opt.target) || `Node${opt.target}`);

                    if (opt.flag && opt.flag.trim()) {
                        const optLabel = `${label}_opt${idx}`;
                        const cmds = parseFlagToCmds(opt.flag);
                        const inline = [...cmds, `GOTO ${targetLabel}`].join(' : ');
                        intermediateLabels.push(`[[ #${optLabel} : ${inline} ]]`);
                        out.push(`[[ OPTION GOTO ${optLabel} ]]${choiceText}`);
                    } else {
                        out.push(`[[ OPTION GOTO ${targetLabel} ]]${choiceText}`);
                    }
                } else {
                    out.push(`[[ OPTION GOTO ${label} ]]${choiceText}`);
                }
            });

            out.push('[[ CHOOSE ]]');
            intermediateLabels.forEach(l => out.push(l));
        } else {
            out.push('[[ WAITKEY : END ]]');
        }

        out.push('');
    });

    return out.join('\n');
}

export default generateCYD;
