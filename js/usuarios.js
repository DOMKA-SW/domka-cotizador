// js/usuarios.js — Gestión de usuarios DOMKA v4

let _usuarios   = [];
let _clientes   = [];
let _editandoUid = null;

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([cargarUsuariosLista(), cargarClientesSelect()]);
});

// ── Cargar lista ──────────────────────────────────────────────
async function cargarUsuariosLista() {
  const tbody = document.getElementById('tabla-usuarios');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400">Cargando…</td></tr>';

  try {
    const snap = await db.collection('usuarios').orderBy('creadoEn','desc').get();
    _usuarios  = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    renderUsuarios();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Error cargando usuarios.</td></tr>';
  }
}

async function cargarClientesSelect() {
  try {
    const snap = await db.collection('clientes').get();
    _clientes  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sel = document.getElementById('nuevo-clienteId');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Sin vincular —</option>' +
      _clientes.map(c => `<option value="${c.id}">${esc(c.nombre||c.id)}</option>`).join('');
  } catch {}
}

function renderUsuarios() {
  const tbody = document.getElementById('tabla-usuarios');
  if (!tbody) return;

  if (!_usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-400">Sin usuarios registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = _usuarios.map(u => {
    const rolCls = { admin:'bg-purple-100 text-purple-800', comercial:'bg-blue-100 text-blue-800',
      tecnico:'bg-yellow-100 text-yellow-800', cliente:'bg-green-100 text-green-800' }[u.rol] || 'bg-gray-100 text-gray-600';
    const activoBadge = u.activo === false
      ? '<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Inactivo</span>'
      : '<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Activo</span>';
    const clienteNombre = u.clienteId
      ? esc(_clientes.find(c => c.id === u.clienteId)?.nombre || u.clienteId)
      : '—';
    const fecha = u.creadoEn?.toDate ? u.creadoEn.toDate().toLocaleDateString('es-CO') : '—';

    return `
    <tr class="border-t hover:bg-gray-50 text-sm">
      <td class="p-3">
        <div class="font-medium">${esc(u.nombre||'—')}</div>
        <div class="text-xs text-gray-400">${esc(u.email||'—')}</div>
      </td>
      <td class="p-3"><span class="text-xs px-2 py-1 rounded-full font-semibold ${rolCls}">${(u.rol||'').toUpperCase()}</span></td>
      <td class="p-3">${activoBadge}</td>
      <td class="p-3 text-xs text-gray-500">${clienteNombre}</td>
      <td class="p-3 text-xs text-gray-400">${fecha}</td>
      <td class="p-3">
        <div class="flex gap-2 flex-wrap">
          <button onclick="editarUsuario('${u.uid}')"
            class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Editar</button>
          <button onclick="toggleActivo('${u.uid}',${u.activo !== false})"
            class="text-xs px-2 py-1 rounded ${u.activo===false ? 'bg-green-100 text-green-700 hover:bg-green-200':'bg-red-100 text-red-700 hover:bg-red-200'}">
            ${u.activo===false ? 'Activar':'Desactivar'}
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Toggle activo ─────────────────────────────────────────────
async function toggleActivo(uid, estaActivo) {
  if (!confirm(`¿${estaActivo ? 'Desactivar' : 'Activar'} este usuario?`)) return;
  try {
    await db.collection('usuarios').doc(uid).update({ activo: !estaActivo });
    await cargarUsuariosLista();
  } catch (e) { alert('Error: ' + e.message); }
}

// ── Editar usuario ────────────────────────────────────────────
function editarUsuario(uid) {
  const u = _usuarios.find(x => x.uid === uid);
  if (!u) return;
  _editandoUid = uid;
  document.getElementById('edit-uid').value    = uid;
  document.getElementById('edit-nombre').value = u.nombre || '';
  document.getElementById('edit-rol').value    = u.rol    || 'comercial';
  // Actualizar select de cliente en modal
  const sel = document.getElementById('edit-clienteId');
  if (sel) {
    sel.innerHTML = '<option value="">— Sin vincular —</option>' +
      _clientes.map(c =>
        `<option value="${c.id}" ${u.clienteId===c.id?'selected':''}>${esc(c.nombre||c.id)}</option>`
      ).join('');
  }
  document.getElementById('modal-edit-usuario').classList.remove('hidden');
}

function cerrarModalEdit() {
  document.getElementById('modal-edit-usuario').classList.add('hidden');
  _editandoUid = null;
}

document.getElementById('form-edit-usuario')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre    = document.getElementById('edit-nombre').value.trim();
  const rol       = document.getElementById('edit-rol').value;
  const clienteId = document.getElementById('edit-clienteId')?.value || null;

  try {
    await db.collection('usuarios').doc(_editandoUid).update({
      nombre,
      rol,
      clienteId: clienteId || null
    });
    cerrarModalEdit();
    await cargarUsuariosLista();
  } catch (err) { alert('Error: ' + err.message); }
});

// ── Crear usuario ─────────────────────────────────────────────
// 🔑 Firebase compat createUserWithEmailAndPassword NO cierra la sesión
// del admin en v9 compat — pero para mayor seguridad usamos una app secundaria
// que se destruye después de crear el usuario.
document.getElementById('form-nuevo-usuario')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email     = document.getElementById('nuevo-email').value.trim();
  const password  = document.getElementById('nuevo-password').value;
  const nombre    = document.getElementById('nuevo-nombre').value.trim();
  const rol       = document.getElementById('nuevo-rol').value;
  const clienteId = document.getElementById('nuevo-clienteId')?.value || null;

  if (!email || !password || !nombre) { alert('Completa todos los campos.'); return; }
  if (password.length < 8) { alert('La contraseña debe tener al menos 8 caracteres.'); return; }

  const btn = e.target.querySelector('button[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }

  // Crear app secundaria para no afectar la sesión del admin
  let secondaryApp;
  try {
    secondaryApp = firebase.initializeApp(firebaseConfig, `secondary_${Date.now()}`);
    const secondaryAuth = secondaryApp.auth();

    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid  = cred.user.uid;

    // Cerrar sesión de la app secundaria
    await secondaryAuth.signOut();

    // Guardar perfil en Firestore (desde la app principal = sesión admin)
    await guardarUsuarioInterno(uid, { email, nombre, rol, activo: true, clienteId });

    alert(`✅ Usuario "${nombre}" creado con rol ${rol.toUpperCase()}.`);
    e.target.reset();
    await cargarUsuariosLista();
  } catch (err) {
    alert('Error creando usuario: ' + err.message);
  } finally {
    // Destruir app secundaria para limpiar
    if (secondaryApp) {
      try { await secondaryApp.delete(); } catch {}
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Crear usuario'; }
  }
});

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

window.editarUsuario   = editarUsuario;
window.cerrarModalEdit = cerrarModalEdit;
window.toggleActivo    = toggleActivo;
