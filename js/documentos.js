// js/documentos.js — Módulo de Documentos DOMKA

let _documentos = [];
let _clientes   = [];

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([cargarClientesDoc(), cargarDocumentos()]);
});

// ── Cargar clientes para el select ────────────────────────────
async function cargarClientesDoc() {
  try {
    const snap = await db.collection('clientes').get();
    _clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sel = document.getElementById('doc-cliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Selecciona cliente —</option>' +
      _clientes.map(c =>
        `<option value="${c.id}">${esc(c.nombre || c.empresa || c.id)}</option>`
      ).join('');
  } catch (e) {
    console.error('Error cargando clientes:', e);
  }
}

// ── Cargar documentos ─────────────────────────────────────────
async function cargarDocumentos() {
  const tbody = document.getElementById('tabla-documentos');
  const empty = document.getElementById('empty-documentos');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400">Cargando…</td></tr>';

  try {
    const snap = await db.collection('documentos').orderBy('creadoEn', 'desc').get();
    _documentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDocumentos();
  } catch (e) {
    console.error('Error cargando documentos:', e);
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Error cargando documentos.</td></tr>';
  }
}

function renderDocumentos() {
  const tbody = document.getElementById('tabla-documentos');
  const empty = document.getElementById('empty-documentos');
  if (!tbody) return;

  if (!_documentos.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = _documentos.map(doc => {
    const fecha = doc.creadoEn?.toDate
      ? doc.creadoEn.toDate().toLocaleDateString('es-CO')
      : '—';
    const fechaResp = doc.fechaRespuesta?.toDate
      ? doc.fechaRespuesta.toDate().toLocaleDateString('es-CO')
      : '—';

    return `
    <tr class="border-t hover:bg-gray-50">
      <td class="p-3">
        <span class="font-mono text-xs text-green-700 font-semibold">${esc(doc.numero || '—')}</span>
      </td>
      <td class="p-3">
        <div class="font-medium text-sm">${esc(doc.nombreCliente || '—')}</div>
        <div class="text-xs text-gray-400">${esc(doc.tipo || '')}</div>
      </td>
      <td class="p-3 text-sm">${esc(doc.descripcion || '—')}</td>
      <td class="p-3">${badgeEstadoDoc(doc.estado)}</td>
      <td class="p-3 text-sm text-gray-400">${fecha}</td>
      <td class="p-3">
        <div class="flex gap-2 flex-wrap">
          <button onclick="copiarLink('${doc.linkPublico || ''}')"
            class="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">
            🔗 Link
          </button>
          ${doc.pdfBase64 ? `<button onclick="descargarPDF('${doc.id}')"
            class="text-xs px-2 py-1 rounded bg-orange-100 hover:bg-orange-200 text-orange-700">
            📄 PDF
          </button>` : ''}
          ${esComercial() ? `<button onclick="eliminarLogico('${doc.id}')"
            class="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
            title="Marcar como anulado">
            ✕
          </button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Guardar documento ─────────────────────────────────────────
document.getElementById('form-documento')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const clienteId = document.getElementById('doc-cliente').value;
  const tipo      = document.getElementById('doc-tipo').value;
  const desc      = document.getElementById('doc-descripcion').value.trim();
  const pdfInput  = document.getElementById('doc-pdf');

  if (!clienteId) { alert('Selecciona un cliente.'); return; }
  if (!desc)       { alert('Ingresa una descripción.'); return; }

  const cliente = _clientes.find(c => c.id === clienteId);
  if (!cliente)  { alert('Cliente no encontrado.'); return; }

  const btn = e.target.querySelector('button[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

  try {
    const numero = await generarNumero('DOC');

    let pdfBase64 = null;
    if (pdfInput?.files[0]) {
      const file = pdfInput.files[0];
      if (file.size > 1024 * 1024) {
        alert('El PDF no puede superar 1 MB. Comprime el archivo primero.');
        if (btn) { btn.disabled = false; btn.textContent = 'Guardar documento'; }
        return;
      }
      pdfBase64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
    }

    const tokenPublico = generarTokenSeguro();
    const docRef = await db.collection('documentos').add({
      numero,
      clienteId,
      nombreCliente: cliente.nombre || cliente.empresa || clienteId,
      tipo:          tipo || 'Documento',
      descripcion:   desc,
      estado:        'pendiente',
      tokenPublico,
      pdfBase64:     pdfBase64 || null,
      creadoEn:      firebase.firestore.FieldValue.serverTimestamp(),
      creadoPor:     window.domkaUser?.uid || null,
      fechaRespuesta: null
    });

    const linkPublico = generarLinkPublico('documento', docRef.id, tokenPublico);
    await db.collection('documentos').doc(docRef.id).update({ linkPublico });

    alert(`✅ Documento ${numero} creado.`);
    e.target.reset();
    await cargarDocumentos();
  } catch (err) {
    alert('Error guardando documento: ' + err.message);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Guardar documento'; }
});

// ── Copiar link ───────────────────────────────────────────────
function copiarLink(link) {
  if (!link) { alert('Este documento aún no tiene link público.'); return; }
  navigator.clipboard.writeText(link)
    .then(() => alert('✅ Link copiado al portapapeles.'))
    .catch(() => prompt('Copia este link:', link));
}

// ── Descargar PDF ─────────────────────────────────────────────
function descargarPDF(id) {
  const doc = _documentos.find(d => d.id === id);
  if (!doc?.pdfBase64) { alert('No hay PDF adjunto.'); return; }
  const a = document.createElement('a');
  a.href     = doc.pdfBase64;
  a.download = `${doc.numero || 'documento'}.pdf`;
  a.click();
}

// ── Anular (cambio de estado, no borrado) ─────────────────────
async function eliminarLogico(id) {
  if (!confirm('¿Anular este documento? La acción quedará registrada.')) return;
  try {
    await db.collection('documentos').doc(id).update({ estado: 'anulado' });
    await cargarDocumentos();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────
function badgeEstadoDoc(e) {
  const cfg = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    aprobado:  'bg-green-100 text-green-800',
    rechazado: 'bg-red-100 text-red-800',
    anulado:   'bg-gray-100 text-gray-500'
  };
  const label = { pendiente:'Pendiente', aprobado:'Aprobado',
                  rechazado:'Rechazado', anulado:'Anulado' };
  return `<span class="text-xs px-2 py-1 rounded-full font-medium ${cfg[e] || 'bg-gray-100 text-gray-600'}">${label[e] || e}</span>`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.copiarLink    = copiarLink;
window.descargarPDF  = descargarPDF;
window.eliminarLogico = eliminarLogico;
