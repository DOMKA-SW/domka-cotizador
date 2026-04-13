// js/security.js — Seguridad DOMKA v4
// Tokens en colección separada `public_tokens`. El docId NUNCA va en la URL.

const DOMKA_BASE = 'https://domka-sw.github.io/domka-cotizador';
const TOKEN_DIAS_DEFAULT = 30;

// ── Generar token criptográfico de 64 chars ──────────────────
function generarTokenSeguro() {
  const arr = new Uint8Array(32); // 32 bytes → 64 hex chars
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2,'0')).join('');
}

// ── Crear token en public_tokens y retornar link ─────────────
// coleccion: 'cotizaciones' | 'cuentas' | 'documentos'
async function crearTokenPublico(docId, coleccion, diasExpiracion) {
  const dias      = diasExpiracion || TOKEN_DIAS_DEFAULT;
  const token     = generarTokenSeguro();
  const expiraEn  = new Date();
  expiraEn.setDate(expiraEn.getDate() + dias);

  await db.collection('public_tokens').doc(token).set({
    docId,
    tipo: coleccion,
    expiraEn,
    activo:        true,
    accesos:       0,
    creadoEn:      firebase.firestore.FieldValue.serverTimestamp(),
    creadoPor:     window.domkaUser?.uid || null
  });

  const link = generarLinkPublico(coleccion, token);

  // Guardar link en el documento original (sin token)
  await db.collection(coleccion).doc(docId).update({ linkPublico: link });

  return { token, linkPublico: link };
}

// ── Construir link público (sin docId en la URL) ─────────────
function generarLinkPublico(coleccion, token) {
  const rutas = {
    cotizaciones: '/public/cotizacion.html',
    cuentas:      '/public/cuenta.html',
    documentos:   '/public/documento.html'
  };
  return `${DOMKA_BASE}${rutas[coleccion] || '/public/documento.html'}?token=${token}`;
}

// ── Leer token y validar (para páginas públicas) ─────────────
async function leerTokenPublico(token) {
  if (!tokenUrlValido(token)) return { ok: false, error: 'Token inválido.' };

  let snap;
  try {
    snap = await db.collection('public_tokens').doc(token).get();
  } catch {
    return { ok: false, error: 'Error de conexión.' };
  }

  if (!snap.exists) return { ok: false, error: 'Enlace no encontrado. Solicita uno nuevo a DOMKA.' };

  const t = snap.data();
  if (!t.activo)         return { ok: false, error: 'Este enlace fue desactivado.' };
  if (t.expiraEn.toDate() < new Date()) return { ok: false, error: 'Este enlace expiró. Solicita uno nuevo a DOMKA.' };

  // Registrar acceso (no bloquea si falla)
  snap.ref.update({
    accesos:       firebase.firestore.FieldValue.increment(1),
    ultimoAcceso:  firebase.firestore.FieldValue.serverTimestamp()
  }).catch(() => {});

  return { ok: true, docId: t.docId, tipo: t.tipo };
}

// ── Validar formato de token ──────────────────────────────────
function tokenUrlValido(token) {
  return typeof token === 'string'
    && token.length >= 32
    && /^[0-9a-f]+$/i.test(token);
}

// ── Sanitizar para innerHTML seguro ──────────────────────────
function sanitizar(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// Exponer
window.generarTokenSeguro = generarTokenSeguro;
window.crearTokenPublico  = crearTokenPublico;
window.generarLinkPublico = generarLinkPublico;
window.leerTokenPublico   = leerTokenPublico;
window.tokenUrlValido     = tokenUrlValido;
window.sanitizar          = sanitizar;
