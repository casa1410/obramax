// ─────────────────────────────────────────────────────────────────────────────
// PROYECTOS — CRUD de obras de construcción
// ─────────────────────────────────────────────────────────────────────────────

import { state, localData, ROLE_PERMISSIONS, saveLocalData } from './state.js';
import { formatCurrency, todayISO }                           from './utils.js';
import { showToast }                                          from './ui.js';
import { cloudSave, cloudDelete }                             from './firebase.js';

const STATUS_COLORS = {
    'En Ejecución':     'bg-emerald-100 text-emerald-800',
    'En Planificación': 'bg-blue-100 text-blue-800',
    'Suspendida':       'bg-amber-100 text-amber-800',
    'Finalizada':       'bg-slate-200 text-slate-700'
};

function refresh() { document.dispatchEvent(new Event('app:refresh')); }

// ── Listado ───────────────────────────────────────────────────────────────────

export function loadProjectsGrid() {
    const grid = document.getElementById('projects-grid');

    if (localData.projects.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white p-12 text-center rounded-xl border-2 border-dashed border-slate-200">
                <i class="fa-solid fa-folder-open text-slate-300 text-5xl mb-4"></i>
                <h4 class="font-bold text-slate-700">No hay proyectos de construcción</h4>
                <p class="text-xs text-slate-500 max-w-sm mx-auto mt-2">Comienza creando tu primera obra para registrar presupuestos, compras y mano de obra.</p>
                <button onclick="openProjectModal()" class="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold rounded-lg shadow transition">Crear Obra</button>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    localData.projects.forEach(p => {
        const totalIn  = localData.incomes.filter(i  => i.projectId === p.id).reduce((s, i)  => s + Number(i.val  || 0), 0);
        const totalOut = localData.expenses.filter(e => e.projectId === p.id).reduce((s, e) => s + Number(e.val || 0), 0);
        const balance  = totalIn - totalOut;
        const isActive = state.activeProjectId === p.id;
        const statusColor = STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-700';

        const card = document.createElement('div');
        card.className = `bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md ${isActive ? 'border-amber-500 ring-2 ring-amber-500/15' : 'border-slate-200'}`;
        card.innerHTML = `
            <div class="p-5 space-y-4">
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 font-mono">${p.code || 'SIN COD'}</span>
                        <h4 class="font-bold text-slate-900 mt-1 hover:text-primary-600 cursor-pointer text-base" onclick="setActiveProject('${p.id}')">${p.name}</h4>
                    </div>
                    <span class="px-2 py-1 rounded text-[10px] font-bold shrink-0 ${statusColor}">${p.status}</span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                        <span class="text-[10px] text-slate-400 font-medium block">Total Ingresos</span>
                        <span class="font-bold text-emerald-600">${formatCurrency(totalIn)}</span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 font-medium block">Total Gastos</span>
                        <span class="font-bold text-rose-600">${formatCurrency(totalOut)}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center text-xs">
                    <div>
                        <span class="text-[10px] text-slate-400 block font-medium">Saldo Disponible</span>
                        <span class="font-bold text-slate-800 text-sm">${formatCurrency(balance)}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] text-slate-400 block font-medium">Fecha de Inicio</span>
                        <span class="font-semibold text-slate-600">${p.date}</span>
                    </div>
                </div>
            </div>
            <div class="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <button onclick="setActiveProject('${p.id}')" class="text-xs font-bold text-slate-600 hover:text-amber-600 flex items-center gap-1.5 transition">
                    <i class="fa-solid fa-folder-open"></i> ${isActive ? 'Seleccionada' : 'Seleccionar'}
                </button>
                <div class="flex gap-2">
                    <button onclick="openProjectModal('${p.id}')" class="text-xs text-slate-500 hover:text-slate-900 p-1 transition" title="Editar">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteProject('${p.id}')" class="text-xs text-rose-500 hover:text-rose-700 p-1 transition" title="Eliminar">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function openProjectModal(id = '') {
    document.getElementById('modal-project').classList.remove('hidden');

    if (id) {
        const p = localData.projects.find(p => p.id === id);
        document.getElementById('project-modal-title').innerText = 'Editar Obra / Proyecto';
        document.getElementById('project-form-id').value         = p.id;
        document.getElementById('project-form-name').value       = p.name;
        document.getElementById('project-form-code').value       = p.code || '';
        document.getElementById('project-form-date').value       = p.date;
        document.getElementById('project-form-status').value     = p.status;
    } else {
        document.getElementById('project-modal-title').innerText = 'Registrar Nueva Obra';
        document.getElementById('project-form-id').value         = '';
        document.getElementById('project-form-name').value       = '';
        document.getElementById('project-form-code').value       = '';
        document.getElementById('project-form-date').value       = todayISO();
        document.getElementById('project-form-status').value     = 'En Ejecución';
    }
}

export function closeProjectModal() {
    document.getElementById('modal-project').classList.add('hidden');
}

// ── Guardar ───────────────────────────────────────────────────────────────────

export async function saveProjectForm(e) {
    e.preventDefault();
    if (!ROLE_PERMISSIONS[state.currentRole].allowWrite) {
        showToast('Su rol no permite modificar información.', 'error');
        return;
    }

    const id   = document.getElementById('project-form-id').value;
    const data = {
        name:   document.getElementById('project-form-name').value.trim(),
        code:   document.getElementById('project-form-code').value.trim(),
        date:   document.getElementById('project-form-date').value,
        status: document.getElementById('project-form-status').value
    };

    if (state.db) {
        await cloudSave('projects', id || null, data);
        showToast('Obra guardada en la nube.', 'success');
    } else {
        if (id) {
            const idx = localData.projects.findIndex(p => p.id === id);
            localData.projects[idx] = { id, ...data };
        } else {
            const newId = 'proj-' + Date.now();
            localData.projects.push({ id: newId, ...data });
            if (!state.activeProjectId) state.activeProjectId = newId;
        }
        saveLocalData();
        showToast('Obra guardada localmente.', 'success');
        refresh();
    }
    closeProjectModal();
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

export async function deleteProject(id) {
    if (!ROLE_PERMISSIONS[state.currentRole].allowDelete) {
        showToast('Su rol no permite eliminar información.', 'error');
        return;
    }
    if (!confirm('¿Está seguro de eliminar este proyecto y todo su historial?')) return;

    if (state.db) {
        await cloudDelete('projects', id);
        showToast('Obra eliminada de la nube.', 'success');
    } else {
        localData.projects  = localData.projects.filter(p  => p.id !== id);
        localData.incomes   = localData.incomes.filter(i   => i.projectId !== id);
        localData.expenses  = localData.expenses.filter(e  => e.projectId !== id);
        if (state.activeProjectId === id) {
            state.activeProjectId = localData.projects[0]?.id || '';
        }
        saveLocalData();
        showToast('Obra e historial eliminados.', 'success');
        refresh();
    }
}
