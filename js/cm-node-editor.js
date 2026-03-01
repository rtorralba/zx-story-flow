// ZX Story Flow - Shared CodeMirror node editor base
// Provides the common toolbar + fullscreen + CodeMirror shell used by both
// MuchoEditor and CYDEditor.

const SHARED_CSS = `
.zxsf-node-editor {
  border: 1px solid #555;
  border-radius: 4px;
  overflow: hidden;
}
.zxsf-node-editor-toolbar {
  display: flex;
  justify-content: flex-end;
  background: #1e1f29;
  border-bottom: 1px solid #444;
  padding: 2px 6px;
}
.zxsf-node-editor-toolbar button {
  background: transparent;
  border: none;
  color: #aabbc3;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1.4;
}
.zxsf-node-editor-toolbar button:hover { background: #2a2a4a; color: #fff; }
.zxsf-node-editor .CodeMirror {
  height: 380px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  border-radius: 0;
}
/* Fullscreen */
.zxsf-node-editor.zxsf-fullscreen {
  position: fixed !important;
  inset: 0;
  z-index: 99999;
  width: 100vw !important;
  height: 100vh !important;
  border-radius: 0;
  border: none;
  display: flex;
  flex-direction: column;
  background: #282a36;
}
.zxsf-node-editor.zxsf-fullscreen .CodeMirror {
  flex: 1;
  height: 0 !important;
  border-radius: 0;
}
/* Extra token colors (shared across both modes, Dracula palette) */
.cm-mucho-cmd   { color: #ff79c6; font-weight: bold; }
.cm-mucho-img   { color: #f1fa8c; }
.cm-mucho-ctype { color: #8be9fd; }
.cm-mucho-colon { color: #ffb86c; }
.cm-mucho-cflag { color: #50fa7b; }
.cm-mucho-and   { color: #bd93f9; font-weight: bold; }
.cm-mucho-meta  { color: #6272a4; font-style: italic; }
`;

let sharedStylesInjected = false;
export function injectSharedStyles() {
    if (sharedStylesInjected) return;
    sharedStylesInjected = true;
    const s = document.createElement('style');
    s.id = 'zxsf-node-editor-styles';
    s.textContent = SHARED_CSS;
    document.head.appendChild(s);
}

/**
 * Creates a CodeMirror-based node editor inside `container`.
 * Returns the CodeMirror instance.
 *
 * @param {HTMLElement} container
 * @param {string}      mode       - CodeMirror mode name (already registered)
 * @param {string}      initialValue
 * @param {function}    onChange   - called with new value on every change
 */
export function buildNodeEditor(container, mode, initialValue, onChange) {
    container.innerHTML = '';
    container.className = 'zxsf-node-editor';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'zxsf-node-editor-toolbar';
    const fsBtn = document.createElement('button');
    fsBtn.textContent = '\u26F6';
    fsBtn.title = 'Pantalla completa';
    toolbar.appendChild(fsBtn);
    container.appendChild(toolbar);

    // CodeMirror instance
    const cm = window.CodeMirror(container, {
        value: initialValue || '',
        mode,
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
        indentWithTabs: false,
        autofocus: false,
        extraKeys: { Tab: cm => cm.execCommand('indentMore') },
    });

    cm.on('change', () => {
        if (onChange) onChange(cm.getValue());
    });

    // Fullscreen logic
    let isFullscreen = false;
    const escListener = (e) => {
        if (e.key === 'Escape' && isFullscreen) {
            isFullscreen = false;
            container.classList.remove('zxsf-fullscreen');
            fsBtn.textContent = '\u26F6';
            fsBtn.title = 'Pantalla completa';
            cm.refresh();
        }
    };
    fsBtn.addEventListener('click', () => {
        isFullscreen = !isFullscreen;
        container.classList.toggle('zxsf-fullscreen', isFullscreen);
        fsBtn.textContent = isFullscreen ? '\u2715' : '\u26F6';
        fsBtn.title = isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';
        cm.refresh();
        if (isFullscreen) cm.focus();
    });
    document.addEventListener('keydown', escListener);

    // Refresh after first paint (container may be hidden)
    setTimeout(() => cm.refresh(), 0);

    return cm;
}
