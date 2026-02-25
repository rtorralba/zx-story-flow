// ZX Story Flow - MuCho Syntax Editor
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later

export class MuchoEditor {
    constructor(container, initialContent, onChange) {
        this.container = container;
        this.onChange = onChange;
        this.value = initialContent || "";

        this.container.innerHTML = '';
        this.container.className = 'mucho-editor-container';

        this.backdrop = document.createElement('div');
        this.backdrop.className = 'mucho-backdrop';

        this.textarea = document.createElement('textarea');
        this.textarea.className = 'mucho-textarea';
        this.textarea.value = this.value;
        this.textarea.spellcheck = false;

        // Let CSS handle coordinates and padding (the classes handle it)
        this.textarea.style.color = 'transparent';
        this.textarea.style.caretColor = '#fffa65';
        this.textarea.style.background = 'transparent';

        this.container.appendChild(this.backdrop);
        this.container.appendChild(this.textarea);

        this.textarea.addEventListener('input', this.handleInput.bind(this));
        this.textarea.addEventListener('scroll', this.handleScroll.bind(this));

        this.updateHighlights();
    }

    handleInput(e) {
        this.value = e.target.value;
        this.updateHighlights();
        if (this.onChange) this.onChange(this.value);
    }

    handleScroll() {
        this.backdrop.scrollTop = this.textarea.scrollTop;
    }

    updateHighlights() {
        const raw = this.value;
        const lines = raw.split('\n');

        const escaped = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Highlight a condition string like "has:key AND not:door"
        const highlightConditions = (condStr) => {
            return condStr.split(/(AND)/g).map(part => {
                if (part === 'AND') return `<span class="mucho-and">AND</span>`;
                // type:flag token (matching word:word)
                return part.replace(/(\w+)(:)(\S+)/g,
                    (_, type, colon, flag) =>
                        `<span class="mucho-cond-type">${escaped(type)}</span><span class="mucho-colon">${colon}</span><span class="mucho-cond-flag">${escaped(flag)}</span>`
                );
            }).join('');
        };

        const result = lines.map(line => {
            let content = escaped(line);

            // Check for tokens while preserving whitespace
            const matchImage = line.match(/^(\s*)(\$I\s+)(.*)$/i);
            if (matchImage) {
                const [_, indent, cmd, rest] = matchImage;
                content = escaped(indent) + `<span class="mucho-kw-image">${escaped(cmd)}</span><span class="mucho-image-name">${escaped(rest)}</span>`;
            }

            const matchCond = line.match(/^(\s*)(\$O\s+)(.*)$/i);
            if (matchCond) {
                const [_, indent, cmd, condStr] = matchCond;
                content = escaped(indent) + `<span class="mucho-kw-cond">${escaped(cmd)}</span>${highlightConditions(escaped(condStr))}`;
            }

            const matchLegacy = line.match(/^(\s*)(\$P.*)$/i);
            if (matchLegacy) {
                const [_, indent, cmd] = matchLegacy;
                content = escaped(indent) + `<span class="mucho-kw-legacy">${escaped(cmd)}</span>`;
            }

            // Normal lines use div to force identical block flow as textarea
            // Note: we add a zero-width space or a space for empty lines to ensure height
            return `<div class="mucho-line">${content || ' '}</div>`;
        });

        // If the text ends with a newline, we need an extra empty line div at the bottom
        if (raw.endsWith('\n')) {
            result.push('<div class="mucho-line"> </div>');
        }

        this.backdrop.innerHTML = result.join('');
    }

    // Helper to generate MuCho representation from a node's data
    static generateFromNode(node) {
        if (!node.text && (!node.paragraphImages || node.paragraphImages.length === 0)) return "";

        // Split text, but keep empty paragraphs if they have images
        const paragraphs = node.text ? node.text.split(/\n\n+/) : [];
        const conds = node.conditionalParagraphs || [];
        const imgs = node.paragraphImages || [];

        // Create an array large enough to cover all paragraphs and images
        const maxIdx = Math.max(
            paragraphs.length - 1,
            imgs.length > 0 ? Math.max(...imgs.map(i => i.paragraphIndex)) : -1,
            conds.length > 0 ? Math.max(...conds.map(c => c.paragraphIndex)) : -1
        );

        const resultParagraphs = [];

        for (let idx = 0; idx <= maxIdx; idx++) {
            let result = '';

            const img = imgs.find(i => i.paragraphIndex === idx);
            if (img && img.imageName) {
                result += `$I ${img.imageName}\n`;
            }

            const cond = conds.find(c => c.paragraphIndex === idx);
            let hasCondition = false;
            let hasSetFlags = false;

            if (cond) {
                if ((cond.conditions && cond.conditions.length > 0) || cond.flag) {
                    hasCondition = true;
                    let conditionStr = '';
                    if (cond.conditions && cond.conditions.length > 0) {
                        conditionStr = cond.conditions
                            .map(c => c.type === 'custom' ? c.flag : `${c.type}:${c.flag}`)
                            .join(' AND ');
                    } else if (cond.flag) {
                        conditionStr = cond.flag;
                    }
                    result += `$O ${conditionStr}\n`;
                }

                // Note: since $P is deprecated, flag mutations ($P set:flag) should be handled visually in the old UI 
                // or via a new specific tag if needed in the future. For now, we omit them entirely from the text.
            }

            // Text for this paragraph
            const pText = idx < paragraphs.length ? paragraphs[idx] : "";

            // Only output $P if it has setFlags, else we drop it entirely for cleanliness
            result += pText.trim();
            resultParagraphs.push(result);
        }

        return resultParagraphs.join('\n\n').trim();
    }

    // Helper to parse MuCho text back into a node's data
    static parseToNode(text, node) {
        // Split by double newline preserving structure
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
        const newText = [];
        const newConds = [];
        const newImgs = [];

        paragraphs.forEach((p, idx) => {
            const lines = p.split('\n');
            const cleanLines = [];

            let conditionData = null;
            let imageData = null;

            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('$I ')) {
                    const imgName = trimmed.substring(3).trim();
                    if (imgName) imageData = { paragraphIndex: idx, imageName: imgName };
                } else if (trimmed.startsWith('$O ')) {
                    const condStr = trimmed.substring(3).trim();
                    if (condStr) {
                        if (!conditionData) conditionData = { paragraphIndex: idx, conditions: [], setFlags: [] };
                        const condParts = condStr.split(' AND ');
                        conditionData.conditions = condParts.map(part => {
                            part = part.trim();
                            const colonIdx = part.indexOf(':');
                            if (colonIdx > 0) {
                                return { type: part.substring(0, colonIdx), flag: part.substring(colonIdx + 1) };
                            } else {
                                return { type: 'custom', flag: part };
                            }
                        });
                    }
                } else if (trimmed.startsWith('$P')) {
                    // Completamente ignorado por orden del usuario para compatibilidad.
                    // Si se usaban para setFlags, esa info deberia persistirse en el frontend visual en vez del editor de texto.
                } else {
                    cleanLines.push(line);
                }
            });

            newText.push(cleanLines.join('\n'));
            if (conditionData && (conditionData.conditions.length > 0 || conditionData.setFlags.length > 0)) {
                newConds.push(conditionData);
            }
            if (imageData) {
                newImgs.push(imageData);
            }
        });

        node.text = newText.join('\n\n');
        node.conditionalParagraphs = newConds;
        node.paragraphImages = newImgs;
    }
}
