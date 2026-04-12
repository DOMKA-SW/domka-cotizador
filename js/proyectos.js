// js/proyectos.js — Módulo de Proyectos DOMKA

// ── Estado global ─────────────────────────────────────────────
let _proyectos  = [];
let _tecnicos   = [];
let _filtroEstado = 'todos';

// ── Inicializar ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([cargarTecnicos(), cargarProyectos()]);
  bindFiltros();
});

// ── Cargar técnicos para asignación ──────────────────────────
async function cargarTecnicos() {
  try {
    const snap = await db.collection('usuarios')
      .where('rol', 'in', ['tecnico', 'admin'])
      .where('activo', '==', true)
      .get();
    _tecnicos = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error cargando técnicos:', e);
    _tecnicos = [];
  }
}

// ── Cargar proyectos ──────────────────────────────────────────
async function cargarProyectos() {
  const tbody = document.getElementById('tabla-proyectos');
  const empty = document.getElementById('empty-proyectos');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400">Cargando…</td></tr>';

  try {
    let query = db.collection('proyectos').orderBy('creadoEn', 'desc');

    // Técnico solo ve sus proyectos
    if (window.domkaUser?.rol === 'tecnico') {
      query = db.collection('proyectos')
        .where('tecnicoId', '==', window.domkaUser.uid)
        .orderBy('creadoEn', 'desc');
    }

    const snap = await query.get();
    _proyectos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTabla();
  } catch (e) {
    console.error('Error cargando proyectos:', e);
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Error cargando proyectos.</td></tr>';
  }
}

// ── Render tabla ──────────────────────────────────────────────
function renderTabla() {
  const tbody = document.getElementById('tabla-proyectos');
  const empty = document.getElementById('empty-proyectos');
  if (!tbody) return;

  let lista = _filtroEstado === 'todos'
    ? _proyectos
    : _proyectos.filter(p => p.estado === _filtroEstado);

  if (lista.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = lista.map(p => {
    const fecha = p.creadoEn?.toDate
      ? p.creadoEn.toDate().toLocaleDateString('es-CO')
      : '—';
    const estadoBadge = badgeEstado(p.estado);
    const evidencias  = (p.evidencias || []).length;

    return `
    <tr class="border-t hover:bg-gray-50 cursor-pointer" onclick="abrirDetalle('${p.id}')">
      <td class="p-3">
        <span class="font-mono text-xs text-green-700 font-semibold">${p.numero || '—'}</span>
      </td>
      <td class="p-3">
        <div class="font-medium text-sm">${esc(p.nombreCliente || '—')}</div>
        <div class="text-xs text-gray-400">${esc(p.descripcion || '')}</div>
      </td>
      <td class="p-3 text-sm">${esc(p.tecnicoNombre || 'Sin asignar')}</td>
      <td class="p-3">${estadoBadge}</td>
      <td class="p-3 text-sm text-gray-500">${evidencias} foto${evidencias !== 1 ? 's' : ''}</td>
      <td class="p-3 text-sm text-gray-400">${fecha}</td>
    </tr>`;
  }).join('');
}

// ── Abrir modal detalle ───────────────────────────────────────
async function abrirDetalle(id) {
  const proyecto = _proyectos.find(p => p.id === id);
  if (!proyecto) return;

  document.getElementById('detalle-numero').textContent   = proyecto.numero || '—';
  document.getElementById('detalle-cliente').textContent  = proyecto.nombreCliente || '—';
  document.getElementById('detalle-tecnico').textContent  = proyecto.tecnicoNombre || 'Sin asignar';
  document.getElementById('detalle-descripcion').textContent = proyecto.descripcion || '—';

  // Estado con select si es comercial/admin
  const estadoEl = document.getElementById('detalle-estado-wrap');
  if (estadoEl) {
    if (esComercial()) {
      estadoEl.innerHTML = `
        <label class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Estado</label>
        <select id="select-estado" onchange="cambiarEstado('${id}', this.value)"
          class="border rounded px-3 py-2 text-sm w-full">
          ${['pendiente','en_ejecucion','finalizado','suspendido'].map(e =>
            `<option value="${e}" ${proyecto.estado === e ? 'selected' : ''}>${labelEstado(e)}</option>`
          ).join('')}
        </select>`;
    } else {
      estadoEl.innerHTML = `
        <label class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Estado</label>
        <div>${badgeEstado(proyecto.estado)}</div>`;
    }
  }

  // Asignación técnico (solo comercial/admin)
  const tecnicoWrap = document.getElementById('detalle-tecnico-wrap');
  if (tecnicoWrap) {
    if (esComercial()) {
      tecnicoWrap.innerHTML = `
        <label class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Técnico asignado</label>
        <select id="select-tecnico" onchange="asignarTecnico('${id}', this.value)"
          class="border rounded px-3 py-2 text-sm w-full">
          <option value="">Sin asignar</option>
          ${_tecnicos.map(t =>
            `<option value="${t.uid}" data-nombre="${esc(t.nombre || t.email)}"
              ${proyecto.tecnicoId === t.uid ? 'selected' : ''}>${esc(t.nombre || t.email)}</option>`
          ).join('')}
        </select>`;
    } else {
      tecnicoWrap.innerHTML = `
        <label class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Tu asignación</label>
        <div class="text-sm font-medium">${esc(proyecto.tecnicoNombre || 'Sin asignar')}</div>`;
    }
  }

  // Evidencias
  renderEvidencias(proyecto);

  // Sección subir evidencias (técnico y admin)
  const subirWrap = document.getElementById('subir-evidencia-wrap');
  if (subirWrap) {
    subirWrap.style.display = (esTecnico() || esComercial()) ? 'block' : 'none';
    // Guardar id del proyecto activo
    subirWrap.dataset.proyectoId = id;
  }

  document.getElementById('modal-detalle').classList.remove('hidden');
}

function cerrarDetalle() {
  document.getElementById('modal-detalle').classList.add('hidden');
}

// ── Cambiar estado ────────────────────────────────────────────
async function cambiarEstado(id, estado) {
  try {
    await db.collection('proyectos').doc(id).update({
      estado,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const idx = _proyectos.findIndex(p => p.id === id);
    if (idx >= 0) _proyectos[idx].estado = estado;
    renderTabla();
  } catch (e) {
    alert('Error actualizando estado: ' + e.message);
  }
}

// ── Asignar técnico ───────────────────────────────────────────
async function asignarTecnico(id, tecnicoId) {
  const tec = _tecnicos.find(t => t.uid === tecnicoId);
  try {
    await db.collection('proyectos').doc(id).update({
      tecnicoId:     tecnicoId || null,
      tecnicoNombre: tec ? (tec.nombre || tec.email) : null,
      updatedAt:     firebase.firestore.FieldValue.serverTimestamp()
    });
    const idx = _proyectos.findIndex(p => p.id === id);
    if (idx >= 0) {
      _proyectos[idx].tecnicoId    = tecnicoId || null;
      _proyectos[idx].tecnicoNombre = tec ? (tec.nombre || tec.email) : null;
    }
    renderTabla();
  } catch (e) {
    alert('Error asignando técnico: ' + e.message);
  }
}

// ── Subir evidencia (foto/video) ──────────────────────────────
async function subirEvidencia() {
  const input = document.getElementById('evidencia-input');
  const wrap  = document.getElementById('subir-evidencia-wrap');
  if (!input || !wrap) return;

  const id     = wrap.dataset.proyectoId;
  const files  = Array.from(input.files);
  if (!files.length) { alert('Selecciona al menos un archivo.'); return; }

  const btn = document.getElementById('btn-subir-ev');
  if (btn) { btn.disabled = true; btn.textContent = 'Subiendo…'; }

  const evidencias = [];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} supera 5 MB. Comprime la imagen antes de subir.`);
      continue;
    }
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    evidencias.push({
      nombre:    file.name,
      tipo:      file.type,
      base64,
      fecha:     new Date().toISOString(),
      subidoPor: window.domkaUser?.nombre || window.domkaUser?.email || '—'
    });
  }

  if (!evidencias.length) {
    if (btn) { btn.disabled = false; btn.textContent = 'Subir'; }
    return;
  }

  try {
    await db.collection('proyectos').doc(id).update({
      evidencias: firebase.firestore.FieldValue.arrayUnion(...evidencias),
      updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
    });
    // Actualizar local
    const idx = _proyectos.findIndex(p => p.id === id);
    if (idx >= 0) {
      _proyectos[idx].evidencias = [
        ...(_proyectos[idx].evidencias || []),
        ...evidencias
      ];
      renderEvidencias(_proyectos[idx]);
    }
    input.value = '';
    alert(`✅ ${evidencias.length} evidencia(s) subida(s).`);
  } catch (e) {
    alert('Error subiendo evidencia: ' + e.message);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Subir'; }
}

// ── Render galería de evidencias ──────────────────────────────
function renderEvidencias(proyecto) {
  const galeria = document.getElementById('galeria-evidencias');
  if (!galeria) return;

  const evs = proyecto.evidencias || [];
  if (!evs.length) {
    galeria.innerHTML = '<p class="text-gray-400 text-sm">Sin evidencias aún.</p>';
    return;
  }

  galeria.innerHTML = evs.map((ev, i) => {
    const esImagen = (ev.tipo || '').startsWith('image/');
    const esVideo  = (ev.tipo || '').startsWith('video/');
    const fecha    = ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-CO') : '—';

    if (esImagen) {
      return `<div class="evidence-thumb" onclick="verEvidencia(${i},'${proyecto.id}')">
        <img src="${ev.base64}" alt="${esc(ev.nombre)}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;">
        <div class="text-xs text-gray-400 mt-1 truncate">${fecha}</div>
      </div>`;
    }
    if (esVideo) {
      return `<div class="evidence-thumb">
        <video src="${ev.base64}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;" controls></video>
        <div class="text-xs text-gray-400 mt-1 truncate">${fecha}</div>
      </div>`;
    }
    return `<div class="evidence-thumb">
      <div class="flex items-center justify-center h-16 bg-gray-100 rounded-lg text-gray-400">📎</div>
      <div class="text-xs text-gray-400 mt-1 truncate">${esc(ev.nombre)}</div>
    </div>`;
  }).join('');
}

// ── Lightbox simple ───────────────────────────────────────────
function verEvidencia(idx, proyectoId) {
  const proyecto = _proyectos.find(p => p.id === proyectoId);
  if (!proyecto) return;
  const ev = (proyecto.evidencias || [])[idx];
  if (!ev) return;

  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  if (lb && img && (ev.tipo || '').startsWith('image/')) {
    img.src = ev.base64;
    lb.classList.remove('hidden');
  }
}
function cerrarLightbox() {
  document.getElementById('lightbox')?.classList.add('hidden');
}

// ── Filtros ───────────────────────────────────────────────────
function bindFiltros() {
  document.querySelectorAll('[data-filtro]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filtro]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _filtroEstado = btn.dataset.filtro;
      renderTabla();
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────
function labelEstado(e) {
  return { pendiente:'Pendiente', en_ejecucion:'En ejecución',
           finalizado:'Finalizado', suspendido:'Suspendido' }[e] || e;
}

function badgeEstado(e) {
  const cfg = {
    pendiente:    'bg-yellow-100 text-yellow-800',
    en_ejecucion: 'bg-blue-100 text-blue-800',
    finalizado:   'bg-green-100 text-green-800',
    suspendido:   'bg-red-100 text-red-800'
  };
  return `<span class="text-xs px-2 py-1 rounded-full font-medium ${cfg[e] || 'bg-gray-100 text-gray-600'}">${labelEstado(e)}</span>`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.abrirDetalle   = abrirDetalle;
window.cerrarDetalle  = cerrarDetalle;
window.cambiarEstado  = cambiarEstado;
window.asignarTecnico = asignarTecnico;
window.subirEvidencia = subirEvidencia;
window.verEvidencia   = verEvidencia;
window.cerrarLightbox = cerrarLightbox;
