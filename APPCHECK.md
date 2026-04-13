# Firebase App Check — Guía de activación DOMKA

## ¿Qué hace App Check?

App Check vincula las llamadas a Firebase a instancias verificadas de tu app.
Sin App Check, **cualquier persona puede abrir DevTools, copiar tu configuración de Firebase
y ejecutar queries desde la consola del navegador**.

Con App Check activado, solo las peticiones que vienen de dominios verificados
(tu GitHub Pages / tu dominio) son aceptadas. El resto recibe `PERMISSION_DENIED`.

---

## Paso 1 — Activar App Check en Firebase Console

1. Firebase Console → tu proyecto → **App Check** (menú izquierdo)
2. Click en **"Get started"**
3. En la sección **Web apps**, selecciona tu app (`domka-cotizador`)
4. Proveedor: **reCAPTCHA v3** (gratis, invisible para el usuario)
5. Sigue el flujo → te dará una **reCAPTCHA Site Key**

---

## Paso 2 — Obtener tu reCAPTCHA v3 Site Key

1. Ve a https://www.google.com/recaptcha/admin
2. Click **"+"** para crear un sitio nuevo
3. Tipo: **reCAPTCHA v3**
4. Dominios permitidos:
   ```
   domka-sw.github.io
   tu-dominio.com          ← si tienes dominio propio
   localhost               ← para desarrollo local
   ```
5. Acepta condiciones → **Copiar Site Key**

---

## Paso 3 — Agregar App Check al código

### 3a. Actualizar `js/firebase.js`

Reemplaza el contenido de `js/firebase.js` con esto:

```javascript
// firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyAzcLdb3lm0efSMuG3U3U8etdb9oJe9SdY",
  authDomain: "domka-cotizador.firebaseapp.com",
  projectId: "domka-cotizador",
  storageBucket: "domka-cotizador.firebasestorage.app",
  messagingSenderId: "11233894590",
  appId: "1:11233894590:web:56fb76f5a1ca9af7453eef"
};

firebase.initializeApp(firebaseConfig);

// ── App Check (reCAPTCHA v3) ──────────────────────────────
// Reemplaza TU_SITE_KEY con la clave del Paso 2
firebase.appCheck().activate(
  new firebase.appCheck.ReCaptchaV3Provider('TU_SITE_KEY_AQUI'),
  true  // isTokenAutoRefreshEnabled
);

const db   = firebase.firestore();
const auth = firebase.auth();

window.db   = db;
window.auth = auth;
```

### 3b. Agregar el SDK de App Check en TODAS las páginas HTML

En cada página donde cargas Firebase, agrega este script **ANTES** de `firebase.js`:

```html
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-check-compat.js"></script>
```

**Páginas afectadas:**
- `home.html`
- `dashboard.html`
- `cotizaciones.html`
- `cuentas.html`
- `clientes.html`
- `contabilidad.html`
- `proyectos.html`
- `documentos.html`
- `usuarios.html`
- `public/cotizacion.html`
- `public/cuenta.html`
- `cliente/index.html`
- `cliente/cotizaciones.html`
- `cliente/proyectos.html`
- `cliente/documentos.html`

---

## Paso 4 — Activar enforcement en Firebase Console

1. Firebase Console → App Check → tu app
2. Toggle **"Enforce"** en:
   - ✅ Firestore
   - ✅ Authentication (opcional pero recomendado)
3. **⚠️ IMPORTANTE:** Activa enforcement DESPUÉS de desplegar el código nuevo.
   Si activas antes, el sistema deja de funcionar.

---

## Paso 5 — Debug token para desarrollo local

Cuando desarrollas en `localhost`, App Check no puede verificar el dominio.
Necesitas un token de debug:

```javascript
// Agrega esto en firebase.js SOLO en desarrollo local
// NUNCA lo dejes en producción
if (window.location.hostname === 'localhost') {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
```

Esto hace que Firebase imprima un token de debug en la consola.
Ve a Firebase Console → App Check → Apps → Debug tokens → agrega ese token.

---

## Resultado final

| Escenario | Sin App Check | Con App Check |
|---|---|---|
| DevTools → `db.collection("cotizaciones").get()` | ✅ Funciona | ❌ PERMISSION_DENIED |
| App en `domka-sw.github.io` | ✅ Funciona | ✅ Funciona |
| Script externo con tu config | ✅ Funciona | ❌ PERMISSION_DENIED |
| Postman / curl con apiKey | ✅ Funciona | ❌ PERMISSION_DENIED |

---

## ¿Qué pasa con los links públicos?

Los links públicos (`public/cotizacion.html`) también se sirven desde tu dominio,
así que App Check los verificará igual. El visitante no ve ningún captcha —
reCAPTCHA v3 es completamente invisible.

---

## Resumen de archivos a cambiar para App Check

1. `js/firebase.js` — agregar `.activate()` con tu Site Key
2. Todas las páginas HTML — agregar script `firebase-app-check-compat.js`
3. Firebase Console — activar enforcement en Firestore

Tiempo estimado de implementación: **15 minutos**.
