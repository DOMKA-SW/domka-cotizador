// ═══════════════════════════════════════════════════════════
//  DOMKA — Corrector de Ortografía
//  Usa LanguageTool API (gratuita, sin API key, español CO)
//  Se llama justo antes de guardar: mostrarModalCorrecciones()
// ═══════════════════════════════════════════════════════════

const LT_URL = "https://api.languagetool.org/v2/check";

// ── Recolectar todos los textos a revisar ─────────────────
// Devuelve array de { campo, label, texto }
function recolectarTextos(modo) {
  const textos = [];

  if (modo === "cotizacion") {
    // Notas (modo libre)
    const modoLibre = document.getElementById("notas-modo-libre");
    if (modoLibre && !modoLibre.classList.contains("hidden")) {
      const t = (document.getElementById("notas")?.value || "").trim();
      if (t) textos.push({ campo: "notas-libre", label: "Notas", texto: t });
    } else {
      // Notas modo viñetas
      document.querySelectorAll(".nota-vineta-input").forEach((inp, i) => {
        const t = inp.value.trim();
        if (t) textos.push({ campo: `vineta-${i}`, label: `Nota ${i + 1}`, texto: t, el: inp });
      });
    }

    // Ubicación
    const ub = (document.getElementById("ubicacion")?.value || "").trim();
    if (ub) textos.push({ campo: "ubicacion", label: "Ubicación", texto: ub });

    // Descripciones de ítems
    document.querySelectorAll("#tabla-items .desc").forEach((inp, i) => {
      const t = inp.value.trim();
      if (t) textos.push({ campo: `item-${i}`, label: `Ítem ${i + 1}`, texto: t, el: inp });
    });

  } else if (modo === "cuenta") {
    // Concepto
    const co = (document.getElementById("concepto")?.value || "").trim();
    if (co) textos.push({ campo: "concepto", label: "Concepto", texto: co });

    // Notas (modo libre)
    const modoLibre = document.getElementById("notas-modo-libre");
    if (modoLibre && !modoLibre.classList.contains("hidden")) {
      const t = (document.getElementById("notas")?.value || "").trim();
      if (t) textos.push({ campo: "notas-libre", label: "Notas", texto: t });
    } else {
      document.querySelectorAll(".nota-vineta-input").forEach((inp, i) => {
        const t = inp.value.trim();
        if (t) textos.push({ campo: `vineta-${i}`, label: `Nota ${i + 1}`, texto: t, el: inp });
      });
    }

    // Descripciones de ítems
    document.querySelectorAll(".item-desc").forEach((inp, i) => {
      const t = inp.value.trim();
      if (t) textos.push({ campo: `item-${i}`, label: `Descripción ${i + 1}`, texto: t, el: inp });
    });
  }

  return textos;
}

// ── Revisar un texto con LanguageTool ─────────────────────
async function revisarTexto(texto) {
  try {
    const res = await fetch(LT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        text: texto,
        language: "es",
        enabledOnly: "false"
      })
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Solo errores de ortografía y gramática, excluir puntuación menor
    return (data.matches || []).filter(m =>
      m.rule?.category?.id !== "PUNCTUATION" &&
      m.rule?.id !== "UPPERCASE_SENTENCE_START"
    );
  } catch {
    return [];
  }
}

// ── Modal UI ──────────────────────────────────────────────
function crearModalHTML() {
  return `
  <div id="lt-overlay" style="
    position:fixed;inset:0;background:rgba(26,26,26,.55);
    z-index:9999;display:flex;align-items:center;justify-content:center;
    padding:20px;backdrop-filter:blur(3px);
  ">
    <div id="lt-modal" style="
      background:#fff;border-radius:16px;max-width:640px;width:100%;
      max-height:85vh;display:flex;flex-direction:column;
      box-shadow:0 24px 64px rgba(0,0,0,.18);
      font-family:'DM Sans',sans-serif;
    ">
      <!-- Header -->
      <div style="
        padding:22px 28px 18px;border-bottom:1px solid #e8e2d8;
        display:flex;align-items:center;gap:12px;
      ">
        <div style="
          width:40px;height:40px;background:#e8f5ee;border-radius:10px;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b7a51" stroke-width="2.5">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <div style="flex:1">
          <div style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:#1a1a1a">
            Revisar ortografía
          </div>
          <div id="lt-subtitle" style="font-size:.78rem;color:#9a9a9a;margin-top:2px">
            Analizando textos…
          </div>
        </div>
        <button id="lt-cerrar-x" style="
          background:none;border:none;cursor:pointer;
          color:#9a9a9a;padding:4px;border-radius:6px;
          font-size:1.2rem;line-height:1;
        " title="Cerrar">✕</button>
      </div>

      <!-- Body scroll -->
      <div id="lt-body" style="
        overflow-y:auto;padding:20px 28px;flex:1;
        display:flex;align-items:center;justify-content:center;
      ">
        <!-- Spinner inicial -->
        <div id="lt-spinner" style="text-align:center;padding:32px 0">
          <div style="
            width:36px;height:36px;border:3px solid #e8e2d8;
            border-top-color:#1b7a51;border-radius:50%;
            animation:ltSpin .8s linear infinite;margin:0 auto 14px;
          "></div>
          <div style="font-size:.88rem;color:#9a9a9a">Consultando LanguageTool…</div>
        </div>
      </div>

      <!-- Footer -->
      <div id="lt-footer" style="
        padding:16px 28px;border-top:1px solid #e8e2d8;
        display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;
      ">
        <button id="lt-omitir" style="
          padding:10px 22px;border-radius:8px;font-size:.88rem;font-weight:600;
          background:#fff;border:1.5px solid #d6cfc5;color:#5a5a5a;cursor:pointer;
          font-family:'DM Sans',sans-serif;transition:all .2s;
        ">Omitir todo y continuar</button>
        <button id="lt-aplicar" style="
          padding:10px 22px;border-radius:8px;font-size:.88rem;font-weight:600;
          background:#1b7a51;border:none;color:#fff;cursor:pointer;
          font-family:'DM Sans',sans-serif;transition:all .2s;
          box-shadow:0 3px 12px rgba(27,122,81,.25);
        " disabled>Aplicar correcciones y guardar</button>
      </div>
    </div>
  </div>
  <style>
    @keyframes ltSpin { to { transform:rotate(360deg); } }
    .lt-check-row { display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f0ebe3; }
    .lt-check-row:last-child { border-bottom:none; }
    .lt-check-row input[type=checkbox] { accent-color:#1b7a51;width:16px;height:16px;flex-shrink:0;margin-top:3px;cursor:pointer; }
    .lt-campo-label { font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1b7a51;margin-bottom:4px; }
    .lt-original { font-size:.82rem;color:#9a9a9a;margin-bottom:3px; }
    .lt-original mark { background:#fef3c7;color:#92400e;padding:1px 3px;border-radius:3px;font-style:normal; }
    .lt-mensaje { font-size:.82rem;color:#5a5a5a;margin-bottom:5px; }
    .lt-sugerencias { display:flex;flex-wrap:wrap;gap:6px; }
    .lt-sug-btn {
      padding:4px 12px;border-radius:20px;font-size:.78rem;font-weight:600;cursor:pointer;
      background:#e8f5ee;color:#1b7a51;border:1.5px solid #1b7a51;
      font-family:'DM Sans',sans-serif;transition:all .15s;
    }
    .lt-sug-btn:hover { background:#1b7a51;color:#fff; }
    .lt-sug-btn.selected { background:#1b7a51;color:#fff; }
    .lt-ok-state { text-align:center;padding:28px 0; }
    .lt-ok-icon { font-size:2.4rem;margin-bottom:8px; }
    .lt-ok-title { font-family:'DM Serif Display',serif;font-size:1.15rem;color:#1a1a1a;margin-bottom:4px; }
    .lt-ok-sub { font-size:.82rem;color:#9a9a9a; }
  </style>`;
}

// ── Renderizar resultados ──────────────────────────────────
function renderizarResultados(resultados) {
  const body = document.getElementById("lt-body");
  const subtitle = document.getElementById("lt-subtitle");
  const btnAplicar = document.getElementById("lt-aplicar");

  // Contar errores totales
  const totalErrores = resultados.reduce((s, r) => s + r.matches.length, 0);

  if (totalErrores === 0) {
    subtitle.textContent = "Sin errores encontrados";
    body.style.justifyContent = "center";
    body.innerHTML = `
      <div class="lt-ok-state">
        <div class="lt-ok-icon">✅</div>
        <div class="lt-ok-title">¡Todo correcto!</div>
        <div class="lt-ok-sub">No se encontraron errores ortográficos ni gramaticales.</div>
      </div>`;
    btnAplicar.textContent = "Guardar";
    btnAplicar.disabled = false;
    return;
  }

  subtitle.textContent = `${totalErrores} sugerencia${totalErrores !== 1 ? "s" : ""} encontrada${totalErrores !== 1 ? "s" : ""}`;
  body.style.justifyContent = "flex-start";

  // Estado de correcciones seleccionadas: { campo+offset: sugerencia elegida }
  const selecciones = {}; // key: `${campo}-${matchIndex}` → { match, sugerencia, entry }

  let html = `<div style="width:100%">`;

  resultados.forEach(({ entry, matches }) => {
    if (!matches.length) return;

    html += `<div style="margin-bottom:16px">`;
    html += `<div class="lt-campo-label">${entry.label}</div>`;

    matches.forEach((match, mi) => {
      const key = `${entry.campo}-${mi}`;
      const inicio = match.offset;
      const fin = match.offset + match.length;
      const textoOriginal = entry.texto;
      const palabraError = textoOriginal.substring(inicio, fin);

      // Texto con la palabra marcada
      const textoMarcado =
        textoOriginal.substring(0, inicio) +
        `<mark>${palabraError}</mark>` +
        textoOriginal.substring(fin);

      const sugs = (match.replacements || []).slice(0, 4);

      html += `
        <div class="lt-check-row" data-key="${key}">
          <input type="checkbox" id="ltck-${key}" data-key="${key}" checked>
          <div style="flex:1">
            <div class="lt-original">${textoMarcado}</div>
            <div class="lt-mensaje">${match.message || "Posible error"}</div>
            ${sugs.length ? `
              <div class="lt-sugerencias" id="ltsugs-${key}">
                ${sugs.map((s, si) => `
                  <button class="lt-sug-btn${si === 0 ? " selected" : ""}"
                    data-key="${key}" data-sug="${s.value}"
                    data-inicio="${inicio}" data-fin="${fin}"
                    data-campo="${entry.campo}">${s.value}</button>
                `).join("")}
              </div>` : `<div style="font-size:.78rem;color:#9a9a9a">Sin sugerencias automáticas</div>`}
          </div>
        </div>`;

      // Pre-seleccionar primera sugerencia
      if (sugs.length) {
        selecciones[key] = {
          match, sugerencia: sugs[0].value,
          inicio, fin, campo: entry.campo, entry
        };
      }
    });

    html += `</div>`;
  });

  html += `</div>`;
  body.innerHTML = html;

  // Habilitar botón
  btnAplicar.disabled = false;
  btnAplicar.textContent = "Aplicar correcciones y guardar";

  // ── Eventos en sugerencias ──
  body.querySelectorAll(".lt-sug-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      const campo = btn.dataset.campo;
      const sug = btn.dataset.sug;
      const inicio = Number(btn.dataset.inicio);
      const fin = Number(btn.dataset.fin);

      // Marcar seleccionada
      body.querySelectorAll(`.lt-sug-btn[data-key="${key}"]`).forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      // Encontrar entry
      const entry = resultados.find(r => r.entry.campo === campo)?.entry;
      if (entry) {
        selecciones[key] = { sugerencia: sug, inicio, fin, campo, entry };
      }
    });
  });

  // ── Checkbox desmarcar ──
  body.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const key = cb.dataset.key;
      if (!cb.checked) {
        delete selecciones[key];
      } else {
        // Re-agregar primera sugerencia seleccionada
        const firstSug = body.querySelector(`.lt-sug-btn.selected[data-key="${key}"]`);
        if (firstSug) {
          const campo = firstSug.dataset.campo;
          const entry = resultados.find(r => r.entry.campo === campo)?.entry;
          if (entry) {
            selecciones[key] = {
              sugerencia: firstSug.dataset.sug,
              inicio: Number(firstSug.dataset.inicio),
              fin: Number(firstSug.dataset.fin),
              campo, entry
            };
          }
        }
      }
    });
  });

  // Guardar referencia a selecciones en el botón para aplicar
  btnAplicar._selecciones = selecciones;
  btnAplicar._resultados = resultados;
}

// ── Aplicar correcciones al DOM ───────────────────────────
function aplicarCorrecciones(selecciones) {
  // Agrupar por campo y aplicar de atrás hacia adelante (offsets no se desplazan)
  const porCampo = {};
  Object.values(selecciones).forEach(s => {
    if (!porCampo[s.campo]) porCampo[s.campo] = [];
    porCampo[s.campo].push(s);
  });

  Object.entries(porCampo).forEach(([campo, corrs]) => {
    // Ordenar de mayor a menor offset para no romper posiciones
    corrs.sort((a, b) => b.inicio - a.inicio);

    // Encontrar el elemento
    let el = null;
    if (campo === "notas-libre") {
      el = document.getElementById("notas");
    } else if (campo === "ubicacion") {
      el = document.getElementById("ubicacion");
    } else if (campo === "concepto") {
      el = document.getElementById("concepto");
    } else if (campo.startsWith("vineta-")) {
      const idx = Number(campo.split("-")[1]);
      el = document.querySelectorAll(".nota-vineta-input")[idx];
    } else if (campo.startsWith("item-")) {
      const idx = Number(campo.split("-")[1]);
      // Cotizaciones usa .desc, cuentas usa .item-desc
      const descs = [...document.querySelectorAll("#tabla-items .desc"), ...document.querySelectorAll(".item-desc")];
      el = descs[idx];
    }

    if (!el) return;

    let texto = el.value;
    corrs.forEach(c => {
      texto = texto.substring(0, c.inicio) + c.sugerencia + texto.substring(c.fin);
    });
    el.value = texto;

    // Disparar input para que cotizaciones.js recalcule si aplica
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// ── Función principal exportada ───────────────────────────
// Retorna una Promise que resuelve true (continuar guardar) o false (cancelar)
window.mostrarModalCorrecciones = function(modo) {
  return new Promise(async (resolve) => {
    // Inyectar modal
    const wrapper = document.createElement("div");
    wrapper.innerHTML = crearModalHTML();
    document.body.appendChild(wrapper);

    const overlay = document.getElementById("lt-overlay");
    const btnOmitir = document.getElementById("lt-omitir");
    const btnAplicar = document.getElementById("lt-aplicar");
    const btnCerrarX = document.getElementById("lt-cerrar-x");

    function cerrar(continuar) {
      wrapper.remove();
      resolve(continuar);
    }

    btnCerrarX.addEventListener("click", () => cerrar(false));
    btnOmitir.addEventListener("click", () => cerrar(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cerrar(false);
    });

    // Recolectar textos
    const entradas = recolectarTextos(modo);

    if (entradas.length === 0) {
      cerrar(true); // Nada que revisar, continuar directo
      return;
    }

    // Revisar cada texto
    const resultados = [];
    for (const entry of entradas) {
      const matches = await revisarTexto(entry.texto);
      if (matches.length) resultados.push({ entry, matches });
    }

    renderizarResultados(resultados);

    // Aplicar + guardar
    btnAplicar.addEventListener("click", () => {
      const selecciones = btnAplicar._selecciones || {};
      if (Object.keys(selecciones).length > 0) {
        aplicarCorrecciones(selecciones);
      }
      cerrar(true);
    });
  });
};
