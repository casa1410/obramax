# OBRAMAX — Control de Gastos e Ingresos de Obra

Sistema de gestión financiera para empresas de construcción. Permite registrar ingresos, gastos y generar reportes por obra, con acceso multiusuario en tiempo real desde cualquier dispositivo.

---

## Características

- Dashboard con métricas financieras y gráficas en tiempo real
- Gestión de múltiples obras simultáneas con historial
- Registro de ingresos y gastos con filtros por fecha, tipo y proveedor
- Adjuntos de documentos soporte (facturas, comprobantes)
- Exportación a Excel, CSV e impresión de reportes
- Acceso por roles: Administrador, Residente de Obra, Supervisor
- Sincronización en tiempo real con Firebase Firestore
- Autenticación con email y contraseña, recuperación de contraseña por correo
- Funciona en PC y móvil (responsive)
- Modo sin conexión con localStorage como respaldo

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML + Vanilla JS (ES Modules, sin framework, sin bundler) |
| Estilos | Tailwind CSS (CDN) |
| Base de datos | Firebase Firestore |
| Autenticación | Firebase Auth (email + contraseña) |
| Hosting | Firebase Hosting |
| CI/CD | GitHub Actions |
| Gráficas | Chart.js |
| Exportación | SheetJS (xlsx) |

---

## Estructura de archivos

```
obramax/
├── index.html                  # Estructura HTML completa
├── css/
│   └── styles.css              # Estilos de impresión y scrollbar
├── js/
│   ├── config.js               # Credenciales Firebase — NO está en el repo (.gitignore)
│   ├── config.template.js      # Plantilla vacía para configuración local
│   ├── app.js                  # Punto de entrada e inicialización
│   ├── state.js                # Estado global compartido
│   ├── firebase.js             # Inicialización Firestore y helpers CRUD
│   ├── auth.js                 # Autenticación, roles y panel de usuarios
│   ├── ui.js                   # Navegación, toasts y dashboard
│   ├── charts.js               # Gráficas con Chart.js
│   ├── projects.js             # CRUD de obras
│   ├── incomes.js              # CRUD de ingresos
│   ├── expenses.js             # CRUD de gastos
│   ├── reports.js              # Reportes, impresión y exportación
│   └── utils.js                # Funciones de formato (moneda, fechas)
├── .github/
│   └── workflows/
│       └── deploy.yml          # Pipeline CI/CD → Firebase Hosting
├── firebase.json               # Configuración de Firebase Hosting
├── .firebaserc                 # Proyecto Firebase activo
└── .gitignore                  # config.js excluido por seguridad
```

---

## Desarrollo local

**Requisitos:** VS Code con la extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

1. Clonar el repositorio
2. Copiar `js/config.template.js` como `js/config.js` y rellenar con las credenciales del proyecto Firebase (Firebase Console → Configuración del proyecto → Tus apps)
3. Clic derecho en `index.html` → **Open with Live Server**

> `js/config.js` está en `.gitignore` y nunca se sube al repositorio.

---

## Configuración de Firebase (primera vez)

### 1. Crear proyecto Firebase
1. Ir a [console.firebase.google.com](https://console.firebase.google.com)
2. Crear nuevo proyecto
3. En **Authentication** → activar proveedor **Email/Contraseña**
4. En **Firestore Database** → crear base de datos en modo producción

### 2. Reglas de Firestore
Firebase Console → Firestore → pestaña **Reglas**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Crear el primer usuario (Administrador)
1. Firebase Console → **Authentication → Users → Agregar usuario**
2. Ingresar correo y contraseña del administrador
3. Entrar a la app con esas credenciales — el sistema asigna rol `Supervisor` automáticamente
4. En Firestore, ir a `artifacts/obramax-default/public/data/users/{uid}` y cambiar el campo `role` a `"Administrador"`
5. A partir de ahí, el administrador puede gestionar los demás roles desde la sección **Administración** dentro de la app

### 4. Roles del sistema

| Rol | Crear / Editar | Eliminar | Ver |
|---|---|---|---|
| Administrador | Sí | Sí | Sí |
| Residente de Obra | Sí | No | Sí |
| Supervisor | No | No | Sí |

---

## Despliegue

### Manual
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

### Automático — GitHub Actions (CI/CD)
Cada `push` a la rama `main` despliega la app automáticamente.

#### Configuración inicial

**Paso 1 — Obtener cuenta de servicio de Firebase**

Firebase Console → ⚙️ Configuración del proyecto → **Cuentas de servicio** → **Generar nueva clave privada** → descargar el archivo JSON.

**Paso 2 — Agregar secretos en GitHub**

GitHub → repositorio → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Contenido completo del JSON descargado en el paso anterior |
| `FIREBASE_API_KEY` | `apiKey` de Firebase |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` de Firebase |
| `FIREBASE_PROJECT_ID` | `projectId` de Firebase |
| `FIREBASE_STORAGE_BUCKET` | `storageBucket` de Firebase |
| `FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` de Firebase |
| `FIREBASE_APP_ID` | `appId` de Firebase |

Los valores están en Firebase Console → Configuración del proyecto → Tus apps.

**Paso 3 — Verificar**

Hacer cualquier commit a `main`. En GitHub → pestaña **Actions** se puede ver el pipeline. En ~30 segundos la app queda publicada en la URL de producción.

---

## URL de producción

`https://obramax-empresa.web.app`
