# DOMKA — Respuesta al Audit de Seguridad

## Estado por vulnerabilidad

---

### 🔴 2.1 — Acceso global a la base de datos
**Hallazgo:** `db.collection("cotizaciones").get()` funcionó desde consola.

**Causa raíz:** `allow read: if true` no distingue entre `get` (1 doc) y `list` (toda la colección).

**Fix aplicado:** Las nuevas Rules usan operaciones separadas:
```
allow get:  if true;              // links públicos: OK
allow list: if isComercial();     // listar toda la colección: solo internos
```
**Resultado:** Desde consola sin auth → `db.collection("cotizaciones").get()` = **PERMISSION_DENIED**

---

### 🔴 2.2 — Escritura sin autenticación
**Hallazgo:** `db.collection("cotizaciones").add({...})` posiblemente funcionaba.

**Fix aplicado:**
```
allow create: if isComercial()   // requiere auth + rol válido + activo=true
  && request.resource.data.keys().hasAll([...campos obligatorios...])
  && request.resource.data.total is number
  && request.resource.data.tokenPublico.size() >= 32;
```
**Resultado:** Sin login = **PERMISSION_DENIED**. Con login pero sin rol = **PERMISSION_DENIED**.

---

### 🔴 2.3 — Lógica de seguridad en frontend (bypass)
**Hallazgo:** Entrar directo a `/dashboard.html` o manipular JS desde consola.

**Realidad de arquitectura:** Con Firebase puro en frontend, **las Rules SON el backend**.
La UI puede bypassearse, pero las Rules de Firestore no.

**Fix aplicado:**
- Rules con `userActivo()` — usuarios desactivados rechazados en BD, no solo en UI
- `auth.js` redirige según rol como segunda línea de defensa (UX, no seguridad primaria)
- Cualquier query que haga el JS en dashboard sin auth → rechazada por Rules

**Lo que queda pendiente (requiere backend real):**
- Protección 100% de la lógica de presentación requeriría un servidor (Cloud Functions / Next.js API)
- Para el alcance actual, las Rules resuelven el problema de datos

---

### 🔴 2.4 — Links públicos sin restricción granular
**Hallazgo:** `allow read: if true` → link público = acceso a todo.

**Fix aplicado — dos capas:**

**Capa 1 (Rules):** `get` vs `list`
```
allow get: if true;              // 1 doc por ID: OK
allow list: if isComercial();    // enumerar toda la colección: bloqueado
```

**Capa 2 (Token):** Cada cotización/cuenta/documento tiene un `tokenPublico` UUID de 32+ chars.
El link incluye `?id=DOC_ID&token=UUID`. La página pública verifica que el token del URL
coincide con el token almacenado en el documento. Sin token correcto = pantalla de acceso denegado.

Para escritura (aprobación/rechazo) desde link público, la Rule verifica:
```
|| (!isAuth()
    && tieneToken()
    && tokenValido()  // token del update == token en el documento
    && soloEstadoCambia([...]))
```
**Resultado:** Conocer el ID del documento ya no es suficiente. Se necesita también el token.

---

### 🔴 2.5 — Exposición del SDK de Firebase en frontend
**Hallazgo:** Cualquier usuario puede ejecutar queries desde DevTools.

**Fix aplicado — Rules (get vs list, tokens):** Reducen lo que se puede hacer aunque el SDK esté expuesto.

**Fix pendiente — Firebase App Check:** Ver `APPCHECK.md`.
App Check vincula las llamadas al dominio verificado. Desde una consola externa con
la misma config → `PERMISSION_DENIED` automático aunque tengan el apiKey.

**Acción requerida:** Seguir los pasos de `APPCHECK.md` (~15 min).

---

### 🔴 2.6 — Falta de separación acceso público / interno
**Fix aplicado:**

| Operación | Sin auth | Cliente logueado | Técnico | Comercial | Admin |
|---|---|---|---|---|---|
| `cotizaciones.get(id)` | ✅ (con token) | ✅ | ✅ | ✅ | ✅ |
| `cotizaciones.list()` | ❌ | ❌* | ❌ | ✅ | ✅ |
| `cotizaciones.add()` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `clientes.list()` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `usuarios.list()` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `movimientos.list()` | ❌ | ❌ | ❌ | ❌ | ✅ |

*Cliente solo puede listar sus propias cotizaciones con `where('clienteId', '==', suId)`.

---

### 🔴 2.7 — Validación débil de datos
**Fix aplicado en Rules:**
```
allow create: if isComercial()
  && request.resource.data.keys().hasAll(['clienteId','nombreCliente','total','estado','tokenPublico'])
  && request.resource.data.estado == 'pendiente'
  && request.resource.data.total is number
  && request.resource.data.total >= 0
  && request.resource.data.tokenPublico is string
  && request.resource.data.tokenPublico.size() >= 32;
```
- Campos obligatorios verificados
- Tipos verificados (`total` debe ser número, no string)
- Estado inicial siempre `pendiente` (no se puede crear una cotización ya aprobada)
- Token obligatorio y de longitud mínima

Para `logs`:
```
allow create: if
  request.resource.data.keys().hasAll(['tipo','accion','timestamp'])
  && request.resource.data.tipo in ['cotizacion','cuenta','documento']
  && request.resource.data.accion in ['vista','aprobada','rechazada','recibido_confirmado']
  && !request.resource.data.keys().hasAny(['__proto__','constructor','prototype']);
```

---

## Superficie de ataque: antes vs después

| Vector | Antes | Después |
|---|---|---|
| Listar todas las cotizaciones sin auth | ✅ Posible | ❌ Bloqueado |
| Leer 1 cotización por ID sin auth | ✅ Posible | ✅ Permitido (diseño) |
| Leer 1 cotización con token incorrecto | ✅ Posible | ⚠️ Dato visible, acción bloqueada* |
| Aprobar cotización sin token | ✅ Posible | ❌ Bloqueado en Rules |
| Insertar datos falsos sin auth | ✅ Posible | ❌ Bloqueado |
| Escalar privilegios (cliente → admin) | ✅ Posible | ❌ Bloqueado (Rules verifican rol en BD) |
| Usuario desactivado accede | ✅ Posible | ❌ Bloqueado (userActivo en Rules) |
| Usar SDK desde consola externa | ✅ Posible | ⚠️ Parcial (App Check = fix completo) |
| Contaminar logs con datos arbitrarios | ✅ Posible | ❌ Bloqueado (validación de estructura) |

*El `get` individual de un doc con `read: if true` no puede restringirse por token en Rules
(las Rules no leen query params). El token bloquea las ACCIONES (update) pero no la lectura.
La protección de lectura es `list: bloqueado` (no pueden enumerar) + App Check.

---

## Checklist de activación

- [ ] Aplicar `firestore.rules` en Firebase Console → Firestore → Rules
- [ ] Subir archivos al repo (incluye `js/security.js` nuevo)
- [ ] Verificar que cotizaciones nuevas generan token (prueba crear una)
- [ ] Verificar link público incluye `?id=X&token=Y`
- [ ] Activar Firebase App Check (ver `APPCHECK.md`)
- [ ] Probar desde DevTools: `db.collection("cotizaciones").get()` → debe dar error
- [ ] Probar link público sin token → debe mostrar "Acceso no autorizado"
- [ ] Probar link público con token → debe mostrar cotización normalmente
