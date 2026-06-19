// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// Un único objeto mutable compartido entre todos los módulos.
// Al ser un ES Module, todos los imports apuntan a la misma referencia.
// ─────────────────────────────────────────────────────────────────────────────

export const state = {
    db:                  null,   // instancia Firestore
    auth:                null,   // instancia Firebase Auth
    currentUser:         null,   // usuario autenticado
    activeProjectId:     '',     // id de la obra seleccionada
    currentRole:         'Administrador',
    attachedFileBase64:  ''      // buffer temporal para adjuntos
};

// Permisos por rol
export const ROLE_PERMISSIONS = {
    'Administrador': { allowWrite: true,  allowDelete: true  },
    'Residente':     { allowWrite: true,  allowDelete: false },
    'Supervisor':    { allowWrite: false, allowDelete: false }
};

// ─────────────────────────────────────────────────────────────────────────────
// DATOS LOCALES (localStorage + datos de ejemplo)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY  = 'obramax_local_data';
const FB_CONFIG_KEY = 'obramax_user_fb_config';

export const SAMPLE_DATA = {
    projects: [
        { id: 'proj-1', name: 'Residencial San Felipe, Torre 1', code: 'RSF-T1', date: '2026-01-10', status: 'En Ejecución'    },
        { id: 'proj-2', name: 'Centro Logístico del Caribe',     code: 'CLC-02', date: '2026-03-01', status: 'En Planificación' }
    ],
    incomes: [
        { id: 'inc-1', projectId: 'proj-1', date: '2026-01-15', source: 'Anticipo Cliente Principal',   val: 55000000,  obs: 'Transferencia bancaria de inicio de obra.' },
        { id: 'inc-2', projectId: 'proj-1', date: '2026-02-10', source: 'Desembolso Credito Constructor', val: 120000000, obs: 'Giro aprobado por entidad bancaria.'       },
        { id: 'inc-3', projectId: 'proj-2', date: '2026-03-05', source: 'Aporte de Capital Socios',      val: 40000000,  obs: 'Fondo de caja de reserva.'                 }
    ],
    expenses: [
        { id: 'exp-1', projectId: 'proj-1', date: '2026-01-18', desc: 'Compra 100 Ton Acero Corrugado',      provider: 'Hierros de Occidente',  val: 48000000, type: 'MAT',      support: 'Factura',              supportNo: 'FAC-9812', file: '', obs: 'Material para cimentación.'       },
        { id: 'exp-2', projectId: 'proj-1', date: '2026-01-22', desc: 'Pago Nomina Primera Quincena',        provider: 'Consorcio Obras SAS',   val: 18500000, type: 'MO',       support: 'Recibo de pago',       supportNo: 'REC-054',  file: '', obs: 'Mano de obra directa.'           },
        { id: 'exp-3', projectId: 'proj-1', date: '2026-02-15', desc: 'Alquiler Retroexcavadora Caterpillar', provider: 'Equipos Especiales SAS', val: 12400000, type: 'EQU',      support: 'Transferencia bancaria', supportNo: 'TR-45129', file: '', obs: 'Alquiler por 10 días.'           },
        { id: 'exp-4', projectId: 'proj-1', date: '2026-02-18', desc: 'Poliza de Cumplimiento Contractual',  provider: 'Seguros del Estado',    val: 4500000,  type: 'COST IND', support: 'RUT',                  supportNo: '',         file: '', obs: 'Costo indirecto obligatorio.'   }
    ]
};

// Inicializado en app.js con localStorage o SAMPLE_DATA
export const localData = {
    projects: [],
    incomes:  [],
    expenses: []
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE PERSISTENCIA LOCAL
// ─────────────────────────────────────────────────────────────────────────────

export function saveLocalData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
}

export function loadLocalData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export function loadFbConfig() {
    const raw = localStorage.getItem(FB_CONFIG_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export function saveFbConfig(config) {
    localStorage.setItem(FB_CONFIG_KEY, JSON.stringify(config));
}

export function clearFbConfig() {
    localStorage.removeItem(FB_CONFIG_KEY);
}
