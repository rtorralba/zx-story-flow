// ZX Story Flow - MuCho Syntax Editor (CodeMirror 5)
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later

import { injectSharedStyles, buildNodeEditor } from './cm-node-editor.js';
import { transliterate } from './utils.js';

// ── MuCho CodeMirror mode ────────────────────────────────────────────────────
function registerMuchoMode() {
    if (!window.CodeMirror) return;
    if (CodeMirror.modes['mucho']) return;

    CodeMirror.defineMode('mucho', () => ({
        startState: () => ({}),
        token(stream) {
            // $I <filename>
            if (stream.match(/^\$I\s+/i)) return 'mucho-cmd mucho-img-cmd';
            if (stream.sol() && stream.match(/^\$I$/i)) return 'mucho-cmd mucho-img-cmd';

            // $O <conditions>
            if (stream.match(/^\$O\s+/i)) return 'mucho-cmd';
            if (stream.sol() && stream.match(/^\$O$/i)) return 'mucho-cmd';

            // $P legacy
            if (stream.match(/^\$P\S*/i)) return 'mucho-meta';

            // AND keyword inside $O lines (peek at line context — simpler: match standalone)
            if (stream.match(/\bAND\b/)) return 'mucho-and';

            // type:flag pattern
            if (stream.match(/\w+(?=:)/)) return 'mucho-ctype';
            if (stream.match(':')) return 'mucho-colon';
            // flag (word after colon) — handled as next token, just a plain word
            if (stream.match(/\S+/)) return 'mucho-cflag';

            stream.next();
            return null;
        }
    }));
}

// Extra CSS for MuCho tokens
const MUCHO_CSS = `
.cm-mucho-cmd      { color: #ff79c6; font-weight: bold; }
.cm-mucho-img-cmd  { color: #ff79c6; font-weight: bold; }
.cm-mucho-and      { color: #bd93f9; font-weight: bold; }
.cm-mucho-ctype    { color: #8be9fd; }
.cm-mucho-colon    { color: #ffb86c; }
.cm-mucho-cflag    { color: #50fa7b; }
.cm-mucho-meta     { color: #6272a4; font-style: italic; }
`;

let muchoStylesInjected = false;
function injectMuchoStyles() {
    if (muchoStylesInjected) return;
    muchoStylesInjected = true;
    const s = document.createElement('style');
    s.id = 'mucho-cm-styles';
    s.textContent = MUCHO_CSS;
    document.head.appendChild(s);
}

// ── MuchoEditor class ────────────────────────────────────────────────────────
export class MuchoEditor {
    constructor(container, initialContent, onChange) {
        this._value = initialContent || '';
        this.cm = null;
        this.textarea = null;

        if (!window.CodeMirror) {
            // Fallback textarea
            container.innerHTML = '';
            this.textarea = document.createElement('textarea');
            this.textarea.value = this._value;
            this.textarea.style.cssText = 'width:100%;height:380px;font-family:monospace;font-size:13px;background:#282a36;color:#f8f8f2;border:1px solid #555;box-sizing:border-box;';
            container.appendChild(this.textarea);
            this.textarea.addEventListener('input', () => {
                const start = this.textarea.selectionStart;
                const end = this.textarea.selectionEnd;
                this.textarea.value = transliterate(this.textarea.value);
                this.textarea.setSelectionRange(start, end);

                this._value = this.textarea.value;
                if (onChange) onChange(this._value);
            });
            return;
        }

        injectSharedStyles();
        injectMuchoStyles();
        registerMuchoMode();

        this.cm = buildNodeEditor(container, 'mucho', this._value, (v) => {
            this._value = v;
            if (onChange) onChange(v);
        });

        // Expose a pseudo-textarea for the image-insert handler in app.js
        this.textarea = this.cm.getInputField();
    }

    get value() {
        return this.cm ? this.cm.getValue() : this._value;
    }

    set value(v) {
        this._value = v;
        if (this.cm) this.cm.setValue(v);
        else if (this.textarea) this.textarea.value = v;
    }

    // No-op — CodeMirror handles highlighting
    updateHighlights() { }

    // Helper to generate MuCho representation from a node's data
    static generateFromNode(node) {
        return node.text || '';
    }

    // Helper to parse MuCho text back into a node's data
    static parseToNode(text, node) {
        node.text = text;

        const paragraphs = text.split(/\n\n+/);
        const newConds = [];
        const newImgs = [];

        paragraphs.forEach((p, idx) => {
            const lines = p.split('\n');
            let conditionData = null;

            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('$I ')) {
                    const imgName = trimmed.substring(3).trim().split(/\s+/)[0];
                    if (imgName) newImgs.push({ paragraphIndex: idx, imageName: imgName });
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
                }
            });

            if (conditionData && conditionData.conditions.length > 0) newConds.push(conditionData);
        });

        node.conditionalParagraphs = newConds;

        // Preserve any existing imageData for images with the same name (case-insensitive)
        try {
            const existing = node.paragraphImages || [];
            newImgs.forEach(ni => {
                const match = existing.find(e => e.imageName && ni.imageName && e.imageName.toLowerCase() === ni.imageName.toLowerCase());
                if (match && match.imageData) {
                    ni.imageData = match.imageData;
                }
            });
        } catch (e) {
            // Non-fatal
            console.warn('Failed to preserve paragraphImages imageData:', e);
        }

        node.paragraphImages = newImgs;
    }
}
