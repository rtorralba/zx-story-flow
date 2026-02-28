// ZX Story Flow - CYD Syntax Editor (lightweight)
// Provides minimal textarea-based editor with simple syntax highlighting for CYD

export class CYDEditor {
    constructor(container, initialContent, onChange) {
        this.container = container;
        this.onChange = onChange;
        this.value = initialContent || '';

        this.container.innerHTML = '';
        this.container.className = 'mucho-editor-container cyd-editor-container';

        this.backdrop = document.createElement('div');
        this.backdrop.className = 'mucho-backdrop';

        this.textarea = document.createElement('textarea');
        this.textarea.className = 'mucho-textarea';
        this.textarea.value = this.value;
        this.textarea.spellcheck = false;
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
        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const result = lines.map(line => {
            let content = esc(line);
            // Highlight [[ ... ]] blocks
            content = content.replace(/\[\[([^\]]+)\]\]/g, (m, inner) => `<span class="cyd-kw">[[</span><span class="cyd-inner">${esc(inner)}</span><span class="cyd-kw">]]</span>`);
            // Keywords: LABEL, PICTURE, DISPLAY, IF, THEN, ENDIF, OPTION, CHOOSE, WAITKEY, MARGINS, DECLARE, SET, GOTO
            content = content.replace(/\b(LABEL|PICTURE|DISPLAY|IF|THEN|ENDIF|OPTION|CHOOSE|WAITKEY|MARGINS|DECLARE|SET|GOTO)\b/g, '<span class="cyd-key">$1</span>');
            return `<div class="mucho-line">${content || ' '}</div>`;
        });

        if (raw.endsWith('\n')) result.push('<div class="mucho-line"> </div>');
        this.backdrop.innerHTML = result.join('');
    }

    // Simple helpers to keep parity with MuchoEditor API
    static generateFromNode(node) {
        return node.text || '';
    }

    static parseToNode(text, node) {
        // For CYD projects we keep text verbatim; parsing of labels/options is left to the author
        node.text = text;
    }
}

export default CYDEditor;
