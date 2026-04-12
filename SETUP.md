# DOMKA — Guía de despliegue y configuración

## Índice
1. Paso 1 — Firestore Security Rules
2. Paso 2 — Crear el primer Admin
3. Paso 3 — Actualizar pages existentes (agregar roles.js)
4. Paso 4 — Headers de seguridad con Cloudflare (gratis)
5. Estructura de colecciones Firebase
6. Flujo: Cotización → Proyecto (automático)
7. Resumen de archivos nuevos

---

## Paso 1 — Firestore Security Rules

**Firebase Console → Firestore → Rules**

Reemplaza TODO el contenido con el archivo `firestore.rules` incluido en este paquete.

```
rules_version = '2'; ...
```

> ⚠️ Esto reemplaza el "allow all until 2027". Con las nuevas reglas:
> - Solo usuarios autenticados con rol correcto pueden leer/escribir
> - Los links públicos de cotizaciones/cuentas/documentos siguen funcionando (allow read: true)
> - Técnicos NO pueden ver precios ni cotizaciones
> - Clientes solo ven SUS datos

---

## Paso 2 — Crear el primer Admin

El primer usuario Admin debes crearlo manualmente:

### 2a. Crear cuenta en Firebase Auth
Firebase Console → Authentication → Add user
- Email: tu correo
- Password: mínimo 8 caracteres

### 2b. Crear perfil en Firestore
Firebase Console → Firestore → Nueva colección `usuarios`
- Document ID: el UID que aparece en Authentication
- Campos:
  ```
  email:    "tu@correo.com"
  nombre:   "Tu Nombre"
  rol:      "admin"
  activo:   true
  clienteId: null
  creadoEn: (timestamp ahora)
  ```

### 2c. Desde ahí en adelante
Los demás usuarios los creas desde `usuarios.html` en el portal.

---

## Paso 3 — Actualizar páginas existentes

En CADA página interna (dashboard.html, cotizaciones.html, cuentas.html, clientes.html, contabilidad.html) debes:

### 3a. Agregar roles.js entre firebase.js y auth.js

**ANTES (lo que tienes hoy):**
```html
<script src="js/firebase.js"></script>
<script src="js/auth.js"></script>
```

**DESPUÉS (lo que debe quedar):**
```html
<script src="js/firebase.js"></script>
<script src="js/roles.js"></script>
<script src="js/auth.js"></script>
```

> Esto aplica a: dashboard.html, cotizaciones.html, cuentas.html, clientes.html, contabilidad.html

### 3b. Actualizar el sidebar en cada página

Agregar los nuevos links al sidebar (después de Clientes):

```html
<a href="proyectos.html" class="sidebar-link"><i class="fas fa-hard-hat"></i> Proyectos</a>
<a href="documentos.html" class="sidebar-link" data-rol-min="comercial"><i class="fas fa-folder-open"></i> Documentos</a>
<a href="contabilidad.html" class="sidebar-link" data-rol-min="admin"><i class="fas fa-chart-bar"></i> Contabilidad</a>
<a href="usuarios.html" class="sidebar-link" data-rol-min="admin"><i class="fas fa-user-cog"></i> Usuarios</a>
```

### 3c. Agregar id="user-rol" en el sidebar footer

Busca el span con `id="user-email"` en el sidebar y agrega debajo:
```html
<span style="display:block;font-size:.6rem;color:var(--gray-lt)" id="user-rol"></span>
```

---

## Paso 4 — Headers de seguridad con Cloudflare (gratis)

GitHub Pages no permite headers HTTP personalizados. Cloudflare actúa como proxy gratuito y los aplica.

### 4a. Agregar tu dominio a Cloudflare
1. Entra a cloudflare.com → Add a site
2. Ingresa tu dominio (ej: domkatools.com)
3. Selecciona plan Free
4. Cloudflare te dará 2 nameservers → cámbialos en tu registrador de dominio

### 4b. Configurar CNAME en Cloudflare
DNS → Add record:
```
Type: CNAME
Name: @ (o www)
Target: domka-sw.github.io
Proxy status: Proxied (nube naranja ✓)
```

### 4c. Activar reglas de seguridad en Cloudflare
Security → WAF → Managed Rules → activar "Cloudflare Managed Ruleset"

### 4d. Activar HTTPS siempre
SSL/TLS → Edge Certificates → Always Use HTTPS: ON
Minimum TLS Version: TLS 1.2

### 4e. El archivo _headers
El archivo `_headers` incluido en este paquete funciona automáticamente si usas
Cloudflare Pages en lugar de GitHub Pages. Si sigues en GitHub Pages + Cloudflare proxy,
agrega las reglas manualmente en:
Cloudflare → Rules → Transform Rules → Modify Response Headers

---

## Estructura de colecciones Firebase

### Colección: `usuarios`
```
uid (= Document ID = Firebase Auth UID)
  email:     string
  nombre:    string
  rol:       "admin" | "comercial" | "tecnico" | "cliente"
  activo:    boolean
  clienteId: string | null   ← ID del doc en 'clientes' (solo rol cliente)
  creadoEn:  timestamp
```

### Colección: `proyectos` (NUEVA)
```
  numero:        "PROY-0001"
  clienteId:     string       ← ID en 'clientes'
  nombreCliente: string
  cotizacionId:  string       ← ID de la cotización origen
  descripcion:   string
  estado:        "pendiente" | "en_ejecucion" | "finalizado" | "suspendido"
  tecnicoId:     string | null
  tecnicoNombre: string | null
  evidencias:    Array<{nombre, tipo, base64, fecha, subidoPor}>
  creadoEn:      timestamp
  updatedAt:     timestamp
```

### Colección: `documentos` (NUEVA)
```
  numero:        "DOC-0001"
  clienteId:     string
  nombreCliente: string
  tipo:          "Contrato" | "Acta de inicio" | "Acta de entrega" | ...
  descripcion:   string
  estado:        "pendiente" | "aprobado" | "rechazado" | "anulado"
  pdfBase64:     string | null
  linkPublico:   string
  creadoPor:     string (uid)
  creadoEn:      timestamp
  fechaRespuesta: timestamp | null
```

### Colección: `contadores` (NUEVA)
```
  COT: { ultimo: number }
  PROY: { ultimo: number }
  DOC: { ultimo: number }
```
> ⚠️ Las cotizaciones/cuentas existentes no tienen número. Solo las nuevas lo tendrán.
> Para migrar las existentes, puedes hacer un script desde contabilidad o en la consola Firebase.

---

## Flujo: Cotización aprobada → Proyecto automático

Cuando el cliente aprueba una cotización (desde su portal o link público),
debes agregar en `js/cotizaciones.js` la creación automática del proyecto.

Busca la función donde el cliente aprueba (o donde se actualiza el estado)
y agrega después del update:

```javascript
// En cotizaciones.js — después de actualizar estado a 'aprobada':
if (nuevoEstado === 'aprobada') {
  const numero = await generarNumero('PROY');
  await db.collection('proyectos').add({
    numero,
    clienteId:    cotizacion.clienteId,
    nombreCliente: cotizacion.nombreCliente,
    cotizacionId: cotizacionId,
    descripcion:  cotizacion.notas || cotizacion.tipo || '',
    estado:       'pendiente',
    tecnicoId:    null,
    tecnicoNombre: null,
    evidencias:   [],
    creadoEn:     firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt:    firebase.firestore.FieldValue.serverTimestamp()
  });
}
```

---

## Resumen de archivos nuevos en este paquete

| Archivo | Descripción |
|---|---|
| `firestore.rules` | Reglas de seguridad reales (reemplaza allow-all) |
| `js/roles.js` | Sistema de roles, carga perfil, helpers esAdmin/esComercial |
| `js/auth.js` | Auth actualizado: rate limiting, redirección por rol |
| `js/proyectos.js` | Módulo proyectos: listado, evidencias, estados |
| `js/documentos.js` | Módulo documentos: CRUD, links públicos |
| `js/usuarios.js` | Gestión de usuarios (solo Admin) |
| `proyectos.html` | Página de proyectos |
| `documentos.html` | Página de documentos |
| `usuarios.html` | Página de gestión de usuarios |
| `cliente/index.html` | Dashboard del portal cliente |
| `cliente/cotizaciones.html` | Cotizaciones del cliente con aprobar/rechazar |
| `cliente/proyectos.html` | Proyectos del cliente con galería de evidencias |
| `cliente/documentos.html` | Documentos del cliente con aprobar/rechazar |
| `_headers` | Headers HTTP de seguridad para Cloudflare |
| `SETUP.md` | Esta guía |

---

## Checklist de despliegue

- [ ] Aplicar firestore.rules en Firebase Console
- [ ] Crear primer usuario Admin manualmente en Firebase
- [ ] Agregar `roles.js` en dashboard.html, cotizaciones.html, cuentas.html, clientes.html, contabilidad.html
- [ ] Actualizar sidebar en esas mismas páginas
- [ ] Subir todos los archivos nuevos al repo GitHub
- [ ] Configurar Cloudflare como proxy del dominio
- [ ] Activar HTTPS Always en Cloudflare
- [ ] Probar login con cada rol (admin, comercial, tecnico, cliente)
- [ ] Verificar que técnico NO ve cotizaciones
- [ ] Verificar que cliente solo ve SUS datos
