// js/security.js — Utilidades de seguridad DOMKA
// Cargado en páginas internas para generación de tokens.

/**
 * Genera un UUID v4 criptográficamente seguro.
 * Usa Web Crypto API (disponible en todos los browsers modernos).
 * @returns {string} UUID sin guiones (36 chars → 32 hex chars)
 */
function generarTokenSeguro() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  // Versión 4: bits 6-7 del byte 8 = 0b10, bits 4-7 del byte 6 = 0b0100
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  return Array.from(arr, b => b.toString(16).padStart(2,'0')).join('');
  // Resultado: 32 hex chars — cumple el mínimo de 32 en las Rules
}

/**
 * Genera el link público incluyendo el token.
 * @param {string} coleccion - 'cotizacion' | 'cuenta' | 'documento'
 * @param {string} docId - ID del documento en Firestore
 * @param {string} token - tokenPublico del documento
 * @returns {string} URL completa
 */
function generarLinkPublico(coleccion, docId, token) {
  const base = 'https://domka-sw.github.io/domka-cotizador';
  const rutas = {
    cotizacion: '/public/cotizacion.html',
    cuenta:     '/public/cuenta.html',
    documento:  '/public/documento.html'
  };
  const ruta = rutas[coleccion] || `/public/${coleccion}.html`;
  return `${base}${ruta}?id=${docId}&token=${token}`;
}

/**
 * Sanitiza un string para evitar XSS al insertar en el DOM.
 * @param {*} str
 * @returns {string}
 */
function sanitizar(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Valida que un token de URL tenga la longitud esperada.
 * @param {string} token
 * @returns {boolean}
 */
function tokenUrlValido(token) {
  return typeof token === 'string' && token.length >= 32 && /^[0-9a-f]+$/i.test(token);
}

window.generarTokenSeguro  = generarTokenSeguro;
window.generarLinkPublico  = generarLinkPublico;
window.sanitizar           = sanitizar;
window.tokenUrlValido      = tokenUrlValido;
