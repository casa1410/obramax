# CLAUDE.md — Contexto del proyecto OBRAMAX

Contexto técnico para continuar el desarrollo sin releer todo el código.

---

## Descripción

**OBRAMAX** es una SPA (Single Page Application) de control financiero para obras de construcción. La usa un equipo de hasta 5 personas para registrar ingresos y gastos de múltiples proyectos simultáneos, con roles diferenciados.

- **Usuarios:** máximo 5 personas
- **Obras simultáneas:** máximo 5 activas, historial conservado
- **Moneda:** Pesos colombianos (COP), formato `es-CO`
- **URL producción:** `https://obramax-empresa.web.app`

---

## Stack

- **Frontend:** HTML + Vanilla JS (ES Modules, sin framework, sin bundler)
- **Estilos:** Tailwind CSS (CDN)
- **Base de datos:** Firebase Firestore (plan Spark, gratuito)
- **Auth:** Firebase Auth — email + contraseña — **implementado**
- **Hosting:** Firebase Hosting — **activo**
- **CI/CD:** GitHub Actions → `.github/workflows/deploy.yml`
- **Gráficas:** Chart.js (CDN)
- **Exportación Excel:** SheetJS/xlsx (CDN)

---

## Arquitectura de módulos

```
app.js          Punto de entrada. Inicializa estado, escucha app:refresh, expone funciones a window
state.js        Estado global mutable (singleton ES Module). Todos los módulos lo importan por referencia
config.js       Credenciales Firebase. En .gitignore — NO está en el repo
config.template.js  Plantilla vacía para desarrollo local
utils.js        Funciones puras: formatCurrency, formatCurrencyInput, getRawNumericValue, todayISO
firebase.js     Inicialización Firestore + cloudSave() + cloudDelete() + onSnapshot listeners
auth.js         Firebase Auth: login, logout, recuperar contraseña, roles, panel de usuarios
ui.js           Navegación (switchView), toasts, dashboard (calculateBalances), selector de proyecto
charts.js       Renderizado Chart.js (donut gastos por tipo + barras ingresos vs gastos)
projects.js     CRUD de proyectos
incomes.js      CRUD de ingresos
expenses.js     CRUD de gastos + base64 file handling
reports.js      Vista previa de reporte, print, exportación Excel/CSV
```

### Patrón de comunicación entre módulos
- Los módulos CRUD disparan `document.dispatchEvent(new Event('app:refresh'))` tras modificar datos
- `app.js` escucha ese evento y ejecuta `renderAll()`
- Los listeners de Firestore (`onSnapshot`) también disparan `app:refresh`
- Evita dependencias circulares — ningún módulo CRUD importa de `app.js`

### Flujo de inicialización
```
window.onload
  └── loadLocalData() / SAMPLE_DATA
  └── exposeToWindow()
  └── initFirebase(config)  → state.db = Firestore, setupFirestoreListeners(), returns true/false
        └── initAuth()      → onAuthStateChanged → muestra login screen o app
              └── loadOrCreateUserDoc(user) → carga/crea rol en Firestore
```

**Sin bundler.** Los imports usan URLs CDN para Firebase. Los demás módulos usan paths relativos. Funciona directamente en el navegador.

---

## Estado global (`state.js`)

```js
export const state = {
  db:              null,    // Instancia Firestore (seteada en initFirebase)
  currentUser:     null,    // Usuario Firebase Auth autenticado
  activeProjectId: '',      // ID de la obra seleccionada en el sidebar
  currentRole:     'Supervisor', // Rol cargado de Firestore tras login
  attachedFileBase64: ''    // Buffer temporal de adjunto en formulario de gastos
};

export const localData = {  // Datos en memoria — sincronizados con Firestore o localStorage
  projects: [],
  incomes:  [],
  expenses: []
};
```

`localData` se muta directamente. Al ser singleton, todos los módulos que lo importan ven la misma referencia.

---

## Modelo de datos

### `projects`
```js
{ id, name, code, date, status }
// status: 'En Ejecución' | 'En Planificación' | 'Suspendida' | 'Finalizada'
```

### `incomes`
```js
{ id, projectId, date, source, val, obs }
```

### `expenses`
```js
{ id, projectId, date, type, provider, val, desc, support, supportNo, file, obs }
// type: 'EQU' | 'MAT' | 'TPT' | 'MO' | 'COST IND' | 'CONT'
// file: base64 del adjunto (pendiente migrar a Firebase Storage)
```

### `users`
```js
{ email, name, role }
// role: 'Administrador' | 'Residente' | 'Supervisor'
// Documento en Firestore creado automáticamente en el primer login
```

---

## Rutas Firestore

```
APP_ID = 'obramax-default'   ← hardcodeado en firebase.js y auth.js

artifacts/{APP_ID}/public/data/projects/{docId}
artifacts/{APP_ID}/public/data/incomes/{docId}
artifacts/{APP_ID}/public/data/expenses/{docId}
artifacts/{APP_ID}/public/data/users/{uid}
```

---

## Autenticación y roles

- El administrador crea cuentas desde Firebase Console → Authentication → Users
- Al primer login, `auth.js` crea un documento en `users/{uid}` con rol `Supervisor`
- El administrador cambia roles desde la sección **Administración** de la app
- Los roles se leen de Firestore en cada login (no hay JWT custom claims)
- Los permisos se validan en cliente — para validación en servidor se necesitan Security Rules y Custom Claims (pendiente)

---

## Reglas de Firestore

**Actuales (desarrollo):**
```
allow read, write: if true;
```

**Producción (aplicar cuando el equipo esté configurado):**
```
allow read, write: if request.auth != null;
```

---

## CI/CD

`.github/workflows/deploy.yml` — se dispara en cada push a `main`:
1. Genera `js/config.js` desde GitHub Secrets (las credenciales no están en el repo)
2. Despliega a Firebase Hosting con `FirebaseExtended/action-hosting-deploy@v0`

**Secrets requeridos en GitHub:** `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`

---

## Convenciones de código

- ES Modules con `import/export` explícito, sin TypeScript
- Sin comentarios salvo que expliquen un "por qué" no obvio
- Funciones de CRUD: si `state.db` existe → cloud; si no → localStorage
- Funciones expuestas al HTML via `window` se asignan en `exposeToWindow()` en `app.js`
- CSS: solo Tailwind utility classes. Clases propias: `no-print`, `nav-item`
- Formateo moneda: `formatCurrency(value)` en `utils.js` — siempre COP con locale `es-CO`

---

## Pendiente

1. **Reglas Firestore seguras** — cambiar a `if request.auth != null` en producción
2. **Firebase Storage** — reemplazar base64 en gastos por URLs de Storage (requiere plan Blaze)
3. **Paginación** — tablas de ingresos y gastos tienen contador pero botones anterior/siguiente desactivados
4. **Presupuesto por obra** — campo de presupuesto en proyectos + comparativa vs. gasto real en dashboard
5. **Custom Claims** — roles en JWT para validación server-side en Firestore Rules
