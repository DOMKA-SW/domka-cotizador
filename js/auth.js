// js/auth.js — Autenticación DOMKA v4
// Requiere: firebase.js → roles.js → security.js → auth.js

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.auth = firebase.auth();
window.db   = firebase.firestore();

// ══════════════════════════════════════════════════════
// MAPA DE RUTAS POR ROL
// Cada rol tiene:
//   home     → a dónde ir después de login
//   allowed  → páginas que puede visitar (null = todas las internas)
// ══════════════════════════════════════════════════════
const ROL_CONFIG = {
  admin: {
    home:    'dashboard.html',
    allowed: null  // acceso total al portal interno
  },
  comercial: {
    home:    'dashboard.html',
    allowed: [
      'dashboard.html','cotizaciones.html','cuentas.html',
      'clientes.html','proyectos.html','documentos.html'
    ]
  },
  tecnico: {
    home:    'proyectos.html',
    allowed: ['dashboard.html','proyectos.html']
  },
  cliente: {
    home:    'cliente/index.html',   // relativo a la raíz del sitio
    allowed: null  // el portal /cliente/ tiene su propia protección
  }
};

// Páginas públicas que no necesitan sesión
const PAGINAS_PUBLICAS = ['', 'index.html', 'home.html'];

// ── Rate limiting para login ──────────────────────────
let _intentos  = 0;
let _lockHasta = 0;
const MAX_INTENTOS = 5;
const LOCK_MS      = 60 * 1000;

// ══════════════════════════════════════════════════════
// LOGIN — único punto de entrada para todos los roles
// ══════════════════════════════════════════════════════
async function login() {
  const ahora = Date.now();
  if (ahora < _lockHasta) {
    const seg = Math.ceil((_lockHasta - ahora) / 1000);
    mostrarError(`🔒 Demasiados intentos. Espera ${seg}s.`);
    return;
  }

  const email    = (document.getElementById('email')?.value    || '').trim();
  const password =  document.getElementById('password')?.value || '';

  if (!email || !password) { mostrarError('Ingresa correo y contraseña.'); return; }

  const btn = document.querySelector('.btn-login, [onclick="login()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }

  try {
    const cred   = await window.auth.signInWithEmailAndPassword(email, password);
    const perfil = await cargarPerfil(cred.user);
    _intentos = 0;

    if (!perfil) {
      // cargarPerfil ya llamó signOut y mostró error
      if (btn) { btn.disabled = false; btn.textContent = 'Ingresar al sistema'; }
      return;
    }

    // Redirigir al home del rol
    redirigirSegunRol(perfil.rol);

  } catch (err) {
    _intentos++;
    if (_intentos >= MAX_INTENTOS) {
      _lockHasta = Date.now() + LOCK_MS;
      _intentos  = 0;
      mostrarError('🔒 Demasiados intentos. Cuenta bloqueada 60s.');
    } else {
      mostrarError(`Credenciales incorrectas. Intentos restantes: ${MAX_INTENTOS - _intentos}`);
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar al sistema'; }
  }
}

// ══════════════════════════════════════════════════════
// REDIRECCIÓN POR ROL
// Calcula la ruta correcta desde cualquier página
// ══════════════════════════════════════════════════════
function redirigirSegunRol(rol) {
  const cfg = ROL_CONFIG[rol];
  if (!cfg) { mostrarError('Rol desconocido: ' + rol); return; }

  const path      = window.location.pathname;
  const enCliente = path.includes('/cliente/');
  let   prefix    = enCliente ? '../' : '';
  let   destino   = cfg.home;

  // Si el cliente ya está en /cliente/, quedarse en el mismo portal
  if (rol === 'cliente' && enCliente) {
    destino = 'index.html';
    prefix  = '';
  }

  window.location.href = prefix + destino;
}

// ══════════════════════════════════════════════════════
// LOGOUT — redirige siempre al login correcto
// ══════════════════════════════════════════════════════
function logout() {
  window.domkaUser = null;
  const enCliente = window.location.pathname.includes('/cliente/');
  window.auth.signOut()
    .then(() => {
      window.location.href = enCliente ? '../home.html' : 'home.html';
    })
    .catch(e => console.error('[DOMKA] logout error:', e));
}

// ══════════════════════════════════════════════════════
// MOSTRAR ERROR EN FORMULARIO
// ══════════════════════════════════════════════════════
function mostrarError(msg) {
  const el = document.getElementById('error-msg');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else     { alert(msg); }
}

// ══════════════════════════════════════════════════════
// PROTECCIÓN DE RUTAS (onAuthStateChanged)
// Se ejecuta en CADA página al cargar
// ══════════════════════════════════════════════════════
window.auth.onAuthStateChanged(async function(user) {
  const path     = window.location.pathname;
  const pagina   = path.split('/').pop() || 'index.html';
  const enPublic = path.includes('/public/');

  // ── Páginas 100% públicas ────────────────────────────
  if (enPublic) return;

  const esLoginPage = PAGINAS_PUBLICAS.includes(pagina);
  const enCliente   = path.includes('/cliente/');
  const enInterno   = !esLoginPage && !enCliente;

  // ── Sin sesión ────────────────────────────────────────
  if (!user) {
    if (!esLoginPage) {
      // Redirigir al login manteniendo contexto
      window.location.href = enCliente ? '../home.html' : 'home.html';
    }
    return;
  }

  // ── Con sesión: cargar perfil ─────────────────────────
  const perfil = await cargarPerfil(user);

  if (!perfil) return; // cargarPerfil ya manejó el error y el signOut

  // ── Si estamos en login y ya hay sesión → redirigir ──
  if (esLoginPage) {
    redirigirSegunRol(perfil.rol);
    return;
  }

  // ── Actualizar UI ─────────────────────────────────────
  actualizarUIUsuario();
  aplicarVisibilidadRol();

  const rol = perfil.rol;

  // ── Portal /cliente/ ──────────────────────────────────
  if (enCliente) {
    // Solo clientes (y admin en modo debug) pueden estar aquí
    if (!['cliente','admin'].includes(rol)) {
      window.location.href = '../dashboard.html';
    }
    return;
  }

  // ── Portal interno ────────────────────────────────────
  if (enInterno) {
    // Los clientes nunca entran al portal interno
    if (rol === 'cliente') {
      window.location.href = 'cliente/index.html';
      return;
    }

    // Verificar que la página actual es permitida para el rol
    const cfg = ROL_CONFIG[rol];
    if (cfg && cfg.allowed !== null && !cfg.allowed.includes(pagina)) {
      // Redirigir al home del rol en lugar de dejar un 404 silencioso
      window.location.href = cfg.home;
      return;
    }
  }
});

window.login  = login;
window.logout = logout;
