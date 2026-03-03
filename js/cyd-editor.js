// ZX Story Flow - CYD Node Editor (CodeMirror 5)
// Uses the shared node editor shell + the CYD mode from cyd-codemirror.js

import { registerCYDMode, injectExtraStyles } from './cyd-codemirror.js';
import { injectSharedStyles, buildNodeEditor } from './cm-node-editor.js';
import { transliterate } from './utils.js';

export class CYDEditor {
    constructor(container, initialContent, onChange) {
        this._value = initialContent || '';
        this.cm = null;
        this.textarea = null;

        if (!window.CodeMirror) {
            // Fallback textarea si CodeMirror no está disponible
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
        injectExtraStyles(); // colores extra del tema Dracula para tokens CYD
        registerCYDMode();

        this.cm = buildNodeEditor(container, 'cyd', this._value, (v) => {
            this._value = v;
            if (onChange) onChange(v);
        });

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

    updateHighlights() { }

    static generateFromNode(node) {
        return node.text || '';
    }

    static parseToNode(text, node) {
        node.text = text;
    }
}

export default CYDEditor;
