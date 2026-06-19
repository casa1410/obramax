// ─────────────────────────────────────────────────────────────────────────────
// INGRESOS — CRUD de ingresos de obra
// ─────────────────────────────────────────────────────────────────────────────

import { state, localData, ROLE_PERMISSIONS, saveLocalData } from './state.js';
import { formatCurrency, getRawNumericValue, todayISO }       from './utils.js';
import { showToast }                                          from './ui.js';
import { cloudSave, cloudDelete }                             from './firebase.js';

function refresh() { document.dispatchEvent(new Event('app:refresh')); }

// ── Listado con filtros ───────────────────────────────────────────────────────

export function loadIncomesList() {
    const tbody      = document.getElementById('incomes-tbody');
    const startDate  = document.getElementById('income-filter-start').value;
    const endDate    = document.getElementById('income-filter-end').value;
    const searchText = document.getElementById('income-filter-source').value.toLowerCase().trim();

    let list = localData.incomes.filter(i => i.projectId === state.activeProjectId);
    if (startDate)   list = list.filter(i => i.date >= startDate);
    if (endDate)     list = list.filter(i => i.date <= endDate);
    if (searchText)  list = list.filter(i => i.source.toLowerCase().includes(searchText));
    list.sort((a, b) => b.date.localeCompare(a.date));

    document.getElementById('income-pagination-info').innerText = `Mostrando ${list.length} ingresos registrados`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-slate-400 text-xs">No se encontraron ingresos con los filtros aplicados.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(i => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="py-3 px-6 font-mono text-xs text-slate-500">${i.date}</td>
            <td class="py-3 px-6 font-semibold text-slate-900">${i.source}</td>
            <td class="py-3 px-6 text-slate-500 text-xs truncate max-w-xs">${i.obs || '-'}</td>
            <td class="py-3 px-6 text-right font-bold text-emerald-600">${formatCurrency(i.val)}</td>
            <td class="py-3 px-6 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="openIncomeModal('${i.id}')" class="text-xs text-slate-500 hover:text-slate-900 p-1" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteIncome('${i.id}')" class="text-xs text-rose-500 hover:text-rose-700 p-1" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function openIncomeModal(id = '') {
    if (!state.activeProjectId) {
        showToast('Seleccione una obra primero.', 'error');
        return;
    }
    document.getElementById('modal-income').classList.remove('hidden');

    if (id) {
        const i = localData.incomes.find(i => i.id === id);
        document.getElementById('income-modal-title').innerText = 'Editar Ingreso de Caja';
        document.getElementById('income-form-id').value         = i.id;
        document.getElementById('income-form-date').value       = i.date;
        document.getElementById('income-form-source').value     = i.source;
        document.getElementById('income-form-value').value      = new Intl.NumberFormat('es-CO').format(i.val);
        document.getElementById('income-form-obs').value        = i.obs || '';
    } else {
        document.getElementById('income-modal-title').innerText = 'Registrar Ingreso de Caja';
        document.getElementById('income-form-id').value         = '';
        document.getElementById('income-form-date').value       = todayISO();
        document.getElementById('income-form-source').value     = '';
        document.getElementById('income-form-value').value      = '';
        document.getElementById('income-form-obs').value        = '';
    }
}

export function closeIncomeModal() {
    document.getElementById('modal-income').classList.add('hidden');
}

// ── Guardar ───────────────────────────────────────────────────────────────────

export async function saveIncomeForm(e) {
    e.preventDefault();
    if (!ROLE_PERMISSIONS[state.currentRole].allowWrite) {
        showToast('Su rol no permite modificar información.', 'error');
        return;
    }

    const id  = document.getElementById('income-form-id').value;
    const val = getRawNumericValue(document.getElementById('income-form-value').value);
    if (val <= 0) { showToast('El monto debe ser mayor a cero.', 'error'); return; }

    const data = {
        projectId: state.activeProjectId,
        date:      document.getElementById('income-form-date').value,
        source:    document.getElementById('income-form-source').value.trim(),
        val,
        obs:       document.getElementById('income-form-obs').value.trim()
    };

    if (state.db) {
        await cloudSave('incomes', id || null, data);
        showToast('Ingreso guardado en la nube.', 'success');
    } else {
        if (id) {
            const idx = localData.incomes.findIndex(i => i.id === id);
            localData.incomes[idx] = { id, ...data };
        } else {
            localData.incomes.push({ id: 'inc-' + Date.now(), ...data });
        }
        saveLocalData();
        showToast('Ingreso guardado localmente.', 'success');
        refresh();
    }
    closeIncomeModal();
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

export async function deleteIncome(id) {
    if (!ROLE_PERMISSIONS[state.currentRole].allowDelete) {
        showToast('Su rol no permite eliminar información.', 'error');
        return;
    }
    if (!confirm('¿Seguro de eliminar este ingreso?')) return;

    if (state.db) {
        await cloudDelete('incomes', id);
        showToast('Ingreso eliminado.', 'success');
    } else {
        localData.incomes = localData.incomes.filter(i => i.id !== id);
        saveLocalData();
        showToast('Ingreso eliminado.', 'success');
        refresh();
    }
}

export function resetIncomeFilters() {
    document.getElementById('income-filter-start').value  = '';
    document.getElementById('income-filter-end').value    = '';
    document.getElementById('income-filter-source').value = '';
    loadIncomesList();
}
