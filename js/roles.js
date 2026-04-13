// js/roles.js — Sistema de roles DOMKA v4
// DEBE cargarse después de firebase.js y antes de auth.js.

window.domkaUser = null;

// ── Timeout de sesión por inactividad (15 min) ───────────────
const INACTIVIDAD_MS = 15 * 60 * 1000;
let _timerInactividad = null;

function resetearInactividad() {
  clearTimeout(_timerInactividad);
  _timerInactividad = setTimeout(async () => {
    const enPublic  = window.location.pathname.includes('/public/');
    const esLogin   = ['', 'index.html', 'home.html'].includes(
      window.location.pathname.split('/').pop()
    );
    if (!enPublic && !esLogin && window.auth?.currentUser) {
      window.domkaUser = null;
      await window.auth.signOut();
      window.location.href = window.location.pathname.includes('/cliente/')
        ? '../home.html' : 'home.html';
    }
  }, INACTIVIDAD_MS);
}

['click','keydown','mousemove','touchstart'].forEach(ev =>
  document.addEventListener(ev, resetearInactividad, { passive: true })
);

// ── Cargar perfil ─────────────────────────────────────────────
async function cargarPerfil(user) {
  if (!user) { window.domkaUser = null; return null; }
  try {
    const snap = await db.collection('usuarios').doc(user.uid).get();

    if (!snap.exists) {
      // 🔒 CRÍTICO: NO crear perfil automático — rechazar
      await window.auth.signOut();
      mostrarErrorLogin('Tu cuenta no tiene perfil configurado. Contacta al administrador.');
      return null;
    }

    const data = snap.data();

    // Verificar que el perfil está activo
    if (data.activo === false) {
      await window.auth.signOut();
      mostrarErrorLogin('Tu cuenta está desactivada. Contacta al administrador.');
      return null;
    }

    // Verificar rol válido
    if (!['admin','comercial','tecnico','cliente'].includes(data.rol)) {
      await window.auth.signOut();
      mostrarErrorLogin('Rol de usuario inválido. Contacta al administrador.');
      return null;
    }

    window.domkaUser = { uid: user.uid, email: user.email, ...data };
    resetearInactividad();
    return window.domkaUser;

  } catch (e) {
    console.error('[DOMKA] Error cargando perfil:', e);
    window.domkaUser = { uid: user.uid, email: user.email, rol: null };
    return window.domkaUser;
  }
}

function mostrarErrorLogin(msg) {
  const el = document.getElementById('error-msg');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// ── Guardar usuario interno ───────────────────────────────────
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

// ── Numeración automática (transacción atómica) ───────────────
async function generarNumero(prefijo) {
  const ref = db.collection('contadores').doc(prefijo);
  return db.runTransaction(async (tx) => {
    const snap  = await tx.get(ref);
    const nuevo = (snap.exists ? (snap.data().ultimo || 0) : 0) + 1;
    tx.set(ref, { ultimo: nuevo }, { merge: true });
    return `${prefijo}-${String(nuevo).padStart(4,'0')}`;
  });
}

// ── Helpers de rol ────────────────────────────────────────────
const esAdmin     = () => window.domkaUser?.rol === 'admin';
const esComercial = () => ['admin','comercial'].includes(window.domkaUser?.rol);
const esTecnico   = () => window.domkaUser?.rol === 'tecnico';
const esCliente   = () => window.domkaUser?.rol === 'cliente';
const rolActual   = () => window.domkaUser?.rol || null;

// ── Visibilidad por rol en el DOM ─────────────────────────────
function aplicarVisibilidadRol() {
  const jerarquia = { admin:4, comercial:3, tecnico:2, cliente:1 };
  const nivel     = jerarquia[rolActual()] || 0;
  document.querySelectorAll('[data-rol-min]').forEach(el => {
    if ((jerarquia[el.dataset.rolMin] || 99) > nivel) el.style.display = 'none';
  });
  document.querySelectorAll('[data-rol-solo]').forEach(el => {
    if (el.dataset.rolSolo !== rolActual()) el.style.display = 'none';
  });
}

function actualizarUIUsuario() {
  const eEl = document.getElementById('user-email');
  const rEl = document.getElementById('user-rol');
  if (eEl) eEl.textContent = window.domkaUser?.nombre || window.domkaUser?.email || '—';
  if (rEl) rEl.textContent = (rolActual() || '').toUpperCase();
}

// Exponer
Object.assign(window, {
  cargarPerfil, guardarUsuarioInterno, generarNumero,
  esAdmin, esComercial, esTecnico, esCliente, rolActual,
  aplicarVisibilidadRol, actualizarUIUsuario
});
