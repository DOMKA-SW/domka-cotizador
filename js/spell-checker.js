// ═══════════════════════════════════════════════════════════
//  DOMKA — Corrector de Ortografía
//  Subrayado en tiempo real usando LanguageTool API (gratis)
//  Rojo = ortografía · Naranja = gramática
// ═══════════════════════════════════════════════════════════

const LT_URL = "https://api.languagetool.org/v2/check";
const _ltReg  = new WeakMap(); // elemento → { overlay, indicador, timer, matches }

// ── Estilos globales ──────────────────────────────────────
(function() {
  if (document.getElementById("lt-styles")) return;
  const s = document.createElement("style");
  s.id = "lt-styles";
  s.textContent = `
    .lt-wrap     { position:relative; display:block; width:100%; }
    .lt-overlay  {
      position:absolute; top:0; left:0; right:0; bottom:0;
      pointer-events:none; overflow:hidden;
      white-space:pre-wrap; word-wrap:break-word;
      color:transparent; z-index:1;
    }
    .lt-spell   { border-bottom:2.5px solid #ef4444; }
    .lt-grammar { border-bottom:2.5px solid #f97316; }
    .lt-badge {
      position:absolute; bottom:7px; right:9px;
      font-size:10.5px; font-family:'DM Sans',sans-serif;
      pointer-events:none; z-index:2; font-weight:600;
      transition: opacity .3s;
    }
    .lt-badge-ok    { color:#1b7a51; }
    .lt-badge-error { color:#ef4444; }
    .lt-badge-wait  { color:#9a9a9a; }
    @keyframes ltSpin { to { transform:rotate(360deg); } }
  `;
  document.head.appendChild(s);
})();

// ── Helpers ───────────────────────────────────────────────
function esc(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function buildOverlay(text, matches) {
  if (!matches.length) return esc(text);
  const sorted = [...matches].sort((a,b) => a.offset - b.offset);
  let html = "", pos = 0;
  for (const m of sorted) {
    const i = m.offset, j = m.offset + m.length;
    if (i < pos) continue;
    html += esc(text.slice(pos, i));
    const cls = (m.rule?.issueType === "grammar" || m.rule?.category?.id === "GRAMMAR")
      ? "lt-grammar" : "lt-spell";
    html += `<span class="${cls}">${esc(text.slice(i, j))}</span>`;
    pos = j;
  }
  return html + esc(text.slice(pos));
}

function syncStyles(el, overlay) {
  const cs = getComputedStyle(el);
  const props = [
    "paddingTop","paddingRight","paddingBottom","paddingLeft",
    "fontSize","fontFamily","fontWeight","fontStyle","lineHeight",
    "letterSpacing","wordSpacing","textIndent","tabSize",
    "width","height","minHeight","boxSizing",
    "whiteSpace","wordBreak","overflowWrap","borderRadius",
  ];
  props.forEach(p => overlay.style[p] = cs[p]);
  overlay.style.border      = `${cs.borderTopWidth} solid transparent`;
  overlay.style.background  = "transparent";
}

// ── Revisar con API ───────────────────────────────────────
async function check(el) {
  const reg = _ltReg.get(el);
  if (!reg) return;
  const text = el.value;

  if (!text.trim()) {
    reg.overlay.innerHTML = "";
    reg.badge.textContent = "";
    reg.matches = [];
    return;
  }

  reg.badge.className   = "lt-badge lt-badge-wait";
  reg.badge.textContent = "…";

  try {
    const res = await fetch(LT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text, language: "es" })
    });
    if (!res.ok) throw 0;
    const data = await res.json();

    const matches = (data.matches || []).filter(m =>
      m.length > 0 &&
      m.rule?.id !== "UPPERCASE_SENTENCE_START" &&
      m.rule?.category?.id !== "PUNCTUATION"
    );

    reg.matches = matches;
    syncStyles(el, reg.overlay);
    reg.overlay.innerHTML = buildOverlay(text, matches);
    reg.overlay.scrollTop = el.scrollTop;

    if (matches.length === 0) {
      reg.badge.className   = "lt-badge lt-badge-ok";
      reg.badge.textContent = "✓";
      setTimeout(() => { if (reg.badge) reg.badge.textContent = ""; }, 2500);
    } else {
      reg.badge.className   = "lt-badge lt-badge-error";
      reg.badge.textContent = `${matches.length} error${matches.length > 1 ? "es" : ""}`;
    }
  } catch {
    reg.badge.textContent = "";
    reg.matches = [];
  }
}

// ── Registrar un campo ────────────────────────────────────
function register(el) {
  if (!el || _ltReg.has(el)) return;

  // Envolver si no está ya en un .lt-wrap
  const parent = el.parentElement;
  let wrap = parent;
  if (!parent.classList.contains("lt-wrap")) {
    wrap = document.createElement("div");
    wrap.className = "lt-wrap";
    parent.insertBefore(wrap, el);
    wrap.appendChild(el);
  }

  const overlay = document.createElement("div");
  overlay.className = "lt-overlay";
  wrap.appendChild(overlay);

  const badge = document.createElement("div");
  badge.className = "lt-badge";
  wrap.appendChild(badge);

  syncStyles(el, overlay);

  const reg = { overlay, badge, timer: null, matches: [] };
  _ltReg.set(el, reg);

  el.addEventListener("input", () => {
    syncStyles(el, overlay);
    overlay.innerHTML = buildOverlay(el.value, reg.matches);
    clearTimeout(reg.timer);
    reg.timer = setTimeout(() => check(el), 850);
  });

  el.addEventListener("scroll", () => { overlay.scrollTop = el.scrollTop; });
  el.addEventListener("focus",  () => syncStyles(el, overlay));

  if (el.value.trim()) setTimeout(() => check(el), 600);
}

// ── API pública ───────────────────────────────────────────

// Activar campos estáticos (llamar en DOMContentLoaded)
window.ltActivar = function() {
  ["notas", "ubicacion", "concepto"].forEach(id => {
    const el = document.getElementById(id);
    if (el) register(el);
  });
};

// Activar un campo recién creado dinámicamente
window.ltReg = function(el) { register(el); };

// Observer para ítems y viñetas que se crean dinámicamente
const _obs = new MutationObserver(muts => {
  muts.forEach(m => m.addedNodes.forEach(node => {
    if (node.nodeType !== 1) return;
    if (node.querySelectorAll)
      node.querySelectorAll("input.desc, input.item-desc, input.nota-vineta-input")
          .forEach(register);
    if (node.matches?.("input.desc, input.item-desc, input.nota-vineta-input"))
      register(node);
  }));
});

window.ltObservar = function(contenedor) {
  if (contenedor) _obs.observe(contenedor, { childList: true, subtree: true });
};
