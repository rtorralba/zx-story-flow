// Resaltado de sintaxis CYD puro (navegador, sin dependencias)

// ── Palabras clave CYD ────────────────────────────────────────────────────────
const KW_FLOW     = ['GOTO','GOSUB','RETURN','END','LABEL'];
const KW_DECL     = ['DECLARE','AS','CONST','DIM'];
const KW_ASSIGN   = ['SET','TO','LET'];
const KW_COND     = ['IF','THEN','ELSE','ELSEIF','ENDIF'];
const KW_LOOP     = ['WHILE','WEND','DO','UNTIL'];
const KW_MENU     = ['OPTION','CHOOSE','MENUCONFIG','CLEAROPTIONS'];
const KW_DISPLAY  = ['PRINT','CLEAR','CENTER','AT','PICTURE','DISPLAY','WINDOW','BLIT','SCROLL','DRAWBOX'];
const KW_COLOR    = ['INK','PAPER','BORDER','BRIGHT','FLASH','FADEOUT','FILLATTR'];
const KW_SOUND    = ['SFX','TRACK','PLAY','LOOP'];
const KW_IO       = ['LOAD','SAVE','RAMLOAD','RAMSAVE'];
const KW_LOGIC    = ['AND','OR','NOT'];
const ALL_KEYWORDS = [...KW_FLOW,...KW_DECL,...KW_ASSIGN,...KW_COND,...KW_LOOP,...KW_MENU,...KW_DISPLAY,...KW_COLOR,...KW_SOUND,...KW_IO,...KW_LOGIC];
const FUNCTIONS   = ['INKEY','RANDOM','XPOS','YPOS','ISDISK','KEMPSTON','MIN','MAX','LASTPOS'];

// Escape HTML antes de insertar en innerHTML
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Resaltador de un bloque interno [[ ... ]] ─────────────────────────────────
function highlightCodeBlock(code) {
  // Tokeniza carácter a carácter con regex
  const reComment    = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/y;
  const reString     = /("(?:[^"\\]|\\.)*")/y;
  const reNumber     = /(0x[0-9A-Fa-f]+|0b[01]+|\d+(?:\.\d+)?)/y;
  const reVar        = /(@{1,2}[a-zA-Z_][a-zA-Z0-9_]*)/y;
  const reLabel      = /(#[a-zA-Z_][a-zA-Z0-9_]*)/y;
  const reWord       = /([a-zA-Z_][a-zA-Z0-9_]*)/y;
  const reOp         = /([+\-*\/=<>!&|]{1,2}|[,;()\[\]{}])/y;
  const reSpace      = /([\s]+)/y;
  const reAny        = /([\s\S])/y;

  const kwSet = new Set(ALL_KEYWORDS);
  const fnSet = new Set(FUNCTIONS);

  let out = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    let m;
    const tryRe = (re) => { re.lastIndex = i; return re.exec(code); };

    if ((m = tryRe(reComment))) {
      out += `<span class="cyd-comment">${escHtml(m[1])}</span>`;
      i += m[1].length;
    } else if ((m = tryRe(reString))) {
      out += `<span class="cyd-string">${escHtml(m[1])}</span>`;
      i += m[1].length;
    } else if ((m = tryRe(reNumber))) {
      out += `<span class="cyd-number">${escHtml(m[1])}</span>`;
      i += m[1].length;
    } else if ((m = tryRe(reVar))) {
      out += `<span class="cyd-variable">${escHtml(m[1])}</span>`;
      i += m[1].length;
    } else if ((m = tryRe(reLabel))) {
      out += `<span class="cyd-label">${escHtml(m[1])}</span>`;
      i += m[1].length;
    } else if ((m = tryRe(reWord))) {
      const word = m[1];
      const upper = word.toUpperCase();
      if (kwSet.has(upper)) {
        out += `<span class="cyd-keyword">${escHtml(word)}</span>`;
      } else if (fnSet.has(upper)) {
        out += `<span class="cyd-function">${escHtml(word)}</span>`;
      } else {
        out += escHtml(word);
      }
      i += word.length;
    } else if ((m = tryRe(reOp))) {
      out += `<span class="cyd-op">${escHtml(m[1])}</span>`;
      i += m[1].length;
    } else if ((m = tryRe(reSpace))) {
      out += escHtml(m[1]);
      i += m[1].length;
    } else if ((m = tryRe(reAny))) {
      out += escHtml(m[1]);
      i += 1;
    } else {
      break;
    }
  }
  return out;
}

// ── Resaltador principal: divide texto libre y bloques [[ ]] ─────────────────
function highlightCYD(src) {
  const re = /\[\[([\s\S]*?)\]\]/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    // texto libre antes del bloque
    out += `<span class="cyd-text">${escHtml(src.slice(last, m.index))}</span>`;
    // bloque de código
    out += `<span class="cyd-bracket">[[</span>`
         + highlightCodeBlock(m[1])
         + `<span class="cyd-bracket">]]</span>`;
    last = m.index + m[0].length;
  }
  out += `<span class="cyd-text">${escHtml(src.slice(last))}</span>`;
  return out;
}

// ── Estilos CSS inyectados una sola vez ───────────────────────────────────────
const GUTTER_W = 42; // px
const CYD_CSS = `
.cyd-editor-outer {
  display: flex;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #1a1a2e;
  border: 1px solid #555;
  border-radius: 4px;
  overflow: hidden;
  min-height: 520px;
}
.cyd-gutter {
  flex: 0 0 ${GUTTER_W}px;
  background: #12121f;
  border-right: 1px solid #333;
  padding: 8px 0;
  text-align: right;
  user-select: none;
  pointer-events: none;
  overflow: hidden;
  color: #4a4a6a;
  font-size: 12px;
  line-height: 1.5;
}
.cyd-gutter span {
  display: block;
  padding-right: 8px;
  padding-left: 4px;
}
.cyd-editor-wrap {
  position: relative;
  flex: 1 1 auto;
  overflow: hidden;
}
.cyd-editor-wrap pre,
.cyd-editor-wrap textarea {
  margin: 0;
  padding: 8px;
  width: 100%;
  min-height: 520px;
  box-sizing: border-box;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  word-wrap: break-word;
  tab-size: 2;
}
.cyd-editor-wrap pre {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: auto;
  color: #cdd6f4;
  background: transparent;
}
.cyd-editor-wrap textarea {
  position: relative;
  display: block;
  color: transparent;
  background: transparent;
  caret-color: #f8f8f2;
  border: none;
  outline: none;
  resize: none;
  z-index: 1;
  height: 100%;
}
.cyd-keyword  { color: #ff79c6; font-weight: bold; }
.cyd-function { color: #8be9fd; }
.cyd-variable { color: #50fa7b; }
.cyd-label    { color: #f1fa8c; }
.cyd-string   { color: #f1fa8c; }
.cyd-comment  { color: #6272a4; font-style: italic; }
.cyd-number   { color: #bd93f9; }
.cyd-op       { color: #ffb86c; }
.cyd-bracket  { color: #ff5555; font-weight: bold; }
.cyd-text     { color: #aabbc3; }
.cyd-toolbar {
  display: flex;
  justify-content: flex-end;
  background: #12121f;
  border-bottom: 1px solid #333;
  padding: 2px 6px;
}
.cyd-toolbar button {
  background: transparent;
  border: none;
  color: #aabbc3;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1.4;
}
.cyd-toolbar button:hover { background: #2a2a4a; color: #fff; }
.cyd-editor-outer.cyd-fullscreen {
  position: fixed !important;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100vw !important;
  height: 100vh !important;
  min-height: 100vh !important;
  z-index: 99999;
  border-radius: 0;
  border: none;
  flex-direction: column;
}
.cyd-editor-outer.cyd-fullscreen .cyd-editor-wrap,
.cyd-editor-outer.cyd-fullscreen .cyd-editor-wrap pre,
.cyd-editor-outer.cyd-fullscreen .cyd-editor-wrap textarea {
  min-height: 0;
  height: 100%;
  flex: 1 1 auto;
}
.cyd-editor-outer.cyd-fullscreen .cyd-main-row {
  flex: 1 1 auto;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
`;

function injectStyles() {
  if (document.getElementById('cyd-highlight-styles')) return;
  const s = document.createElement('style');
  s.id = 'cyd-highlight-styles';
  s.textContent = CYD_CSS;
  document.head.appendChild(s);
}

// ── API pública ───────────────────────────────────────────────────────────────
export function mountCYDEditor(textareaId) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  if (textarea.dataset.cydMounted) return;
  textarea.dataset.cydMounted = '1';

  injectStyles();

  // Contenedor exterior (gutter + editor)
  const outer = document.createElement('div');
  outer.className = 'cyd-editor-outer';
  textarea.parentNode.insertBefore(outer, textarea);

  // Barra de herramientas (fullscreen)
  const toolbar = document.createElement('div');
  toolbar.className = 'cyd-toolbar';
  const fsBtn = document.createElement('button');
  fsBtn.title = 'Fullscreen';
  fsBtn.textContent = '⛶';
  toolbar.appendChild(fsBtn);
  outer.appendChild(toolbar);

  // Fila principal: gutter + wrap
  const mainRow = document.createElement('div');
  mainRow.className = 'cyd-main-row';
  mainRow.style.cssText = 'display:flex;flex:1 1 auto;overflow:hidden;';
  outer.appendChild(mainRow);

  // Gutter de números de línea
  const gutter = document.createElement('div');
  gutter.className = 'cyd-gutter';
  mainRow.appendChild(gutter);

  // Wrapper del editor (pre + textarea)
  const wrap = document.createElement('div');
  wrap.className = 'cyd-editor-wrap';
  mainRow.appendChild(wrap);

  // Botón fullscreen
  let isFullscreen = false;
  fsBtn.addEventListener('click', () => {
    isFullscreen = !isFullscreen;
    outer.classList.toggle('cyd-fullscreen', isFullscreen);
    fsBtn.textContent = isFullscreen ? '✕' : '⛶';
    fsBtn.title = isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';
  });
  // Salir con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
      isFullscreen = false;
      outer.classList.remove('cyd-fullscreen');
      fsBtn.textContent = '⛶';
      fsBtn.title = 'Pantalla completa';
    }
  });

  // Pre para el HTML resaltado
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  pre.appendChild(code);
  wrap.appendChild(pre);

  // Mover textarea dentro del wrapper y limpiar estilos
  wrap.appendChild(textarea);
  textarea.style.cssText = '';

  // Desactivar corrección ortográfica / gramatical
  textarea.setAttribute('spellcheck', 'false');
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('autocapitalize', 'off');
  textarea.setAttribute('autocomplete', 'off');
  textarea.setAttribute('data-gramm', 'false');       // Grammarly
  textarea.setAttribute('data-gramm_editor', 'false');
  textarea.setAttribute('data-enable-grammarly', 'false');

  function updateGutter() {
    const lines = textarea.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lines; i++) html += `<span>${i}</span>`;
    gutter.innerHTML = html;
  }

  function syncHighlight() {
    code.innerHTML = highlightCYD(textarea.value) + '\n';
    updateGutter();
  }

  function syncScroll() {
    pre.scrollTop    = textarea.scrollTop;
    pre.scrollLeft   = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  }

  syncHighlight();
  textarea.addEventListener('input', syncHighlight);
  textarea.addEventListener('scroll', syncScroll);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = textarea.selectionStart;
      const v = textarea.value;
      textarea.value = v.slice(0, s) + '  ' + v.slice(textarea.selectionEnd);
      textarea.selectionStart = textarea.selectionEnd = s + 2;
      syncHighlight();
    }
  });
}
