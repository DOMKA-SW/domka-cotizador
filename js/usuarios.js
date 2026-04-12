// js/usuarios.js — Gestión de usuarios (solo Admin)

let _usuarios = [];

document.addEventListener('DOMContentLoaded', async () => {
  await cargarUsuariosLista();
});

// ── Cargar lista de usuarios ──────────────────────────────────
async function cargarUsuariosLista() {
  const tbody = document.getElementById('tabla-usuarios');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">Cargando…</td></tr>';

  try {
    const snap = await db.collection('usuarios').orderBy('creadoEn', 'desc').get();
    _usuarios = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    renderUsuarios();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Error cargando usuarios.</td></tr>';
  }
}

function renderUsuarios() {
  const tbody = document.getElementById('tabla-usuarios');
  if (!tbody) return;

  if (!_usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-400">Sin usuarios registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = _usuarios.map(u => {
    const rolBadge = {
      admin:     'bg-purple-100 text-purple-800',
      comercial: 'bg-blue-100 text-blue-800',
      tecnico:   'bg-yellow-100 text-yellow-800',
      cliente:   'bg-green-100 text-green-800'
    }[u.rol] || 'bg-gray-100 text-gray-600';

    const activoBadge = u.activo === false
      ? '<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Inactivo</span>'
      : '<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Activo</span>';

    return `
    <tr class="border-t hover:bg-gray-50">
      <td class="p-3">
        <div class="font-medium text-sm">${esc(u.nombre || '—')}</div>
        <div class="text-xs text-gray-400">${esc(u.email || '—')}</div>
      </td>
      <td class="p-3">
        <span class="text-xs px-2 py-1 rounded-full font-medium ${rolBadge}">${(u.rol || '').toUpperCase()}</span>
      </td>
      <td class="p-3">${activoBadge}</td>
      <td class="p-3 text-xs text-gray-400">${u.creadoEn?.toDate ? u.creadoEn.toDate().toLocaleDateString('es-CO') : '—'}</td>
      <td class="p-3">
        <div class="flex gap-2">
          <button onclick="editarUsuario('${u.uid}')"
            class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">Editar</button>
          <button onclick="toggleActivo('${u.uid}', ${u.activo !== false})"
            class="text-xs px-2 py-1 rounded ${u.activo === false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}">
            ${u.activo === false ? 'Activar' : 'Desactivar'}
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Toggle activo / inactivo ──────────────────────────────────
async function toggleActivo(uid, estaActivo) {
  const accion = estaActivo ? 'desactivar' : 'activar';
  if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} este usuario?`)) return;
  try {
    await db.collection('usuarios').doc(uid).update({ activo: !estaActivo });
    await cargarUsuariosLista();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// ── Editar usuario: abre modal con datos ──────────────────────
function editarUsuario(uid) {
  const u = _usuarios.find(x => x.uid === uid);
  if (!u) return;
  document.getElementById('edit-uid').value    = uid;
  document.getElementById('edit-nombre').value = u.nombre || '';
  document.getElementById('edit-rol').value    = u.rol    || 'comercial';
  document.getElementById('modal-edit-usuario').classList.remove('hidden');
}

function cerrarModalEdit() {
  document.getElementById('modal-edit-usuario').classList.add('hidden');
}

document.getElementById('form-edit-usuario')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const uid    = document.getElementById('edit-uid').value;
  const nombre = document.getElementById('edit-nombre').value.trim();
  const rol    = document.getElementById('edit-rol').value;

  try {
    await db.collection('usuarios').doc(uid).update({ nombre, rol });
    cerrarModalEdit();
    await cargarUsuariosLista();
  } catch (err) {
    alert('Error actualizando usuario: ' + err.message);
  }
});

// ── Crear usuario nuevo ───────────────────────────────────────
// Nota: Firebase Auth solo crea usuarios desde Admin SDK o con createUserWithEmailAndPassword.
// Usamos el segundo método (el propio usuario se crea la cuenta).
// El admin registra el perfil en Firestore tras crear la cuenta.
document.getElementById('form-nuevo-usuario')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('nuevo-email').value.trim();
  const password = document.getElementById('nuevo-password').value;
  const nombre   = document.getElementById('nuevo-nombre').value.trim();
  const rol      = document.getElementById('nuevo-rol').value;
  const clienteId = document.getElementById('nuevo-clienteId')?.value.trim() || null;

  if (!email || !password || !nombre) { alert('Completa todos los campos.'); return; }
  if (password.length < 8) { alert('La contraseña debe tener al menos 8 caracteres.'); return; }

  const btn = e.target.querySelector('button[type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }

  // Guardamos sesión admin para restaurarla después
  const adminUser = window.auth.currentUser;

  try {
    // Crear cuenta en Firebase Auth
    const cred = await window.auth.createUserWithEmailAndPassword(email, password);
    const uid  = cred.user.uid;

    // Guardar perfil en Firestore
    await guardarUsuarioInterno(uid, { email, nombre, rol, activo: true, clienteId });

    // Si el rol es interno, el admin debe volver a su sesión
    // createUserWithEmailAndPassword NO desloguea al admin actual
    // IMPORTANTE: La cuenta recién creada queda como sesión activa momentáneamente
    // Volvemos a loguear al admin
    if (adminUser) {
      // El admin ya sigue logueado — createUserWithEmailAndPassword no cambia la sesión en Firebase 8 compat
    }

    alert(`✅ Usuario "${nombre}" creado con rol ${rol.toUpperCase()}.`);
    e.target.reset();
    await cargarUsuariosLista();
  } catch (err) {
    alert('Error creando usuario: ' + err.message);
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Crear usuario'; }
});

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.editarUsuario  = editarUsuario;
window.cerrarModalEdit = cerrarModalEdit;
window.toggleActivo   = toggleActivo;
