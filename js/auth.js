// js/auth.js — Autenticación DOMKA con control de roles y rate limiting
// Requiere: firebase.js → roles.js → auth.js (en ese orden)

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.auth = firebase.auth();
window.db   = firebase.firestore();

// ── Rate limiting simple para login ──────────────────────────
let _loginIntentos = 0;
let _lockHasta     = 0;
const MAX_INTENTOS = 5;
const LOCK_MS      = 60 * 1000; // 1 minuto

// ── Login ────────────────────────────────────────────────────
async function login() {
  const ahora = Date.now();
  if (ahora < _lockHasta) {
    const seg = Math.ceil((_lockHasta - ahora) / 1000);
    mostrarError(`🔒 Demasiados intentos. Espera ${seg} segundos.`);
    return;
  }

  const email    = (document.getElementById('email')?.value    || '').trim();
  const password =  document.getElementById('password')?.value || '';

  if (!email || !password) {
    mostrarError('Ingresa tu correo y contraseña.');
    return;
  }

  const btn = document.querySelector('.btn-login, button[onclick="login()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }

  try {
    const cred   = await window.auth.signInWithEmailAndPassword(email, password);
    const perfil = await cargarPerfil(cred.user);
    _loginIntentos = 0;

    const isEnCliente = window.location.pathname.includes('/cliente/');
    if (perfil?.rol === 'cliente') {
      window.location.href = isEnCliente ? 'index.html' : 'cliente/index.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  } catch (err) {
    _loginIntentos++;
    if (_loginIntentos >= MAX_INTENTOS) {
      _lockHasta     = Date.now() + LOCK_MS;
      _loginIntentos = 0;
      mostrarError('🔒 Cuenta bloqueada 60 segundos por seguridad.');
    } else {
      const rest = MAX_INTENTOS - _loginIntentos;
      mostrarError(`Credenciales incorrectas. Intentos restantes: ${rest}`);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar al sistema'; }
  }
}

// ── Logout ───────────────────────────────────────────────────
function logout() {
  window.domkaUser = null;
  const enCliente = window.location.pathname.includes('/cliente/');
  window.auth.signOut()
    .then(() => {
      window.location.href = enCliente ? '../home.html' : 'home.html';
    })
    .catch(err => console.error('[DOMKA] Error logout:', err));
}

// ── Mostrar error en login ───────────────────────────────────
function mostrarError(msg) {
  const el = document.getElementById('error-msg');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else { alert(msg); }
}

// ── Protección de rutas ──────────────────────────────────────
const PAGINAS_PUBLICAS  = ['', 'index.html', 'home.html'];
const PAGINAS_ADMIN     = ['contabilidad.html', 'usuarios.html'];
const PAGINAS_TECNICO   = ['dashboard.html', 'proyectos.html'];

window.auth.onAuthStateChanged(async function(user) {
  const path      = window.location.pathname;
  const pagina    = path.split('/').pop() || 'index.html';
  const enCliente = path.includes('/cliente/');
  const enPublic  = path.includes('/public/');

  if (PAGINAS_PUBLICAS.includes(pagina) || enPublic) return;

  if (!user) {
    window.location.href = enCliente ? '../home.html' : 'home.html';
    return;
  }

  const perfil = await cargarPerfil(user);

  if (!perfil || perfil.activo === false) {
    alert('Tu cuenta está desactivada. Contacta al administrador.');
    await window.auth.signOut();
    window.location.href = enCliente ? '../home.html' : 'home.html';
    return;
  }

  actualizarUIUsuario();
  aplicarVisibilidadRol();

  if (enCliente) {
    if (!['cliente', 'admin'].includes(perfil.rol)) {
      window.location.href = '../dashboard.html';
    }
  } else {
    if (perfil.rol === 'cliente') {
      window.location.href = 'cliente/index.html';
      return;
    }
    if (PAGINAS_ADMIN.includes(pagina) && perfil.rol !== 'admin') {
      window.location.href = 'dashboard.html';
      return;
    }
    if (perfil.rol === 'tecnico' && !PAGINAS_TECNICO.includes(pagina)) {
      window.location.href = 'proyectos.html';
    }
  }
});

window.login  = login;
window.logout = logout;
