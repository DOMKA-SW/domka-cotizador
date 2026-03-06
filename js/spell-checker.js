// js/spell-checker.js — DOMKA 2026
// Corrector de ortografía con LanguageTool API (gratuita, sin clave)
// Uso desde cualquier página: DomkaSpell.revisar()
// ─────────────────────────────────────────────────────────────────

const DomkaSpell = (() => {

  const API = "https://api.languagetool.org/v2/check";

  // ── Recoge todos los campos con texto de la página actual ──────
  function getCampos() {
    const campos = [];
    ["notas", "ubicacion", "concepto", "mov-descripcion", "mov-notas"].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value.trim()) campos.push(el);
    });
    document.querySelectorAll("input.desc, input.item-desc").forEach(el => {
      if (el.value.trim()) campos.push(el);
    });
    document.querySelectorAll("input.nota-vineta-input").forEach(el => {
      if (el.value.trim()) campos.push(el);
    });
    return campos;
  }

  // ── Consulta LanguageTool ──────────────────────────────────────
  async function checkText(texto) {
    if (!texto || texto.trim().length < 4) return [];
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ text: texto, language: "es", enabledOnly: "false" })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.matches || []).filter(m => m.replacements?.length > 0);
    } catch { return []; }
  }

  // ── Estilos del modal ──────────────────────────────────────────
  function inyectarEstilos() {
    if (document.getElementById("dspell-css")) return;
    const s = document.createElement("style");
    s.id = "dspell-css";
    s.textContent = `
      #dspell-overlay {
        position:fixed;inset:0;z-index:9999;
        background:rgba(26,26,26,.52);backdrop-filter:blur(3px);
        display:flex;align-items:center;justify-content:center;padding:20px;
        animation:dspFade .15s ease;
      }
      @keyframes dspFade{from{opacity:0}to{opacity:1}}
      #dspell-modal{
        background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:84vh;
        display:flex;flex-direction:column;
        box-shadow:0 24px 64px rgba(0,0,0,.18);overflow:hidden;
        font-family:'DM Sans',sans-serif;
      }
      .dsp-head{
        padding:20px 24px 16px;border-bottom:1px solid #ede7dc;
        display:flex;align-items:center;justify-content:space-between;
      }
      .dsp-head-ico{
        width:36px;height:36px;border-radius:10px;background:#e8f5ee;
        display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;
      }
      .dsp-head-txt{margin-left:12px;}
      .dsp-head-txt h3{font-family:'DM Serif Display',serif;font-size:1.1rem;color:#1a1a1a;font-weight:400;margin:0;}
      .dsp-head-txt p{font-size:.73rem;color:#9a9a9a;margin:2px 0 0;}
      .dsp-close{
        background:#f4efe7;border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        color:#5a5a5a;font-size:.85rem;transition:background .15s;flex-shrink:0;
      }
      .dsp-close:hover{background:#ede7dc;}
      .dsp-body{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:12px;}
      .dsp-item{background:#faf8f4;border:1px solid #e0d8cf;border-radius:12px;padding:14px 16px;transition:opacity .2s;}
      .dsp-item.corregido{border-color:#6ee7b7;background:#f0fdf9;}
      .dsp-item.ignorado{opacity:.4;pointer-events:none;}
      .dsp-campo{font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1b7a51;margin-bottom:7px;}
      .dsp-ctx{font-size:.9rem;color:#2c2c2c;line-height:1.5;margin-bottom:8px;word-break:break-word;}
      .dsp-ctx mark{background:#fef3c7;color:#92400e;border-radius:3px;padding:1px 4px;}
      .dsp-msg{font-size:.78rem;color:#5a5a5a;margin-bottom:10px;line-height:1.4;}
      .dsp-sugs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
      .dsp-sug{
        background:#e8f5ee;color:#1b7a51;border:1px solid rgba(27,122,81,.2);border-radius:6px;
        padding:4px 13px;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .15s;
      }
      .dsp-sug:hover{background:#1b7a51;color:#fff;}
      .dsp-ignorar{
        background:transparent;border:none;font-size:.75rem;color:#9a9a9a;
        cursor:pointer;padding:2px 4px;border-radius:4px;transition:color .15s;
      }
      .dsp-ignorar:hover{color:#5a5a5a;}
      .dsp-empty{text-align:center;padding:48px 0;color:#9a9a9a;}
      .dsp-empty-ico{font-size:2.4rem;margin-bottom:10px;}
      .dsp-empty-tit{font-family:'DM Serif Display',serif;font-size:1.1rem;color:#2c2c2c;margin-bottom:4px;}
      .dsp-loading{display:flex;flex-direction:column;align-items:center;gap:14px;padding:56px 0;color:#9a9a9a;font-size:.88rem;}
      .dsp-spinner{
        width:34px;height:34px;border:3px solid #ede7dc;border-top-color:#1b7a51;
        border-radius:50%;animation:dspSpin .75s linear infinite;
      }
      @keyframes dspSpin{to{transform:rotate(360deg)}}
      .dsp-foot{
        padding:14px 24px;border-top:1px solid #ede7dc;
        display:flex;align-items:center;justify-content:space-between;gap:12px;
      }
      .dsp-foot-info{font-size:.75rem;color:#9a9a9a;}
      .dsp-btn-ok{
        background:#1b7a51;color:#fff;border:none;border-radius:8px;padding:9px 24px;
        font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:600;
        cursor:pointer;transition:background .15s;
      }
      .dsp-btn-ok:hover{background:#155c3c;}
    `;
    document.head.appendChild(s);
  }

  function crearModal() {
    inyectarEstilos();
    const overlay = document.createElement("div");
    overlay.id = "dspell-overlay";
    overlay.innerHTML = `
      <div id="dspell-modal">
        <div class="dsp-head">
          <div style="display:flex;align-items:center">
            <div class="dsp-head-ico">✏️</div>
            <div class="dsp-head-txt">
              <h3>Corrector de ortografía</h3>
              <p id="dsp-subtitulo">Revisando campos…</p>
            </div>
          </div>
          <button class="dsp-close" id="dsp-close">✕</button>
        </div>
        <div class="dsp-body" id="dsp-body">
          <div class="dsp-loading">
            <div class="dsp-spinner"></div>
            <span>Consultando LanguageTool…</span>
          </div>
        </div>
        <div class="dsp-foot">
          <span class="dsp-foot-info" id="dsp-info">—</span>
          <button class="dsp-btn-ok" id="dsp-ok">Listo</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#dsp-close").onclick = cerrar;
    overlay.querySelector("#dsp-ok").onclick    = cerrar;
    overlay.addEventListener("click", e => { if (e.target === overlay) cerrar(); });
  }

  function cerrar() { document.getElementById("dspell-overlay")?.remove(); }

  function esc(s) {
    return (s || "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function labelCampo(el) {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return lbl.textContent.trim();
    }
    const mapa = {
      notas:"Notas", ubicacion:"Ubicación", concepto:"Por concepto de",
      "mov-descripcion":"Descripción del movimiento", "mov-notas":"Notas del movimiento"
    };
    if (mapa[el.id]) return mapa[el.id];
    if (el.classList.contains("desc"))              return "Descripción del ítem";
    if (el.classList.contains("item-desc"))         return "Descripción del servicio";
    if (el.classList.contains("nota-vineta-input")) return "Nota";
    return el.placeholder || el.name || "Campo";
  }

  function actualizarInfo() {
    const n = document.querySelectorAll(".dsp-item:not(.corregido):not(.ignorado)").length;
    const el = document.getElementById("dsp-info");
    if (el) el.textContent = n
      ? `${n} sugerencia${n !== 1 ? "s" : ""} pendiente${n !== 1 ? "s" : ""}`
      : "Sin pendientes ✓";
  }

  function renderizar(resultados) {
    const body  = document.getElementById("dsp-body");
    const sub   = document.getElementById("dsp-subtitulo");
    const info  = document.getElementById("dsp-info");
    const total = resultados.reduce((s, r) => s + r.errores.length, 0);

    sub.textContent = total
      ? `${total} sugerencia${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`
      : "Revisión completada";

    if (total === 0) {
      body.innerHTML = `
        <div class="dsp-empty">
          <div class="dsp-empty-ico">✅</div>
          <div class="dsp-empty-tit">Sin errores detectados</div>
          <div>El texto no tiene sugerencias de corrección.</div>
        </div>`;
      info.textContent = "0 sugerencias";
      return;
    }

    info.textContent = `${total} sugerencia${total !== 1 ? "s" : ""}`;
    body.innerHTML = "";

    resultados.forEach(({ campo, label, errores }) => {
      errores.forEach(err => {
        const val    = campo.value;
        const inicio = err.offset;
        const fin    = err.offset + err.length;
        const palabra = val.substring(inicio, fin);
        const cI = Math.max(0, inicio - 35);
        const cF = Math.min(val.length, fin + 35);
        const pre  = esc(val.substring(cI, inicio));
        const post = esc(val.substring(fin, cF));
        const d1 = cI > 0 ? "…" : "";
        const d2 = cF < val.length ? "…" : "";
        const sugs = (err.replacements || []).slice(0, 5).map(r => r.value);

        const div = document.createElement("div");
        div.className = "dsp-item";
        div.innerHTML = `
          <div class="dsp-campo">${esc(label)}</div>
          <div class="dsp-ctx">${d1}${pre}<mark>${esc(palabra)}</mark>${post}${d2}</div>
          <div class="dsp-msg">${esc(err.message || "Posible error ortográfico")}</div>
          ${sugs.length ? `<div class="dsp-sugs">${sugs.map(s =>
            `<button class="dsp-sug" data-val="${esc(s)}">${esc(s)}</button>`).join("")}</div>` : ""}
          <button class="dsp-ignorar">Ignorar</button>
        `;

        div.querySelectorAll(".dsp-sug").forEach(btn => {
          btn.addEventListener("click", () => {
            const sug = btn.dataset.val;
            campo.value =
              campo.value.substring(0, err.offset) + sug +
              campo.value.substring(err.offset + err.length);
            campo.dispatchEvent(new Event("input", { bubbles: true }));
            div.classList.add("corregido");
            div.querySelector(".dsp-sugs")?.remove();
            div.querySelector(".dsp-ignorar")?.remove();
            div.querySelector(".dsp-msg").textContent = `✓ Corregido → "${sug}"`;
            actualizarInfo();
          });
        });

        div.querySelector(".dsp-ignorar").addEventListener("click", () => {
          div.classList.add("ignorado");
          actualizarInfo();
        });

        body.appendChild(div);
      });
    });
  }

  async function revisar() {
    cerrar();
    const campos = getCampos();
    if (campos.length === 0) {
      alert("No hay texto para revisar. Completa al menos un campo primero.");
      return;
    }
    crearModal();
    const resultados = [];
    for (let i = 0; i < campos.length; i += 4) {
      const lote   = campos.slice(i, i + 4);
      const parcial = await Promise.all(lote.map(async campo => ({
        campo,
        label:  labelCampo(campo),
        errores: await checkText(campo.value)
      })));
      resultados.push(...parcial.filter(r => r.errores.length > 0));
    }
    renderizar(resultados);
  }

  return { revisar };
})();

window.DomkaSpell = DomkaSpell;
