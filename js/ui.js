// ─────────────────────────────────────────────────────────────────────────────
// UI — Navegación, toasts, dashboard y selector de proyecto
// ─────────────────────────────────────────────────────────────────────────────

import { state, localData } from './state.js';
import { formatCurrency }                      from './utils.js';

// ── Toast / notificaciones ────────────────────────────────────────────────────

export function showToast(message, type = 'info') {
    const STYLES = {
        success: { bg: 'bg-emerald-400', icon: 'fa-solid fa-circle-check',       color: 'text-slate-950' },
        error:   { bg: 'bg-rose-600',    icon: 'fa-solid fa-circle-exclamation', color: 'text-white'     },
        info:    { bg: 'bg-amber-400',   icon: 'fa-solid fa-info',               color: 'text-slate-950' }
    };
    const s = STYLES[type] || STYLES.info;

    document.getElementById('toast-text').innerText    = message;
    document.getElementById('toast-icon-bg').className = `p-2 rounded-lg ${s.color} ${s.bg}`;
    document.getElementById('toast-icon').className    = s.icon;

    const toast = document.getElementById('toast-message');
    toast.classList.remove('translate-y-10', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(dismissToast, 4000);
}

export function dismissToast() {
    const toast = document.getElementById('toast-message');
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-10', 'opacity-0');
}

// ── Navegación entre vistas ───────────────────────────────────────────────────

const VIEW_META = {
    dashboard: { title: 'Panel Principal',                subtitle: 'Resumen general y estado de flujos financieros'           },
    projects:  { title: 'Gestión de Obras',               subtitle: 'Crea y administra múltiples proyectos y presupuestos'     },
    income:    { title: 'Registro de Ingresos de Obra',   subtitle: 'Ingresa flujos, inyecciones de capital y anticipos'       },
    expenses:  { title: 'Registro de Gastos de Obra',     subtitle: 'Controla egresos, mano de obra, insumos y contratistas'   },
    reports:   { title: 'Centro de Reportes y Auditoría', subtitle: 'Filtra, imprime reportes y exporta a Excel/CSV'           },
    cloud:     { title: 'Administración de Usuarios',      subtitle: 'Gestiona el equipo de trabajo y sus roles de acceso'      }
};

export function switchView(viewId) {
    Object.keys(VIEW_META).forEach(v => {
        document.getElementById(`view-${v}`)?.classList.add('hidden');
    });
    document.getElementById(`view-${viewId}`)?.classList.remove('hidden');

    const meta = VIEW_META[viewId] || {};
    document.getElementById('current-view-title').innerText    = meta.title    || '';
    document.getElementById('current-view-subtitle').innerText = meta.subtitle || '';

    document.querySelectorAll('.nav-item').forEach(item => {
        const isActive = item.getAttribute('data-view') === viewId;
        item.className = isActive
            ? 'nav-item w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition duration-200 bg-slate-800 text-white border-l-4 border-amber-500'
            : 'nav-item w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition duration-200 text-slate-400 hover:bg-slate-800 hover:text-white border-l-4 border-transparent';
    });

    // Cerrar menú en móvil al navegar
    if (window.innerWidth < 768) {
        const menu = document.getElementById('sidebar-collapsible');
        menu?.classList.add('hidden');
        menu?.classList.remove('flex');
    }
}

export function toggleMobileMenu() {
    const menu = document.getElementById('sidebar-collapsible');
    menu.classList.toggle('hidden');
    menu.classList.toggle('flex');
}

// ── Selector de proyecto activo ───────────────────────────────────────────────

export function updateSidebarProjectSelector() {
    const select = document.getElementById('sidebar-project-select');
    select.innerHTML = '';

    if (localData.projects.length === 0) {
        select.innerHTML = '<option value="">-- Sin obras registradas --</option>';
        return;
    }
    localData.projects.forEach(p => {
        const opt     = document.createElement('option');
        opt.value     = p.id;
        opt.innerText = p.name;
        opt.selected  = p.id === state.activeProjectId;
        select.appendChild(opt);
    });
}

export function updateActiveProjectUI() {
    const proj    = localData.projects.find(p => p.id === state.activeProjectId);
    const alert   = document.getElementById('no-project-alert');
    const badge   = document.getElementById('header-active-project-name');

    if (proj) {
        alert?.classList.add('hidden');
        badge.innerText = `Obra: ${proj.name}`;
    } else {
        alert?.classList.remove('hidden');
        badge.innerText       = 'Obra: Ninguna seleccionada';
        state.activeProjectId = '';
    }
}

export function setActiveProject(id) {
    state.activeProjectId = id;
    document.dispatchEvent(new Event('app:refresh'));
}

export function changeSimulatedRole(role) {
    state.currentRole = role;
    document.getElementById('user-role').innerText = role;
    showToast(`Rol cambiado a: ${role}`, 'success');
}

// ── Dashboard — cálculo de saldos y movimientos recientes ────────────────────

export function calculateBalances() {
    const startDate = document.getElementById('dash-filter-start').value;
    const endDate   = document.getElementById('dash-filter-end').value;

    let incomes  = localData.incomes.filter(i  => i.projectId === state.activeProjectId);
    let expenses = localData.expenses.filter(e => e.projectId === state.activeProjectId);

    if (!state.activeProjectId) { incomes = []; expenses = []; }
    if (startDate) { incomes = incomes.filter(i => i.date >= startDate); expenses = expenses.filter(e => e.date >= startDate); }
    if (endDate)   { incomes = incomes.filter(i => i.date <= endDate);   expenses = expenses.filter(e => e.date <= endDate);   }

    const totalIn  = incomes.reduce((s, i)  => s + Number(i.val  || 0), 0);
    const totalOut = expenses.reduce((s, e) => s + Number(e.val || 0), 0);
    const balance  = totalIn - totalOut;

    document.getElementById('metric-total-income').innerText   = formatCurrency(totalIn);
    document.getElementById('metric-total-expenses').innerText = formatCurrency(totalOut);
    document.getElementById('metric-net-balance').innerText    = formatCurrency(balance);
    document.getElementById('metric-income-count').innerText   = `${incomes.length} ingresos registrados`;
    document.getElementById('metric-expense-count').innerText  = `${expenses.length} gastos registrados`;

    const isPositive = balance >= 0;
    document.getElementById('metric-balance-indicator-bar').className   = `absolute bottom-0 left-0 right-0 h-1 ${isPositive ? 'bg-primary-500' : 'bg-amber-500'}`;
    document.getElementById('metric-balance-icon-container').className  = `p-4 rounded-xl text-2xl ${isPositive ? 'bg-primary-50 text-primary-600' : 'bg-amber-50 text-amber-600'}`;
    document.getElementById('metric-balance-label').className           = `text-xs font-semibold tracking-wider uppercase block ${isPositive ? 'text-primary-600' : 'text-amber-600'}`;

    renderRecentMovements(incomes, expenses);
}

function renderRecentMovements(incomes, expenses) {
    const tbody = document.getElementById('dashboard-recent-movements-tbody');

    const movements = [
        ...incomes.map(i  => ({ ...i, txType: 'Ingreso', css: 'text-emerald-600 bg-emerald-50 border border-emerald-200', sign: '+' })),
        ...expenses.map(e => ({ ...e, txType: 'Gasto',   css: 'text-rose-600 bg-rose-50 border border-rose-200',         sign: '-' }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    if (movements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 text-xs">No hay movimientos registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = movements.slice(0, 10).map(m => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-6 font-mono text-xs text-slate-500">${m.date}</td>
            <td class="py-3 px-6"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.css}">${m.txType}</span></td>
            <td class="py-3 px-6 font-medium text-slate-900">${m.txType === 'Ingreso' ? m.source : m.desc}</td>
            <td class="py-3 px-6 text-slate-500 text-xs">${m.txType === 'Gasto' ? m.provider : '-'}</td>
            <td class="py-3 px-6 text-right font-bold ${m.txType === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}">${m.sign}${formatCurrency(m.val)}</td>
        </tr>`).join('');
}

export function applyDashboardFilters() {
    document.dispatchEvent(new Event('app:refresh'));
}

export function resetDashboardFilters() {
    document.getElementById('dash-filter-start').value = '';
    document.getElementById('dash-filter-end').value   = '';
    document.dispatchEvent(new Event('app:refresh'));
}
