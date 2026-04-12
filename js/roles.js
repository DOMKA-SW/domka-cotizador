// js/roles.js — Sistema de roles DOMKA
// Carga el perfil del usuario desde Firestore y expone helpers de rol.
// DEBE cargarse después de firebase.js y antes de auth.js.

window.domkaUser = null;

/**
 * Carga el perfil del usuario autenticado desde la colección `usuarios`.
 * Guarda el resultado en window.domkaUser.
 * @param {firebase.User} user
 * @returns {Promise<Object|null>}
 */
async function cargarPerfil(user) {
  if (!user) { window.domkaUser = null; return null; }
  try {
    const snap = await db.collection('usuarios').doc(user.uid).get();
    if (snap.exists) {
      window.domkaUser = { uid: user.uid, email: user.email, ...snap.data() };
    } else {
      // Usuario en Auth pero sin perfil Firestore.
      // Sucede al crear el primer admin a mano.
      // Creamos perfil mínimo para no bloquear la sesión.
      const perfil = {
        uid: user.uid,
        email: user.email,
        nombre: user.email.split('@')[0],
        rol: 'admin',
        activo: true,
        clienteId: null,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('usuarios').doc(user.uid).set(perfil);
      window.domkaUser = { ...perfil };
    }
    return window.domkaUser;
  } catch (e) {
    console.error('[DOMKA] Error cargando perfil:', e);
    // Si falla (ej. sin conexión), usar datos mínimos del Auth
    window.domkaUser = { uid: user.uid, email: user.email, rol: null };
    return window.domkaUser;
  }
}

/**
 * Crea o actualiza un usuario interno en Firestore.
 * Solo llamar desde páginas de administración (usuarios.html).
 */
async function guardarUsuarioInterno(uid, datos) {
  await db.collection('usuarios').doc(uid).set({
    email:     datos.email     || '',
    nombre:    datos.nombre    || '',
    rol:       datos.rol       || 'comercial',
    activo:    datos.activo    !== false,
    clienteId: datos.clienteId || null,
    creadoEn:  firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

/**
 * Genera el siguiente número de secuencia para COT, PROY o DOC.
 * Usa la colección `contadores` con transacción atómica.
 * @param {'COT'|'PROY'|'DOC'} prefijo
 * @returns {Promise<string>} Ej: "COT-0042"
 */
async function generarNumero(prefijo) {
  const ref = db.collection('contadores').doc(prefijo);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const actual = snap.exists ? (snap.data().ultimo || 0) : 0;
    const nuevo = actual + 1;
    tx.set(ref, { ultimo: nuevo }, { merge: true });
    return `${prefijo}-${String(nuevo).padStart(4, '0')}`;
  });
}

// ── Helpers de rol ────────────────────────────────────────────
function esAdmin()     { return window.domkaUser?.rol === 'admin'; }
function esComercial() { return ['admin','comercial'].includes(window.domkaUser?.rol); }
function esTecnico()   { return window.domkaUser?.rol === 'tecnico'; }
function esCliente()   { return window.domkaUser?.rol === 'cliente'; }
function rolActual()   { return window.domkaUser?.rol || null; }

/**
 * Oculta elementos del DOM basado en el rol actual.
 * Uso: <div data-rol-min="comercial"> → oculto para técnico y cliente.
 */
function aplicarVisibilidadRol() {
  const jerarquia = { admin: 4, comercial: 3, tecnico: 2, cliente: 1 };
  const miNivel = jerarquia[rolActual()] || 0;

  document.querySelectorAll('[data-rol-min]').forEach(el => {
    const requerido = jerarquia[el.dataset.rolMin] || 99;
    if (miNivel < requerido) el.style.display = 'none';
  });

  document.querySelectorAll('[data-rol-solo]').forEach(el => {
    if (el.dataset.rolSolo !== rolActual()) el.style.display = 'none';
  });
}

// ── Actualizar UI: nombre y rol en sidebar ────────────────────
function actualizarUIUsuario() {
  const emailEl = document.getElementById('user-email');
  const rolEl   = document.getElementById('user-rol');
  if (emailEl) emailEl.textContent = window.domkaUser?.nombre || window.domkaUser?.email || '—';
  if (rolEl)   rolEl.textContent   = (rolActual() || '').toUpperCase();
}

// Exponer globalmente
window.cargarPerfil          = cargarPerfil;
window.guardarUsuarioInterno = guardarUsuarioInterno;
window.generarNumero         = generarNumero;
window.esAdmin     = esAdmin;
window.esComercial = esComercial;
window.esTecnico   = esTecnico;
window.esCliente   = esCliente;
window.rolActual   = rolActual;
window.aplicarVisibilidadRol = aplicarVisibilidadRol;
window.actualizarUIUsuario   = actualizarUIUsuario;
