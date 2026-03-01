// Resaltado de sintaxis CYD con CodeMirror 5 (CDN, sin dependencias npm)

// â”€â”€ Palabras clave CYD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const KW_FLOW     = ['GOTO','GOSUB','RETURN','END','LABEL'];
const KW_DECL     = ['DECLARE','AS','CONST','DIM'];
const KW_ASSIGN   = ['SET','TO','LET'];
const KW_COND     = ['IF','THEN','ELSE','ELSEIF','ENDIF'];
const KW_LOOP     = ['WHILE','WEND','DO','UNTIL'];
const KW_MENU     = ['OPTION','CHOOSE','MENUCONFIG','CLEAROPTIONS'];
const KW_DISPLAY  = ['PRINT','CLEAR','CENTER','AT','PICTURE','DISPLAY','WINDOW','BLIT','SCROLL','DRAWBOX','MARGINS'];
const KW_COLOR    = ['INK','PAPER','BORDER','BRIGHT','FLASH','FADEOUT','FILLATTR'];
const KW_SOUND    = ['SFX','TRACK','PLAY','LOOP'];
const KW_IO       = ['LOAD','SAVE','RAMLOAD','RAMSAVE'];
const KW_LOGIC    = ['AND','OR','NOT'];
const ALL_KEYWORDS = new Set([...KW_FLOW,...KW_DECL,...KW_ASSIGN,...KW_COND,...KW_LOOP,...KW_MENU,...KW_DISPLAY,...KW_COLOR,...KW_SOUND,...KW_IO,...KW_LOGIC]);
const FUNCTIONS   = new Set(['INKEY','RANDOM','XPOS','YPOS','ISDISK','KEMPSTON','MIN','MAX','LASTPOS']);

export function registerCYDMode() {
  if (!window.CodeMirror) return;
  if (CodeMirror.modes['cyd']) return; // ya registrado

  CodeMirror.defineMode('cyd', () => ({
    startState: () => ({ inBlock: false }),

    token(stream, state) {
      // Fuera de bloque [[ ... ]]
      if (!state.inBlock) {
        if (stream.match('[[')) {
          state.inBlock = true;
          return 'bracket';
        }
        stream.skipToEnd();
        return 'cyd-text';
      }

      // Dentro de bloque
      if (stream.match(']]')) {
        state.inBlock = false;
        return 'bracket';
      }

      // Comentario de bloque
      if (stream.match(/^\/\*[\s\S]*?\*\//)) return 'comment';
      // Comentario de lÃ­nea
      if (stream.match(/^\/\/[^\n]*/))       return 'comment';
      // String
      if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return 'string';
      // NÃºmero hex/bin/dec
      if (stream.match(/^0x[0-9A-Fa-f]+/))   return 'number';
      if (stream.match(/^0b[01]+/))           return 'number';
      if (stream.match(/^\d+/))               return 'number';
      // Variable @
      if (stream.match(/^@{1,2}[a-zA-Z_][\w]*/)) return 'variable-2';
      // Etiqueta corta #label (dentro de bloque, ej: [[# ... ]])
      if (stream.match(/^#[a-zA-Z_][\w]*/))  return 'tag';
      // Palabra
      if (stream.match(/^[a-zA-Z_][\w]*/)) {
        const word = stream.current().toUpperCase();
        if (ALL_KEYWORDS.has(word)) return 'keyword';
        if (FUNCTIONS.has(word))    return 'builtin';
        return null;
      }
      // Operadores
      if (stream.match(/^[+\-*\/=<>!&|]{1,2}|[,;()\[\]{}]/)) return 'operator';
      // Resto
      stream.next();
      return null;
    }
  }));
}

// Estilos extra para el tema Dracula + tipos CYD
const EXTRA_CSS = `
.cyd-cm-wrap .CodeMirror {
  height: 520px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  border-radius: 0 0 4px 4px;
}
.cyd-cm-toolbar {
  display: flex;
  justify-content: flex-end;
  background: #1e1f29;
  border: 1px solid #555;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  padding: 2px 6px;
}
.cyd-cm-toolbar button {
  background: transparent;
  border: none;
  color: #aabbc3;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1.4;
}
.cyd-cm-toolbar button:hover { background: #2a2a4a; color: #fff; }
.cyd-cm-wrap.cyd-fullscreen {
  position: fixed !important;
  inset: 0;
  z-index: 99999;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #282a36;
}
.cyd-cm-wrap.cyd-fullscreen .CodeMirror {
  flex: 1;
  height: 0 !important;
  border-radius: 0;
}
/* colores extra para tipos CYD */
.cm-cyd-text  { color: #aabbc3 !important; }
.cm-tag       { color: #f1fa8c !important; }
.cm-bracket   { color: #ff5555 !important; font-weight: bold; }
.cm-variable-2 { color: #50fa7b !important; }
.cm-builtin   { color: #8be9fd !important; }
.cm-operator  { color: #ffb86c !important; }
`;

export function injectExtraStyles() {
  if (document.getElementById('cyd-cm-extra-styles')) return;
  const s = document.createElement('style');
  s.id = 'cyd-cm-extra-styles';
  s.textContent = EXTRA_CSS;
  document.head.appendChild(s);
}

// â”€â”€ API pÃºblica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function mountCYDEditor(textareaId) {
  const textarea = document.getElementById(textareaId);
  if (!textarea || textarea.dataset.cydMounted) return;
  textarea.dataset.cydMounted = '1';

  if (!window.CodeMirror) {
    console.warn('CodeMirror no estÃ¡ disponible aÃºn');
    return;
  }

  injectExtraStyles();
  registerCYDMode();

  // Wrapper con toolbar
  const wrap = document.createElement('div');
  wrap.className = 'cyd-cm-wrap';
  textarea.parentNode.insertBefore(wrap, textarea);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'cyd-cm-toolbar';
  const fsBtn = document.createElement('button');
  fsBtn.textContent = '\u26F6';
  fsBtn.title = 'Pantalla completa';
  toolbar.appendChild(fsBtn);
  wrap.appendChild(toolbar);

  // Mover textarea al wrapper
  wrap.appendChild(textarea);

  // Inicializar CodeMirror sobre el textarea
  const cm = CodeMirror.fromTextArea(textarea, {
    mode: 'cyd',
    theme: 'dracula',
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    autofocus: false,
    extraKeys: { Tab: cm => cm.execCommand('indentMore') },
  });

  // Fullscreen
  let isFullscreen = false;
  fsBtn.addEventListener('click', () => {
    isFullscreen = !isFullscreen;
    wrap.classList.toggle('cyd-fullscreen', isFullscreen);
    fsBtn.textContent = isFullscreen ? '\u2715' : '\u26F6';
    fsBtn.title = isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';
    cm.refresh();
    if (isFullscreen) cm.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
      isFullscreen = false;
      wrap.classList.remove('cyd-fullscreen');
      fsBtn.textContent = '\u26F6';
      fsBtn.title = 'Pantalla completa';
      cm.refresh();
    }
  });

  // Guardar en textarea original para que funcione getProjectData()
  cm.on('change', () => {
    cm.save(); // sincroniza con el textarea original
    textarea.dispatchEvent(new Event('input')); // dispara autoSave
  });

  // Exponer instancia para que app.js pueda actualizar el contenido al cargar proyecto
  textarea._cmInstance = cm;

  // Refrescar tras el primer render (puede estar oculto en ese momento)
  setTimeout(() => cm.refresh(), 0);

  return cm;
}
